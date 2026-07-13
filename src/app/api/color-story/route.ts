import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getColorNameSuggestions } from "@/lib/utils";

const client = new Anthropic();

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "No API key configured" }, { status: 500 });
  }

  let colors: string[];
  let name: string;
  try {
    const body = await request.json();
    colors = body.colors;
    name = body.name ?? "Untitled";
    if (!Array.isArray(colors) || colors.length === 0) {
      return NextResponse.json({ error: "Invalid colors" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Enrich each hex with its closest designer color name
  const colorDescriptions = colors
    .map((hex) => {
      const closest = getColorNameSuggestions(hex, 1)[0] ?? "";
      return closest ? `${hex} (${closest})` : hex;
    })
    .join(", ");

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 320,
    messages: [
      {
        role: "user",
        content: `You help a print-on-demand artist understand her color palettes for creating AI art and products.

Palette: "${name}"
Colors: ${colorDescriptions}

Write a short color story in exactly 3 parts:
1. "vibe" (1–2 sentences): the mood and feeling this palette evokes — be poetic and specific, mention the palette's character
2. "products" (exactly 3 items, short phrases): product categories where this palette would sell well (e.g. "botanical wall art", "beach accessories", "cozy home decor")
3. "prompt" (15–25 words): a Midjourney/Stable Diffusion style modifier capturing this palette's essence — just descriptive color/texture/mood words, no brand names

Reply ONLY with valid JSON, no extra text:
{"vibe": "...", "products": ["...", "...", "..."], "prompt": "..."}`,
      },
    ],
  });

  const raw =
    message.content[0].type === "text" ? message.content[0].text.trim() : "{}";

  // Extract JSON even if Claude wraps it in markdown code fences
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      vibe?: string;
      products?: string[];
      prompt?: string;
    };
    if (!parsed.vibe || !Array.isArray(parsed.products) || !parsed.prompt) {
      return NextResponse.json({ error: "Incomplete AI response" }, { status: 500 });
    }
    return NextResponse.json({
      vibe: parsed.vibe,
      products: parsed.products.slice(0, 3),
      prompt: parsed.prompt,
    });
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }
}
