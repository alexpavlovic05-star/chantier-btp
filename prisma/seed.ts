import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@chantier.app" },
    update: {},
    create: {
      email: "admin@chantier.app",
      name: "Admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("✅ Admin créé: admin@chantier.app / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
