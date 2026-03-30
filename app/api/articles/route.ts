import { NextResponse } from "next/server";
import { getNormalizedArticles } from "@/lib/articles";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeRejected = searchParams.get("mode") === "all";
    const data = await getNormalizedArticles({ includeRejected });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Could not load ranked_chunks.json" },
      { status: 500 }
    );
  }
}
