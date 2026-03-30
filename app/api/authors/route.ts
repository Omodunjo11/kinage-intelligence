import { NextResponse } from "next/server";

import { getAuthorActivity } from "@/lib/articles";

export async function GET() {
  try {
    const data = await getAuthorActivity();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Could not compute author activity" },
      { status: 500 }
    );
  }
}
