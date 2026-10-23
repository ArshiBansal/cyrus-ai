/* ══ docgen.ts — the four files a repository is judged on ═══════════
   README, CONTRIBUTING, LICENSE and CODE_OF_CONDUCT, generated from what
   the author actually types. Anything they leave out is marked with a
   [bracketed prompt] instead of being invented: a generated README that
   states facts nobody gave us is worse than one with a hole in it.
   Pure functions, so the shape of every document is testable.       ═ */

export type LicenseId = "mit" | "apache-2.0" | "gpl-3.0" | "bsd-3-clause" | "mpl-2.0" | "unlicense";

export const LICENSES: { id: LicenseId; label: string; kind: string; note: string }[] = [
  { id: "mit", label: "MIT", kind: "permissive", note: "Short, permissive, the default choice for most open source." },
  { id: "apache-2.0", label: "Apache 2.0", kind: "permissive + patent", note: "Permissive with an explicit patent grant. Full text lives at apache.org." },
  { id: "bsd-3-clause", label: "BSD 3-Clause", kind: "permissive", note: "Like MIT, plus a clause stopping people endorsing derivatives under your name." },
  { id: "gpl-3.0", label: "GPL 3.0", kind: "copyleft", note: "Derivatives must ship source under the same license. Full text lives at gnu.org." },
  { id: "mpl-2.0", label: "MPL 2.0", kind: "file copyleft", note: "Copyleft per file: changes to your files stay open, new files may not." },
  { id: "unlicense", label: "Public domain", kind: "none", note: "No conditions at all. Irrevocable - think twice." },
];

export interface DocInput {
  name: string;
  repo: string;      /* owner/name on the forge */
  forge: string;     /* github.com by default */
  blurb: string;     /* one line under the title */
  what: string;      /* a few sentences on what it does */
  stack: string;     /* comma separated */
  install: string;
  use: string;
  test: string;
  license: LicenseId;
  holder: string;
  year: number;
  contact: string;
  goodFirst: string; /* label name newcomers should filter on */
  stability: string; /* e.g. "used in production", "experimental" */
}

export const emptyDoc = (year: number): DocInput => ({
  name: "", repo: "", forge: "github.com", blurb: "", what: "", stack: "",
  install: "", use: "", test: "", license: "mit", holder: "", year,
  contact: "", goodFirst: "good first issue", stability: "",
});

/* a hole in the input stays visible as a hole in the document */
const fill = (v: string, prompt: string) => (v.trim() ? v.trim() : `[${prompt}]`);
const has = (v: string) => v.trim().length > 0;

/** what the author still has to type before the file is worth committing */
export function missingFields(i: DocInput): string[] {
  const out: string[] = [];
  if (!has(i.name)) out.push("Project name");
  if (!has(i.repo)) out.push("Repository (owner/name)");
  if (!has(i.blurb)) out.push("One-line description");
  if (!has(i.what)) out.push("What it does");
  if (!has(i.holder) && i.license !== "unlicense") out.push("Copyright holder");
  if (!has(i.install)) out.push("Install command");
  if (!has(i.test)) out.push("Test command");
  if (!has(i.contact)) out.push("Contact for maintainers");
  return out;
}

const repoUrl = (i: DocInput) => `https://${i.forge || "github.com"}/${i.repo || "owner/repo"}`;
const stackList = (i: DocInput) => i.stack.split(",").map((s) => s.trim()).filter(Boolean);

/* ── 1. README ─────────────────────────────────────────────────── */
export function readme(i: DocInput): string {
  const lic = LICENSES.find((l) => l.id === i.license);
  const L: string[] = [];
  L.push(`# ${fill(i.name, "project name")}`);
  L.push("");
  L.push(fill(i.blurb, "one line: what this is, for whom"));
  L.push("");
  if (has(i.stability)) L.push(`> ${i.stability.trim()}`), L.push("");
  L.push("## What it does");
  L.push("");
  L.push(fill(i.what, "two or three honest sentences about the behaviour, not the ambition"));
  L.push("");
  const st = stackList(i);
  if (st.length) {
    L.push(`Built with ${st.slice(0, 6).join(", ")}${st.length > 6 ? `, and ${st.length - 6} more` : ""}.`);
    L.push("");
  }
  L.push("## Install");
  L.push("");
  L.push("```sh");
  L.push(fill(i.install, "the one command that installs it"));
  L.push("```");
  L.push("");
  L.push("## Use it");
  L.push("");
  L.push("```sh");
  L.push(fill(i.use, "the smallest example that actually runs"));
  L.push("```");
  L.push("");
  L.push("## Run the tests");
  L.push("");
  L.push("```sh");
  L.push(fill(i.test, "the command that runs the suite"));
  L.push("```");
  L.push("");
  L.push("## Contributing");
  L.push("");
  L.push(`Start with [CONTRIBUTING.md](CONTRIBUTING.md). Issues labelled \`${i.goodFirst || "good first issue"}\` are the ones we expect a first pull request to come from.`);
  L.push("");
  L.push("## License");
  L.push("");
  L.push(i.license === "unlicense"
    ? `Released into the public domain - see [LICENSE](LICENSE).`
    : `${i.holder.trim() || `[${i.name || "this project"}]`} is licensed under the ${lic?.label ?? i.license}. Full terms in [LICENSE](LICENSE).`);
  L.push("");
  L.push("## Links");
  L.push("");
  L.push(`- Repository: ${repoUrl(i)}`);
  if (has(i.contact)) L.push(`- Maintainer: ${i.contact.trim()}`);
  L.push("");
  return L.join("\n");
}

