import { readFile } from "node:fs/promises";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your local environment.");
const topics = JSON.parse(await readFile(new URL("../src/data/topics.json", import.meta.url), "utf8"));
const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/topics?on_conflict=id`, {
  method: "POST",
  headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
  body: JSON.stringify(topics)
});
if (!response.ok) throw new Error(`Topic seed failed (${response.status}): ${await response.text()}`);
console.log(`Uploaded ${topics.length} topics.`);
