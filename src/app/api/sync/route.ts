import { NextResponse } from "next/server";
import { runTrelloSync } from "@/lib/trello";

export async function POST() {
  try {
    const result = await runTrelloSync();
    return NextResponse.json({
      message: `${result.new} new, ${result.updated} updated`,
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 }
    );
  }
}
