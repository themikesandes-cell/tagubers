import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import fileUpload, { UploadedFile } from 'express-fileupload';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from './db';
import { auth, adminOnly, loadCurrentUser, signToken } from './auth';

type DespesaRecord = Prisma.DespesaGetPayload<{}>;

const app = express();
const port = Number(process.env.PORT || 4000);
const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
const profileDir = path.resolve(process.env.PROFILE_DIR || './profiles');
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(profileDir, { recursive: true });

function paramString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

// Railway/TypeScript: keep CORS origin as a single string (or allow all when unset).
const corsOrigin = process.env.CORS_ORIGIN?.trim() || true;
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '2mb' }));
app.use(fileUpload({
  limits: { fileSize: 8 * 1024 * 1024 },
  abortOnLimit: true,
  createParentPath: true
}));

app.use('/profiles', express.static(profileDir));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'backend' }));

app.post('/api/auth/login', async (req, res) => {
  const parsed = z.object({ email: z.string().email(), senha: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !user.ativo || !(await bcrypt.compare(parsed.data.senha, user.senhaHash))) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  }
  const token = signToken({ id: user.id, nome: user.nome, email: user.email, perfil: user.perfil });
  res.json({ token, user: { id: user.id, nome: user.nome, email: user.email, cargo: user.cargo, perfil: user.perfil, fotoUrl: user.fotoUrl } });
});

app.post('/api/auth/change-password', auth, loadCurrentUser, async (req, res) => {
  const parsed = z.object({ senhaAtual: z.string().min(1), novaSenha: z.string().min(8) }).safeParse(req.body);
  if (!parsed.success || !req.user) return res.status(400).json({ error: 'Dados inválidos.' });
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || !(await bcrypt.compare(parsed.data.senhaAtual, user.senhaHash))) return res.status(400).json({ error: 'Senha atual incorreta.' });
  const senhaHash = await bcrypt.hash(parsed.data.novaSenha, 12);
  await prisma.user.update({ where: { id: user.id }, data: { senhaHash } });
  res.json({ ok: true });
});

app.get('/api/me', auth, loadCurrentUser, async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, nome: true, email: true, cargo: true, perfil: true, fotoUrl: true, ativo: true } });
  res.json(u);
});

app.post('/api/me/profile', auth, loadCurrentUser, async (req, res) => {
  const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : undefined;
  let fotoUrl: string | undefined;
  const file = req.files?.foto as UploadedFile | undefined;
  if (file) {
    const ext = path.extname(file.name).toLowerCase() || '.jpg';
    const filename = `${crypto.randomUUID()}${ext}`;
    await file.mv(path.join(profileDir, filename));
    fotoUrl = `/profiles/${filename}`;
  }
  const data: any = {};
  if (nome) data.nome = nome;
  if (fotoUrl) data.fotoUrl = fotoUrl;
  const u = await prisma.user.update({ where: { id: req.user!.id }, data, select: { id: true, nome: true, email: true, cargo: true, perfil: true, fotoUrl: true } });
  res.json(u);
});

app.get('/api/clientes', auth, loadCurrentUser, async (_req, res) => {
  const clientes = await prisma.cliente.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } });
  res.json(clientes);
});

