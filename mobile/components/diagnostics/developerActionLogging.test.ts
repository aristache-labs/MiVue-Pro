import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const contextSource = readFileSync(join(here, "../../context/DemoModeContext.tsx"), "utf8");

describe("Developer Logs action coverage", () => {
  it("logs thumbnail cache clearing and local library deletion outcomes", () => {
    assert.match(contextSource, /thumbnail cache clear start/);
    assert.match(contextSource, /thumbnail cache clear success/);
    assert.match(contextSource, /thumbnail cache clear failed/);
    assert.match(contextSource, /delete local library start files=/);
    assert.match(contextSource, /delete local library success deleted=/);
    assert.match(contextSource, /delete local library partial deleted=/);
    assert.match(contextSource, /delete local library failed deleted=0/);
  });

  it("logs SD formatting across success, failed, and unknown outcomes", () => {
    assert.match(contextSource, /format SD start model=/);
    assert.match(contextSource, /format SD success verified=true/);
    assert.match(contextSource, /format SD outcome=unknown/);
    assert.match(contextSource, /format SD failed_or_unknown/);
  });

  it("logs camera setting before, requested, and verified values", () => {
    assert.match(contextSource, /camera setting start key=/);
    assert.match(contextSource, /from=\$\{previousValue\} to=\$\{value\}/);
    assert.match(contextSource, /camera setting success key=/);
    assert.match(contextSource, /verified=true/);
    assert.match(contextSource, /camera setting failed_or_unknown key=/);
  });
});
