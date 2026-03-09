import { NextResponse } from "next/server";
import { getArticlesData } from "@/lib/articles";

export async function GET() {
  try {
    const data = await getArticlesData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Could not load ranked_chunks.json" },
      { status: 500 }
    );
  }
}
