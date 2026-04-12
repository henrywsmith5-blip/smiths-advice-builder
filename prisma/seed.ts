import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Seed users
  const users = [
    {
      email: process.env.SEED_USER_1_EMAIL || "henry@smiths.net.nz",
      password: process.env.SEED_USER_1_PASSWORD || "changeme123",
      adviserName: "Craig Smith",
      adviserEmail: "craig@smiths.net.nz",
      adviserPhone: "0274 293 939",
      adviserFsp: "FSP33042",
    },
    {
      email: process.env.SEED_USER_2_EMAIL || "craig@smiths.net.nz",
      password: process.env.SEED_USER_2_PASSWORD || "changeme123",
      adviserName: "Craig Smith",
      adviserEmail: "craig@smiths.net.nz",
      adviserPhone: "0274 293 939",
      adviserFsp: "FSP33042",
    },
    {
      email: "guy@smiths.net.nz",
      password: "GUY12345",
      adviserName: "Guy Gilbert",
      adviserEmail: "guy@smiths.net.nz",
      adviserPhone: "0274 293 939",
      adviserFsp: "FSP773652",
    },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash: hash,
        adviserName: u.adviserName,
        adviserEmail: u.adviserEmail,
        adviserPhone: u.adviserPhone,
        adviserFsp: u.adviserFsp,
      },
      create: {
        email: u.email,
        passwordHash: hash,
        adviserName: u.adviserName,
        adviserEmail: u.adviserEmail,
        adviserPhone: u.adviserPhone,
        adviserFsp: u.adviserFsp,
      },
    });
    console.log(`  Seeded user: ${u.email} (adviser: ${u.adviserName})`);
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
