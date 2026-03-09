import path from "path";
import fs from "fs/promises";

export async function getArticlesData() {
  const filePath = path.join(
    process.cwd(),
    "data",
    "ranked_chunks.json"
  );

  const file = await fs.readFile(filePath, "utf-8");

  return JSON.parse(file);
}
