import { readFileSync, writeFileSync } from "node:fs";

import { generateThemeCss } from "../src/css.ts";

const output = new URL("../src/theme.css", import.meta.url);
const generated = generateThemeCss();
if (process.argv.includes("--check")) {
  if (readFileSync(output, "utf8") !== generated) {
    console.error(
      "Shared theme CSS is stale. Run pnpm --filter @tic-tac-chor/design generate:css.",
    );
    process.exitCode = 1;
  }
} else {
  writeFileSync(output, generated);
}
