const { test } = require('node:test');
const assert = require('node:assert/strict');
const { selectRelease, validateRun } = require('../tools/select-release.cjs');
const repository = 'jkeywo/ox-hog-site';
const base = { id: 1, repository: { full_name: repository }, head_repository: { full_name: repository }, workflow_id: 42, path: '.github/workflows/staging.yml', head_branch: 'main', status: 'completed', conclusion: 'success', event: 'push', head_sha: 'a'.repeat(40), html_url: 'https://example.com/run/1', updated_at: '2026-09-26T12:00:00Z' };

function fixture(runs = [base], artifacts = [{ id: 100, name: 'site-release', expired: false }]) {
  const outputs = {};
  const rest = { actions: {
    getWorkflow: async () => ({ data: { id: 42 } }),
    getWorkflowRun: async ({ run_id }) => ({ data: runs.find(r => r.id === run_id) }),
    listWorkflowRuns() {}, listWorkflowRunArtifacts() {}
  } };
  const github = { rest, paginate: async method => method === rest.actions.listWorkflowRuns ? runs : artifacts };
  const summary = { addHeading() { return this; }, addTable() { return this; }, async write() {} };
  return { github, context: { repo: { owner: 'jkeywo', repo: 'ox-hog-site' } }, core: { setOutput: (k,v) => outputs[k] = v, summary }, outputs };
}

test('selects latest completed successful staging, ignoring newer unfinished commits', async () => {
  const latest = { ...base, id: 2, head_sha: 'b'.repeat(40), updated_at: '2026-09-27T12:00:00Z' };
  const running = { ...base, id: 3, status: 'in_progress', conclusion: null, updated_at: '2026-09-27T13:00:00Z' };
  const selected = await selectRelease(fixture([running, base, latest]));
  assert.equal(selected.runId, 2);
  assert.equal(selected.sha, latest.head_sha);
});
test('explicit older run promotes that artifact for rollback', async () => {
  const selected = await selectRelease({ ...fixture([base, { ...base, id: 2 }]), runId: '1' });
  assert.equal(selected.runId, 1);
});
test('rejects invalid input, wrong repository/workflow/branch and failed or PR runs', async () => {
  await assert.rejects(selectRelease({ ...fixture(), runId: '1;echo bad' }), /positive integer/);
  for (const change of [ { repository: { full_name: 'other/repo' } }, { head_repository: { full_name: 'fork/repo' } }, { workflow_id: 7 }, { path: '.github/workflows/other.yml' }, { head_branch: 'other' }, { event: 'pull_request' }, { conclusion: 'failure' }, { status: 'in_progress' } ]) {
    assert.throws(() => validateRun({ ...base, ...change }, repository, 42), /completed, successful/);
  }
});
test('missing or expired artifacts and absent successful runs fail clearly', async () => {
  await assert.rejects(selectRelease(fixture([], [])), /Publish staging successfully/);
  await assert.rejects(selectRelease(fixture([base], [])), /missing or expired/);
  await assert.rejects(selectRelease(fixture([base], [{ name: 'site-release', expired: true }])), /missing or expired/);
});
