const WORKFLOW = '.github/workflows/staging.yml';
const ARTIFACT = 'site-release';

function validateRun(run, repository, workflowId) {
  if (run.repository?.full_name !== repository || run.head_repository?.full_name !== repository ||
      run.workflow_id !== workflowId || run.path !== WORKFLOW || run.head_branch !== 'main' ||
      !['push', 'workflow_dispatch'].includes(run.event) ||
      run.status !== 'completed' || run.conclusion !== 'success') {
    throw new Error('Choose a completed, successful Publish staging run from this repository’s main branch.');
  }
}

async function selectRelease({ github, context, core, runId = '' }) {
  const { owner, repo } = context.repo;
  const repository = `${owner}/${repo}`;
  if (runId && !/^[1-9]\d*$/.test(runId)) throw new Error('Staging run ID must be a positive integer.');
  const { data: workflow } = await github.rest.actions.getWorkflow({ owner, repo, workflow_id: 'staging.yml' });
  let run;
  if (runId) {
    ({ data: run } = await github.rest.actions.getWorkflowRun({ owner, repo, run_id: Number(runId) }));
  } else {
    const runs = await github.paginate(github.rest.actions.listWorkflowRuns, {
      owner, repo, workflow_id: workflow.id, branch: 'main', status: 'success', per_page: 100
    });
    run = runs.filter(r => r.status === 'completed' && ['push', 'workflow_dispatch'].includes(r.event))
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0];
    if (!run) throw new Error('Publish staging successfully before promoting production.');
  }
  validateRun(run, repository, workflow.id);
  const artifacts = await github.paginate(github.rest.actions.listWorkflowRunArtifacts, { owner, repo, run_id: run.id, per_page: 100 });
  const artifact = artifacts.find(a => a.name === ARTIFACT && !a.expired);
  if (!artifact) throw new Error('The site-release artifact is missing or expired. Republish the intended revision to staging first.');
  core.setOutput('run_id', String(run.id));
  core.setOutput('sha', run.head_sha);
  await core.summary.addHeading('Selected staging release').addTable([
    ['Source commit', run.head_sha], ['Staging run', run.html_url], ['Artifact', String(artifact.id)]
  ]).write();
  return { runId: run.id, sha: run.head_sha, artifactId: artifact.id };
}
module.exports = { validateRun, selectRelease };
