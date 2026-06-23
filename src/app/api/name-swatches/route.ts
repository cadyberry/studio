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

  const colorList = colors.map((hex, i) => `${i + 1}. ${hex}`).join("\n");

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `You name individual paint colors for a designer's palette tool.

Colors to name (in order):
${colorList}

Give each color a short, evocative name — 2–3 words max. Think Pantone names or artist paint names: poetic, specific, tactile. Examples: "Dusty Mauve", "Forest Teal", "Warm Parchment", "Midnight Plum", "Faded Coral", "Sage Mist".

Reply with ONLY the names, one per line, in the same order as the input. No numbering, no punctuation, no extra text.`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const names = raw
    .trim()
    .split("\n")
    .map((n) => n.trim().replace(/^\d+[\.\)]\s*/, ""))
    .filter((n) => n.length > 0)
    .slice(0, colors.length);

  return NextResponse.json({ names });
}
