import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const username = "admin";
  const password = "1234";
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log("admin already exists");
    return;
    }

  await prisma.user.create({
    data: { username, passwordHash, role: "admin" }
  });

  console.log("admin seeded");
}

main().finally(async () => prisma.$disconnect());
