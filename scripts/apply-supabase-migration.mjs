import { readFileSync } from "node:fs";

const ref = process.env.SUPABASE_PROJECT_REF ?? "uvyihboqqocpkntltujg";
const token = process.env.SUPABASE_ACCESS_TOKEN;
const file = process.argv[2];
const name = process.argv[3];

if (!token || !file || !name) {
  console.error("Usage: SUPABASE_ACCESS_TOKEN=... node scripts/apply-supabase-migration.mjs <sql-file> <migration-name>");
  process.exit(1);
}

const query = readFileSync(file, "utf8");
const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/migrations`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query, name }),
});

const text = await response.text();
if (!response.ok) {
  console.error(`Migration failed (${response.status}): ${text}`);
  process.exit(1);
}

console.log(`Applied ${name}`);
