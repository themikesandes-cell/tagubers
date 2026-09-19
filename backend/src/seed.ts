import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@empresa.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const senhaHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { nome: 'Administrador', perfil: 'ADMIN', senhaHash, ativo: true },
    create: { nome: 'Administrador', email, perfil: 'ADMIN', senhaHash, ativo: true }
  });
  const count = await prisma.cliente.count();
  if (!count) {
    await prisma.cliente.createMany({ data: [
      { nome: 'Cliente exemplo', codigo: 'CLI001' },
      { nome: 'Outro cliente', codigo: 'CLI002' }
    ] });
  }
  console.log(`Admin pronto: ${email}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
