// dist/ is committed so hosts install a pinned GitHub tarball with no build step (Control Center pins one).
// This fails when the committed dist/ differs from what the source builds to. Run before every push.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const out = mkdtempSync(path.join(tmpdir(), "dt-dist-"));
execFileSync("npx", ["tsc", "-p", "tsconfig.json", "--outDir", out], { stdio: "inherit" });

const list = (dir, base = dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? list(p, base) : [path.relative(base, p)];
  });
const built = list(out).filter((f) => !f.endsWith(".map")).sort();
const committed = list("dist").filter((f) => !f.endsWith(".map")).sort();
const problems = [];
for (const f of built) {
  if (!committed.includes(f)) problems.push(`missing in dist/: ${f}`);
  else if (readFileSync(path.join(out, f), "utf8") !== readFileSync(path.join("dist", f), "utf8")) problems.push(`stale in dist/: ${f}`);
}
for (const f of committed) if (!built.includes(f)) problems.push(`extra in dist/: ${f}`);
if (problems.length) {
  console.error(`dist/ is out of date. Run npm run build and commit dist/.\n${problems.join("\n")}`);
  process.exit(1);
}
console.log(`dist/ is current (${built.length} files)`);
