// scripts/seed-admin.mjs
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const username = "admin";
  const password = "1234";

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log("admin already exists");
    return;
  }

  await prisma.user.create({
    data: { username, passwordHash: password, role: "admin" }
  });

  console.log("admin seeded (plaintext)");
}

main().finally(async () => prisma.$disconnect());
