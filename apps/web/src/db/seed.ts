import { faker } from "@faker-js/faker";
import { loadLocalEnv } from "./load-env";

loadLocalEnv();

const { db } = await import("./index");
const { moderators, reports } = await import("./schema");

// Deterministic: Step 10 measures the same dataset every run, so the
// performance curve is comparable across machines and across commits.
faker.seed(42);

const ROW_COUNT = Number(process.env.SEED_ROWS ?? 50_000);
const MODERATOR_COUNT = 12;
const CHUNK = 500; // Neon HTTP caps request size; 500 rows/request is safe.

const CATEGORIES = [
  "spam",
  "harassment",
  "nudity",
  "violence",
  "misinformation",
  "copyright",
] as const;
const SEVERITIES = ["low", "medium", "high", "critical"] as const;
const STATUSES = ["pending", "reviewing", "resolved", "dismissed"] as const;

async function main() {
  console.log(`Seeding ${ROW_COUNT.toLocaleString()} reports...`);

  await db.delete(reports);
  await db.delete(moderators);

  const moderatorRows = Array.from({ length: MODERATOR_COUNT }, () => {
    const name = faker.person.fullName();
    return {
      name,
      email: faker.internet.email({ firstName: name.split(" ")[0] }),
      avatarUrl: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(name)}`,
    };
  });

  const insertedModerators = await db
    .insert(moderators)
    .values(moderatorRows)
    .returning({ id: moderators.id });
  console.log(`  ${insertedModerators.length} moderators`);

  for (let offset = 0; offset < ROW_COUNT; offset += CHUNK) {
    const size = Math.min(CHUNK, ROW_COUNT - offset);
    const batch = Array.from({ length: size }, (_, i) => {
      const n = offset + i;
      const status = faker.helpers.arrayElement(STATUSES);
      return {
        reference: `RPT-${String(n + 1).padStart(6, "0")}`,
        reporterName: faker.person.fullName(),
        reporterAvatarUrl: `https://api.dicebear.com/9.x/thumbs/svg?seed=r${n}`,
        contentThumbnailUrl: `https://picsum.photos/seed/${n}/64/64`,
        contentExcerpt: faker.lorem.sentence({ min: 6, max: 24 }),
        category: faker.helpers.arrayElement(CATEGORIES),
        severity: faker.helpers.arrayElement(SEVERITIES),
        status,
        // Unassigned reports are a real state the queue must render.
        assigneeId:
          status === "pending"
            ? null
            : faker.helpers.arrayElement(insertedModerators).id,
        reportCount: faker.number.int({ min: 1, max: 47 }),
        reportedAt: faker.date.recent({ days: 90 }),
      };
    });

    await db.insert(reports).values(batch);
    process.stdout.write(
      `\r  ${Math.min(offset + size, ROW_COUNT).toLocaleString()} / ${ROW_COUNT.toLocaleString()} reports`,
    );
  }

  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
