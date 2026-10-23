import type { Metadata } from "next";
import Programs from "@/views/Programs";
import { fmt, STATS } from "@/lib/siteStats";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Programs",
  description: `${STATS.programs} tracked open-source programs - stipends, calendars, eligibility - plus a five-year archive of ${fmt(STATS.archive)} accepted mentored projects.`,
  alternates: { canonical: canonical("/programs") },
};

export default function Page() {
  return <Programs />;
}
