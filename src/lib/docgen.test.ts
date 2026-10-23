/* ══ docgen.test.ts — generated docs never invent a fact ═════════════
   The studio's promise is that a blank field stays visible. These tests
   hold it to that: a placeholder for what is missing, the author's own
   words for what was typed, and license bodies that match their names. ═ */
import { describe, expect, it } from "vitest";
import { conduct, contributing, docsFor, emptyDoc, LICENSES, licenseText, missingFields, readme, type DocInput } from "./docgen";

const filled: DocInput = {
  ...emptyDoc(2026),
  name: "quietlog", repo: "ada/quietlog", blurb: "Prints the five log lines that changed most this week.",
  what: "It reads a folder of logs and ranks the lines by how much they moved.",
  stack: "TypeScript, Node, SQLite", install: "npm i quietlog", use: "npx quietlog ./logs", test: "npm test",
  license: "mit", holder: "Ada Lovelace", contact: "ada@example.com", stability: "Experimental - the format may still change.",
};

describe("missing fields stay missing", () => {
  it("lists every blank the author still owes", () => {
    const gaps = missingFields(emptyDoc(2026));
    expect(gaps).toContain("Project name");
    expect(gaps).toContain("Repository (owner/name)");
    expect(gaps).toContain("Copyright holder");
  });

  it("says nothing is owed once the form is full", () => {
    expect(missingFields(filled)).toEqual([]);
  });

  it("marks a blank as a bracketed prompt instead of filling it in", () => {
    const doc = readme(emptyDoc(2026));
    expect(doc).toContain("[project name]");
    expect(doc).toContain("[one line: what this is, for whom]");
    expect(doc).not.toMatch(/built with react/i);
  });

  it("keeps a public domain dedication out of the copyright holder gap", () => {
    expect(missingFields({ ...emptyDoc(2026), license: "unlicense", name: "x", repo: "a/b", blurb: "y", what: "z", install: "i", test: "t", contact: "c" })).not.toContain("Copyright holder");
  });
});

describe("README", () => {
  const doc = readme(filled);

  it("uses only what the author typed", () => {
    expect(doc).toContain("# quietlog");
    expect(doc).toContain(filled.blurb);
    expect(doc).toContain("npm i quietlog");
    expect(doc).toContain("TypeScript, Node, SQLite");
    expect(doc).toContain("Experimental - the format may still change.");
  });

  it("has the sections a stranger looks for, in order", () => {
    const order = ["# quietlog", "## What it does", "## Install", "## Use it", "## Run the tests", "## Contributing", "## License", "## Links"];
    const at = order.map((h) => doc.indexOf(h));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it("names the license and points at the LICENSE file", () => {
    expect(doc).toContain("MIT");
    expect(doc).toContain("[LICENSE](LICENSE)");
    expect(doc).toContain("Ada Lovelace");
  });

  it("links the repository on the forge the author chose", () => {
    expect(readme({ ...filled, forge: "codeberg.org" })).toContain("https://codeberg.org/ada/quietlog");
  });

  it("drops the license holder line for a public domain release", () => {
    expect(readme({ ...filled, license: "unlicense" })).toContain("public domain");
  });
});

describe("CONTRIBUTING", () => {
  const doc = contributing(filled);

  it("gives clone, branch, test and push as runnable lines", () => {
    for (const line of ["git clone https://github.com/ada/quietlog.git", "git switch -c my-change", "npm test", "git push -u origin my-change"]) {
      expect(doc).toContain(line);
    }
  });

  it("tells a newcomer which label to filter on", () => {
    expect(doc).toContain("`good first issue`");
  });

  it("cross-links the code of conduct", () => {
    expect(doc).toContain("[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)");
  });

  it("does not invent a contact when none was given", () => {
    const bare = contributing({ ...filled, contact: "" });
    expect(bare).not.toContain("ada@example.com");
    expect(bare).toContain("Ask on the issue itself");
  });
});

describe("LICENSE", () => {
  it("carries the holder and year the author named", () => {
    expect(licenseText({ ...filled, license: "mit" })).toContain("Copyright (c) 2026 Ada Lovelace");
    expect(licenseText({ ...filled, license: "bsd-3-clause" })).toContain("Copyright (c) 2026 Ada Lovelace");
  });

  it("prints the permissive texts in full", () => {
    expect(licenseText({ ...filled, license: "mit" })).toContain("Permission is hereby granted, free of charge");
    expect(licenseText({ ...filled, license: "unlicense" })).toContain("public domain");
  });

  it("points at the canonical text instead of truncating a long license", () => {
    const apache = licenseText({ ...filled, license: "apache-2.0" });
    expect(apache).toContain("apache.org/licenses/LICENSE-2.0");
    expect(apache).toContain("this is the standard short notice");
    expect(licenseText({ ...filled, license: "gpl-3.0" })).toContain("gnu.org/licenses/gpl-3.0.txt");
    expect(licenseText({ ...filled, license: "mpl-2.0" })).toContain("mozilla.org/MPL/2.0/");
  });

  it("offers a license for every id the studio can emit", () => {
    for (const l of LICENSES) expect(licenseText({ ...filled, license: l.id }).length).toBeGreaterThan(200);
  });
});

describe("CODE_OF_CONDUCT", () => {
  const doc = conduct(filled);

  it("credits the Contributor Covenant it adapts", () => {
    expect(doc).toContain("contributor-covenant.org/version/2/1");
    expect(doc).toContain("Creative Commons Attribution 4.0");
  });

  it("says how to report and what happens after", () => {
    expect(doc).toContain("## Reporting");
    expect(doc).toContain("## What happens next");
    expect(doc).toContain("ada@example.com");
  });

  it("leaves the reporting address visibly blank", () => {
    expect(conduct({ ...filled, contact: "" })).toContain("[a private address the maintainers can be reached at]");
  });
});

describe("the set the studio hands over", () => {
  it("is the four files, with the names GitHub looks for", () => {
    expect(docsFor(filled).map((d) => d.file)).toEqual(["README.md", "CONTRIBUTING.md", "LICENSE", "CODE_OF_CONDUCT.md"]);
  });

  it("keeps every document non-empty and worth opening", () => {
    for (const d of docsFor(emptyDoc(2026))) {
      expect(d.text.trim().length).toBeGreaterThan(120);
      expect(d.text.split("\n").filter((l) => l.trim()).length).toBeGreaterThan(8);
    }
  });

  it("never claims a fact the form did not give it", () => {
    const bare = docsFor(emptyDoc(2026)).map((d) => d.text).join("\n");
    expect(bare).not.toMatch(/1\.0\.0|production[- ]ready|award[- ]winning/i);
  });
});
