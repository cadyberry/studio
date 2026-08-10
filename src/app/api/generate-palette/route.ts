import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "No API key configured" }, { status: 500 });
  }

  let prompt: string;
  try {
    const body = await request.json();
    prompt = body.prompt;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
    }
    if (prompt.length > 500) {
      return NextResponse.json({ error: "Prompt too long" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `You are a color palette designer for a print-on-demand artist tool.

Create a 6-color palette inspired by: "${prompt.trim()}"

Requirements:
- Colors should work well together and reflect the mood/theme described
- Include a range of values (light to dark) for practical usability
- Colors should be printable (not neon/overexposed)
- Name the palette evocatively (1–4 words)

Reply with ONLY this exact JSON format, no other text:
{
  "name": "Palette Name",
  "mood": "one short phrase describing the vibe",
  "colors": ["#rrggbb", "#rrggbb", "#rrggbb", "#rrggbb", "#rrggbb", "#rrggbb"]
}`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";

  let parsed: { name: string; mood: string; colors: string[] };
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    parsed = JSON.parse(jsonMatch[0]);
    if (
      typeof parsed.name !== "string" ||
      !Array.isArray(parsed.colors) ||
      parsed.colors.length < 3
    ) {
      throw new Error("Invalid structure");
    }
    // Validate and normalize hex colors
    parsed.colors = parsed.colors
      .map((c: string) => {
        const match = c.match(/^#?([0-9a-fA-F]{6})$/);
        return match ? `#${match[1].toLowerCase()}` : null;
      })
      .filter(Boolean) as string[];
    if (parsed.colors.length < 3) throw new Error("Too few valid colors");
  } catch {
    return NextResponse.json({ error: "Failed to parse palette from Claude" }, { status: 500 });
  }

  return NextResponse.json({
    name: parsed.name.trim(),
    mood: (parsed.mood ?? "").trim(),
    colors: parsed.colors.slice(0, 8),
  });
}
