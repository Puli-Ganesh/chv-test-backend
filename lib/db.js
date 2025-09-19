import { PrismaClient } from "@prisma/client";

const globalKey = "__prisma__";
if (!global[globalKey]) {
  global[globalKey] = new PrismaClient({
    log: ["error"]
  });
}
export const prisma = global[globalKey];