app.post('/api/clientes', auth, adminOnly, async (req, res) => {
  const parsed = z.object({ nome: z.string().min(1), codigo: z.string().optional(), observacao: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Nome obrigatório.' });
  res.status(201).json(await prisma.cliente.create({ data: parsed.data }));
});

app.put('/api/clientes/:id', auth, adminOnly, async (req, res) => {
  const parsed = z.object({ nome: z.string().min(1), codigo: z.string().optional(), observacao: z.string().optional(), ativo: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  res.json(await prisma.cliente.update({ where: { id: paramString(req.params.id) }, data: parsed.data }));
});

app.get('/api/admin/users', auth, adminOnly, async (_req, res) => {
  res.json(await prisma.user.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true, email: true, cargo: true, perfil: true, fotoUrl: true, ativo: true, createdAt: true } }));
});

app.post('/api/admin/users', auth, adminOnly, async (req, res) => {
  const parsed = z.object({ nome: z.string().min(1), email: z.string().email(), cargo: z.string().optional(), perfil: z.enum(['ADMIN', 'COLABORADOR']).default('COLABORADOR'), senha: z.string().min(8) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos. A senha deve ter pelo menos 8 caracteres.' });
  try {
    const senhaHash = await bcrypt.hash(parsed.data.senha, 12);
    const user = await prisma.user.create({ data: { nome: parsed.data.nome, email: parsed.data.email.toLowerCase(), cargo: parsed.data.cargo, perfil: parsed.data.perfil, senhaHash }, select: { id: true, nome: true, email: true, cargo: true, perfil: true, ativo: true } });
    res.status(201).json(user);
  } catch { res.status(409).json({ error: 'E-mail já cadastrado.' }); }
});

app.put('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  const parsed = z.object({ nome: z.string().min(1).optional(), cargo: z.string().optional(), perfil: z.enum(['ADMIN', 'COLABORADOR']).optional(), ativo: z.boolean().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  res.json(await prisma.user.update({ where: { id: paramString(req.params.id) }, data: parsed.data, select: { id: true, nome: true, email: true, cargo: true, perfil: true, ativo: true } }));
});

app.get('/api/visitas', auth, loadCurrentUser, async (req, res) => {
  const where: any = req.user!.perfil === 'ADMIN' ? {} : { colaboradorId: req.user!.id };
  if (req.query.status) where.status = String(req.query.status).toUpperCase();
  if (req.query.clienteId) where.clienteId = String(req.query.clienteId);
  const visitas = await prisma.visita.findMany({ where, include: { cliente: true, colaborador: { select: { id: true, nome: true, fotoUrl: true } }, despesas: true }, orderBy: { dataVisita: 'desc' } });
  res.json(visitas.map(v => ({ ...v, total: Number(v.total), despesas: v.despesas.map((d: DespesaRecord) => ({ ...d, valor: Number(d.valor) })) })));
});

app.post('/api/visitas', auth, loadCurrentUser, async (req, res) => {
  const parsed = z.object({ clienteId: z.string().min(1), dataVisita: z.string(), observacao: z.string().optional(), despesas: z.array(z.object({ tipo: z.enum(['IDA','VOLTA','OUTRO']), valor: z.number().positive(), categoria: z.string().default('Uber') })).min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Preencha cliente, data e pelo menos uma despesa.' });
  const visit = await prisma.visita.create({ data: { colaboradorId: req.user!.id, clienteId: parsed.data.clienteId, dataVisita: new Date(parsed.data.dataVisita), observacao: parsed.data.observacao, despesas: { create: parsed.data.despesas.map(d => ({ tipo: d.tipo, categoria: d.categoria, valor: d.valor })) } }, include: { despesas: true, cliente: true } });
  const total = visit.despesas.reduce((s, d) => s + Number(d.valor), 0);
  const updated = await prisma.visita.update({ where: { id: visit.id }, data: { total }, include: { despesas: true, cliente: true } });
  res.status(201).json({ ...updated, total: Number(updated.total), despesas: updated.despesas.map(d => ({ ...d, valor: Number(d.valor) })) });
});

async function uploadReceipt(req: express.Request, res: express.Response, visitaId: string, tipo: 'IDA' | 'VOLTA') {
  const visit = await prisma.visita.findUnique({ where: { id: visitaId }, include: { despesas: true } });
  if (!visit) return res.status(404).json({ error: 'Visita não encontrada.' });
  if (req.user!.perfil !== 'ADMIN' && visit.colaboradorId !== req.user!.id) return res.status(403).json({ error: 'Sem permissão.' });
  if (visit.status !== 'RASCUNHO' && req.user!.perfil !== 'ADMIN') return res.status(400).json({ error: 'A prestação não está disponível para edição.' });
  const file = req.files?.comprovante as UploadedFile | undefined;
  if (!file) return res.status(400).json({ error: 'Comprovante obrigatório.' });
  const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowed.includes(file.mimetype)) return res.status(400).json({ error: 'Arquivo permitido: JPG, PNG ou PDF.' });
  const ext = path.extname(file.name).toLowerCase() || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
  const filename = `${crypto.randomUUID()}${ext}`;
  await file.mv(path.join(uploadDir, filename));
  const expense = visit.despesas.find((d: DespesaRecord) => d.tipo === tipo) || await prisma.despesa.create({ data: { visitaId, tipo, categoria: 'Uber', valor: 0 } });
  const updated = await prisma.despesa.update({ where: { id: expense.id }, data: { comprovanteUrl: `/files/${filename}` } });
  res.json(updated);
}

app.post('/api/visitas/:id/comprovante/:tipo', auth, loadCurrentUser, async (req, res) => {
  const tipo = String(paramString(req.params.tipo)).toUpperCase();
  if (!['IDA','VOLTA'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido.' });
  return uploadReceipt(req, res, paramString(req.params.id), tipo as 'IDA'|'VOLTA');
});

app.post('/api/visitas/:id/submit', auth, loadCurrentUser, async (req, res) => {
  const v = await prisma.visita.findUnique({ where: { id: paramString(req.params.id) }, include: { despesas: true } });
  if (!v || (req.user!.perfil !== 'ADMIN' && v.colaboradorId !== req.user!.id)) return res.status(404).json({ error: 'Visita não encontrada.' });
  if (v.status !== 'RASCUNHO' && v.status !== 'REPROVADO') return res.status(400).json({ error: 'Esta visita não pode ser enviada agora.' });
  const ida = v.despesas.find((d: DespesaRecord) => d.tipo === 'IDA');
  const volta = v.despesas.find((d: DespesaRecord) => d.tipo === 'VOLTA');
  if (!ida || !volta || Number(ida.valor) <= 0 || Number(volta.valor) <= 0 || !ida.comprovanteUrl || !volta.comprovanteUrl) {
    return res.status(400).json({ error: 'É necessário informar ida e volta com valores e comprovantes.' });
  }
  const total = v.despesas.reduce((sum: number, d: DespesaRecord) => sum + Number(d.valor), 0);
  const updated = await prisma.visita.update({ where: { id: v.id }, data: { total, status: 'AGUARDANDO', enviadoEm: new Date(), motivoReprovacao: null } });
  res.json(updated);
});

app.get('/api/files/:filename', auth, loadCurrentUser, async (req, res) => {
  const filename = path.basename(paramString(req.params.filename));
  const filePath = path.join(uploadDir, filename);
  const expense = await prisma.despesa.findFirst({ where: { comprovanteUrl: `/files/${filename}` }, include: { visita: true } });
  if (!expense) return res.status(404).json({ error: 'Arquivo não encontrado.' });
  if (req.user!.perfil !== 'ADMIN' && expense.visita.colaboradorId !== req.user!.id) return res.status(403).json({ error: 'Sem permissão.' });
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Arquivo não encontrado.' });
  return res.sendFile(filePath);
});

app.get('/api/visitas/:id', auth, loadCurrentUser, async (req, res) => {
  const v = await prisma.visita.findUnique({ where: { id: paramString(req.params.id) }, include: { cliente: true, colaborador: { select: { id: true, nome: true, email: true, cargo: true, fotoUrl: true } }, despesas: true, aprovadoPor: { select: { nome: true } } } });
  if (!v) return res.status(404).json({ error: 'Visita não encontrada.' });
  if (req.user!.perfil !== 'ADMIN' && v.colaboradorId !== req.user!.id) return res.status(403).json({ error: 'Sem permissão.' });
  res.json({ ...v, total: Number(v.total), despesas: v.despesas.map((d: DespesaRecord) => ({ ...d, valor: Number(d.valor) })) });
});

app.post('/api/visitas/:id/approve', auth, adminOnly, async (req, res) => {
  const v = await prisma.visita.update({ where: { id: paramString(req.params.id) }, data: { status: 'APROVADO', aprovadoEm: new Date(), aprovadoPorId: req.user!.id, motivoReprovacao: null } });
  res.json(v);
});

app.post('/api/visitas/:id/reject', auth, adminOnly, async (req, res) => {
  const parsed = z.object({ motivo: z.string().min(3) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Informe o motivo.' });
  const v = await prisma.visita.update({ where: { id: paramString(req.params.id) }, data: { status: 'REPROVADO', motivoReprovacao: parsed.data.motivo, aprovadoEm: null, aprovadoPorId: null } });
  res.json(v);
});

app.post('/api/visitas/:id/resubmit', auth, loadCurrentUser, async (req, res) => {
  const v = await prisma.visita.findUnique({ where: { id: paramString(req.params.id) } });
  if (!v || v.colaboradorId !== req.user!.id) return res.status(404).json({ error: 'Visita não encontrada.' });
  if (v.status !== 'REPROVADO') return res.status(400).json({ error: 'Somente prestações reprovadas podem ser reenviadas.' });
  await prisma.visita.update({ where: { id: v.id }, data: { status: 'AGUARDANDO', motivoReprovacao: null, enviadoEm: new Date() } });
  res.json({ ok: true });
});

app.get('/api/admin/dashboard', auth, adminOnly, async (_req, res) => {
  const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
  const [visitas, pending, approved, rejected] = await Promise.all([
    prisma.visita.findMany({ where: { dataVisita: { gte: start } }, select: { total: true } }),
    prisma.visita.count({ where: { status: 'AGUARDANDO' } }),
    prisma.visita.count({ where: { status: 'APROVADO' } }),
    prisma.visita.count({ where: { status: 'REPROVADO' } })
  ]);
  const total = visitas.reduce((s, v) => s + Number(v.total), 0);
  res.json({ visitasMes: visitas.length, totalGastos: total, pendentes: pending, aprovadas: approved, reprovadas: rejected });
});

app.get('/api/admin/relatorio', auth, adminOnly, async (req, res) => {
  const inicio = req.query.inicio ? new Date(String(req.query.inicio)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const fim = req.query.fim ? new Date(String(req.query.fim)) : new Date(); fim.setHours(23,59,59,999);
  const visitas = await prisma.visita.findMany({ where: { dataVisita: { gte: inicio, lte: fim } }, include: { cliente: true, colaborador: { select: { nome: true } }, despesas: true }, orderBy: { dataVisita: 'desc' } });
  const rows = visitas.map(v => ({ data: v.dataVisita.toISOString().slice(0,10), colaborador: v.colaborador.nome, cliente: v.cliente.nome, total: Number(v.total), status: v.status, ida: v.despesas.filter((d: DespesaRecord) => d.tipo === 'IDA').reduce((sum: number, d: DespesaRecord) => sum + Number(d.valor), 0), volta: v.despesas.filter((d: DespesaRecord) => d.tipo === 'VOLTA').reduce((sum: number, d: DespesaRecord) => sum + Number(d.valor), 0) }));
  res.json(rows);
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

async function bootstrap() {
  const email = (process.env.ADMIN_EMAIL || 'admin@empresa.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const senhaHash = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { nome: 'Administrador', email, senhaHash, perfil: 'ADMIN', ativo: true } });
    console.log(`Admin inicial criado: ${email}`);
  }
  app.listen(port, () => console.log(`API rodando na porta ${port}`));
}

bootstrap().catch(err => { console.error(err); process.exit(1); });
