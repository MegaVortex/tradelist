const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const WORKFLOW_DIRECTORY = path.join(PROJECT_ROOT, ".github", "workflows");

function readWorkflow(filename) {
  return fs.readFileSync(path.join(WORKFLOW_DIRECTORY, filename), "utf8");
}

test("third-party workflow actions are pinned to immutable commits", () => {
  const workflow = [readWorkflow("deploy.yml"), readWorkflow("e2e.yml")].join("\n");
  const references = [...workflow.matchAll(/^\s*uses:\s*[^\s@]+@([^\s#]+)/gm)];

  assert.equal(references.length, 7);
  for (const reference of references) {
    assert.match(reference[1], /^[a-f0-9]{40}$/);
  }
  assert.doesNotMatch(workflow, /^\s*uses:\s*[^\n]+@(main|master|v\d+)/gm);
});

test("workflows declare narrow permissions and do not persist checkout credentials", () => {
  const deploy = readWorkflow("deploy.yml");
  const e2e = readWorkflow("e2e.yml");
  const combined = `${deploy}\n${e2e}`;

  assert.match(deploy, /^permissions:\s*\r?\n\s+contents:\s*write$/m);
  assert.match(e2e, /^permissions:\s*\r?\n\s+contents:\s*read$/m);
  assert.doesNotMatch(combined, /permissions:\s*write-all/);
  assert.equal((combined.match(/persist-credentials:\s*false/g) || []).length, 2);
  assert.equal((combined.match(/timeout-minutes:\s*20/g) || []).length, 2);
  assert.doesNotMatch(combined, /runs-on:\s*ubuntu-latest/);
});

test("live E2E runs only after a successful Pages publication", () => {
  const e2e = readWorkflow("e2e.yml");
  assert.match(e2e, /if:\s*github[.]event[.]workflow_run[.]conclusion == 'success'/);
  assert.match(e2e, /retention-days:\s*7/);
});