/* ── 2. CONTRIBUTING ───────────────────────────────────────────── */
export function contributing(i: DocInput): string {
  const url = repoUrl(i);
  const L: string[] = [];
  L.push(`# Contributing to ${fill(i.name, "project name")}`);
  L.push("");
  L.push("Reading this before you open a pull request saves both of us an evening.");
  L.push("");
  L.push("## Before you start");
  L.push("");
  L.push(`1. Check the [issue list](${url}/issues) - somebody may already be on it.`);
  L.push(`2. If the change is more than a typo, open an issue first and describe the problem. Design pulls get closed when the design was never agreed.`);
  L.push("3. Keep a pull request to one concern. A diff that fixes two unrelated things gets reviewed twice or not at all.");
  L.push("");
  L.push("## Setting the repository up");
  L.push("");
  L.push("```sh");
  L.push(`git clone ${url}.git`);
  L.push(`cd ${i.repo.split("/")[1] || fill(i.name, "the folder it lands in").toLowerCase().replace(/\s+/g, "-")}`);
  L.push(fill(i.install, "the command that installs dependencies"));
  L.push("```");
  L.push("");
  L.push("## Making the change");
  L.push("");
  L.push("```sh");
  L.push("git switch -c my-change");
  L.push("# edit, then");
  L.push(fill(i.test, "the command that runs the test suite"));
  L.push("git add -p");
  L.push('git commit -m "say what changed and why"');
  L.push("git push -u origin my-change");
  L.push("```");
  L.push("");
  L.push("## What a review looks for");
  L.push("");
  L.push("- The tests pass, and a test exists for the behaviour you changed.");
  L.push("- The commit message explains the reason, not the diff.");
  L.push("- Nothing unrelated moved: no reformatting of files you did not touch, no drive-by dependency bumps.");
  L.push("- Docs and error messages match what the code now does.");
  L.push("");
  L.push("## Labels worth knowing");
  L.push("");
  L.push(`- \`${i.goodFirst || "good first issue"}\` - scoped, and a maintainer will answer questions on it.`);
  L.push("- `help wanted` - real work, no mentoring budget behind it.");
  L.push("");
  L.push("## Conduct");
  L.push("");
  L.push(`This project asks for the behaviour written up in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Issue threads, pull requests and any chat room around the project are covered by it.`);
  L.push("");
  L.push("## Getting unstuck");
  L.push("");
  L.push(has(i.contact)
    ? `Ask on the issue itself, or reach the maintainers at ${i.contact.trim()}. Asking in public means the answer helps the next person too.`
    : "Ask on the issue itself - a question answered in public helps the next person as much as it helps you.");
  L.push("");
  return L.join("\n");
}

