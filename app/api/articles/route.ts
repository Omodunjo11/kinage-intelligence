import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

async function getArticles() {
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

export async function GET() {
  try {
    const data = await getArticles();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Could not load ranked_chunks.json" },
      { status: 500 }
    );
  }
}
