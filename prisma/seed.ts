import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Seed users
  const users = [
    {
      email: process.env.SEED_USER_1_EMAIL || "henry@smiths.net.nz",
      password: process.env.SEED_USER_1_PASSWORD || "changeme123",
    },
    {
      email: process.env.SEED_USER_2_EMAIL || "craig@smiths.net.nz",
      password: process.env.SEED_USER_2_PASSWORD || "changeme123",
    },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash },
      create: { email: u.email, passwordHash: hash },
    });
    console.log(`  Seeded user: ${u.email}`);
  }

  // Clear ALL old templates that don't have hasCover set properly
  // (legacy templates from before the 4-template split)
  const deleted = await prisma.template.deleteMany({
    where: {
      OR: [
        { name: { contains: "Default" } },
        { hasCover: null, docType: "SOA" }, // Old SOA templates without hasCover
      ],
    },
  });
  if (deleted.count > 0) {
    console.log(`  Cleared ${deleted.count} legacy templates`);
  }

  console.log("  Templates: using built-in defaults from code (editable via /templates)");
}

main()
  .then(() => {
    console.log("Seed complete.");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
