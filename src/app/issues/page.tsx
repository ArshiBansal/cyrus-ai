import type { Metadata } from "next";
import IssueFinder from "@/views/IssueFinder";
import { canonical } from "@/lib/seo";
import { CRAWL } from "@/data/crawlStats";
import { fmt } from "@/lib/siteStats";

export const metadata: Metadata = {
  title: "Issue Finder",
  description: `Search ${fmt(CRAWL.issues)} open GitHub issues read from ${fmt(CRAWL.reposWithIssues)} repositories - filter by language, organization, label, beginner-friendly and unassigned.`,
  alternates: { canonical: canonical("/issues") },
};

export default function Page() {
  return <IssueFinder />;
}
