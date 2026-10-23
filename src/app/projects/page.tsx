import type { Metadata } from "next";
import Projects from "@/views/Projects";
import { fmt, STATS } from "@/lib/siteStats";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = { title: "Projects", description: `${fmt(STATS.archive)} mentored open-source projects across GSoC, LFX, Outreachy, Hacktoberfest and Nexus Spring of Code, filterable by year, org and tech.`, alternates: { canonical: canonical("/projects") } };

export default function Page() {
  return <Projects />;
}