/* ── 3. LICENSE ────────────────────────────────────────────────── */
export function licenseText(i: DocInput): string {
  const holder = i.holder.trim() || `[name of the copyright holder]`;
  const year = i.year || new Date().getFullYear();
  switch (i.license) {
    case "mit":
      return `MIT License

Copyright (c) ${year} ${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
    case "bsd-3-clause":
      return `BSD 3-Clause License

Copyright (c) ${year} ${holder}
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors
   may be used to endorse or promote products derived from this software
   without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
`;
    case "unlicense":
      return `This is free and unencumbered software released into the public domain.

Anyone is free to copy, modify, publish, use, compile, sell, or
distribute this software, either in source code form or as a compiled
binary, for any purpose, by any means, and without any conditions.

In jurisdictions that recognize copyright laws, the author or authors
of this software dedicate any and all copyright interest in the
software to the public domain. We make this dedication for the benefit
of the public at large and to the detriment of our heirs and
successors. We intend this dedication to be an overt act of
relinquishment in perpetuity of all present and future rights to this
software under copyright law.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

For more information, please refer to <https://unlicense.org>
`;
    case "apache-2.0":
      return `Copyright ${year} ${holder}

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

NOTE: this is the standard short notice. Commit the full Apache 2.0 text
as LICENSE-APACHE (it is about 11 KB and is not reproduced here so that
this generator stays honest): https://www.apache.org/licenses/LICENSE-2.0.txt
`;
    case "gpl-3.0":
      return `Copyright (C) ${year} ${holder}

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

NOTE: the GPL requires the full license text to ship with the program.
Put it at LICENSE-GPL before publishing: https://www.gnu.org/licenses/gpl-3.0.txt
`;
    case "mpl-2.0":
      return `This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.

NOTE: MPL 2.0 is file-level copyleft - the notice above goes at the top of
every file it covers. Ship the full text alongside it: https://www.mozilla.org/MPL/2.0/
`;
  }
}

/* ── 4. CODE_OF_CONDUCT ────────────────────────────────────────── */
export function conduct(i: DocInput): string {
  const contact = has(i.contact) ? i.contact.trim() : `[a private address the maintainers can be reached at]`;
  const L: string[] = [];
  L.push(`# Code of Conduct`);
  L.push("");
  L.push(`A shortened adaptation of the [Contributor Covenant v2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/), used under CC BY 4.0.`);
  L.push("");
  L.push("## Our commitment");
  L.push("");
  L.push(`We working on ${fill(i.name, "project name")} want it to be a place where people can contribute without being made to feel stupid for asking. We welcome everyone, whatever their experience, background, or identity, and we expect the same of anybody who takes part.`);
  L.push("");
  L.push("## Behaviour we expect");
  L.push("");
  L.push("- Ask before assuming. A question in an issue is cheaper for everyone than a guessed review comment.");
  L.push("- Criticise the code, never the person. \"This breaks on X because Y\" lands; \"why did you do this\" does not.");
  L.push("- Accept that there is more than one way to solve a problem, and say so when you disagree.");
  L.push("- Match the effort you ask for. Reviewing someone's pull request is a favour; treat it like one.");
  L.push("");
  L.push("## Behaviour we do not tolerate");
  L.push("");
  L.push("- Personal attacks, insults about the quality of someone's work in public, harassment, and sustained disruption of a thread.");
  L.push("- Publishing other people's private information, or their identity, without consent.");
  L.push("- Taking credit for work that is not yours.");
  L.push("- Repeatedly ignoring the above after being asked to stop.");
  L.push("");
  L.push("## Where this applies");
  L.push("");
  L.push("Issue threads, pull requests, commit messages, project chat, and any space where the project is being discussed. It also applies outside those spaces when the behaviour affects who feels safe contributing here.");
  L.push("");
  L.push("## Reporting");
  L.push("");
  L.push(`Report it to ${contact}, or to any maintainer directly. Include the link to the thread if there is one. We read every report, we do not publish the details of the complaint, and we will tell you what we did.`);
  L.push("");
  L.push("## What happens next");
  L.push("");
  L.push("The response is proportionate to what happened and to the risk it poses to the people contributing here: a private word, a public clarification, an edit to the thread, a temporary or permanent ban. Someone who has been asked to stop and does not is not getting a second private word.");
  L.push("");
  L.push("## Attribution");
  L.push("");
  L.push("This document is a plain-language adaptation of the Contributor Covenant, version 2.1, https://www.contributor-covenant.org/version/2/1/code_of_conduct/, available under the Creative Commons Attribution 4.0 International License.");
  L.push("");
  return L.join("\n");
}

/* ── the set the studio hands over ─────────────────────────────── */
export interface GeneratedDoc { key: string; file: string; label: string; text: string; blurb: string }

export function docsFor(i: DocInput): GeneratedDoc[] {
  return [
    { key: "readme", file: "README.md", label: "README", text: readme(i), blurb: "The first thing a stranger reads, and usually the last." },
    { key: "contributing", file: "CONTRIBUTING.md", label: "Contributing", text: contributing(i), blurb: "How to set it up, how to send a change, what review looks for." },
    { key: "license", file: "LICENSE", label: "License", text: licenseText(i), blurb: "What people may do with your work." },
    { key: "conduct", file: "CODE_OF_CONDUCT.md", label: "Code of conduct", text: conduct(i), blurb: "The behaviour asked of anyone who takes part." },
  ];
}
