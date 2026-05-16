import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import { createHmac } from "node:crypto";

process.loadEnvFile(".env");
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const email = process.argv[2] ?? "emp@demo";
  const u = await prisma.user.findUniqueOrThrow({ where: { email } });
  const sig = createHmac("sha256", process.env.AUTH_SECRET!)
    .update(u.id)
    .digest("base64url");
  console.log(`${u.id}.${sig}`);
  await prisma.$disconnect();
}

main();
