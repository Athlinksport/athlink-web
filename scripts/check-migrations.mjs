import { readdir } from "node:fs/promises";
const files = (await readdir("supabase/migrations")).filter((name) => name.endsWith(".sql")).sort();
const invalid = files.filter((name) => !/^\d{14}_[a-z0-9_]+\.sql$/.test(name));
const timestamps = files.map((name) => name.slice(0, 14));
const duplicates = timestamps.filter((value, index) => timestamps.indexOf(value) !== index);
if (invalid.length || duplicates.length) {
  console.error("Invalid migration history", { invalid, duplicates: [...new Set(duplicates)] });
  process.exit(1);
}
console.log(`Migration history is ordered and uniquely named (${files.length} files).`);
