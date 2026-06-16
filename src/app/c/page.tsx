import type { Metadata } from "next";
import SharedCohesionView from "@/components/palette/SharedCohesionView";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const encoded = typeof params.r === "string" ? params.r : "";
  let name = "Brand Cohesion Report";
  let overall: number | null = null;
  if (encoded) {
    try {
      const payload = JSON.parse(decodeURIComponent(Buffer.from(encoded, "base64").toString("utf-8")));
      if (payload.name) name = `${payload.name} — Cohesion Report`;
      if (typeof payload.overall === "number") overall = payload.overall;
    } catch {
      // ignore
    }
  }
  return {
    title: `${name} — Palette`,
    description: overall !== null
      ? `This collection scored ${overall}/100 for brand cohesion in Palette — color intelligence for creators.`
      : "A brand cohesion report from Palette — color intelligence for creators.",
  };
}

export default async function CohesionReportPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const encoded = typeof params.r === "string" ? params.r : "";

  if (!encoded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] text-[var(--foreground)]">
        <div className="text-center">
          <p className="text-[var(--muted)] mb-4">No cohesion report found in this link.</p>
          <a href="/" className="text-sm underline underline-offset-2 hover:text-[var(--foreground)] transition-colors text-[var(--muted)]">
            Go to Palette →
          </a>
        </div>
      </div>
    );
  }

  return <SharedCohesionView encoded={encoded} />;
}
