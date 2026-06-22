import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "No API key configured" }, { status: 500 });
  }

  let colors: string[];
  try {
    const body = await request.json();
    colors = body.colors;
    if (!Array.isArray(colors) || colors.length === 0) {
      return NextResponse.json({ error: "Invalid colors" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const colorList = colors.join(", ");

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 128,
    messages: [
      {
        role: "user",
        content: `You name color palettes for a print-on-demand artist tool.

Palette colors: ${colorList}

Suggest exactly 3 short, evocative names. Each name should be 1–4 words, evoking a mood, season, place, or aesthetic (e.g. "Faded Polaroid", "Dusk & Copper", "Nordic Frost"). Be poetic and distinct.

Reply with ONLY the 3 names, one per line, no numbering, no punctuation at the end.`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const names = raw
    .trim()
    .split("\n")
    .map((n) => n.trim().replace(/^\d+[\.\)]\s*/, ""))
    .filter((n) => n.length > 0)
    .slice(0, 3);

  return NextResponse.json({ names });
}
