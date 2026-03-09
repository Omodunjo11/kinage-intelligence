import fs from "fs";
import path from "path";

export async function getArticlesData() {
  try {
    const filePath = path.join(
      process.cwd(),
      "..",
      "Kinage-AL-",
      "outputs",
      "ranked_chunks.json"
    );
    const fileData = await fs.promises.readFile(filePath, "utf-8");
    const articles = JSON.parse(fileData);

    return articles;
  } catch (error) {
    console.error("Failed to load ranked_chunks.json:", error);
    throw new Error("Could not load ranked_chunks.json");
  }
}
