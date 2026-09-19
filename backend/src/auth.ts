import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { prisma } from './db';

export type AuthUser = { id: string; perfil: 'ADMIN' | 'COLABORADOR'; nome: string; email: string };

declare global { namespace Express { interface Request { user?: AuthUser } } }

const secret = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signToken(user: AuthUser) {
  return jwt.sign(user, secret, { expiresIn: '7d' });
}

export async function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });
  try {
    req.user = jwt.verify(token, secret) as AuthUser;
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
}

export async function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado.' });
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, nome: true, email: true, perfil: true, ativo: true } });
    if (!user || !user.ativo || user.perfil !== 'ADMIN') return res.status(403).json({ error: 'Acesso restrito ao administrador.' });
    req.user = { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil };
    next();
  } catch (err) {
    next(err);
  }
}

export async function loadCurrentUser(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next();
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || !user.ativo) return next(new Error('Usuário inativo ou inexistente.'));
  req.user = { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil };
  next();
}
