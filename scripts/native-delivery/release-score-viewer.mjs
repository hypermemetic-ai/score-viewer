import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { validatePair, validateIdentity, safePath } from './score-viewer-delivery.mjs';

export const WORKFLOW = 'build-score-viewer-native.yml';
export const DOWNLOAD_INDEX = `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ISO Score Viewer downloads</title>
<style>body{font:18px system-ui,sans-serif;max-width:38rem;margin:4rem auto;padding:0 1.5rem;line-height:1.6}a{display:block;margin:1rem 0}small{color:#555}</style>
<h1>ISO Score Viewer</h1><p id="version">Loading downloads…</p><div id="downloads"></div>
<p><small>Download and unzip the package for your computer, then follow its installation guide.</small></p>
<script type="module">
try {
  const response = await fetch('./current.json', {cache:'no-store'});
  if (!response.ok) throw Error('Download information is unavailable.');
  const current = await response.json();
  const targets = [['windows','Windows x64'],['mac','Mac — Intel and Apple Silicon']];
  for (const [key] of targets) {
    if (!current.downloads?.[key]?.href?.startsWith('releases/')) throw Error('Download information is unavailable.');
  }
  document.querySelector('#version').textContent = 'Version ' + current.identity.version;
  for (const [key, label] of targets) {
    const link = document.createElement('a');
    link.href = current.downloads[key].href; link.textContent = 'Download for ' + label;
    document.querySelector('#downloads').append(link);
  }
} catch { document.querySelector('#version').textContent = 'Downloads are unavailable. Please try again shortly.'; }
</script></html>
`;

const pause = milliseconds => new Promise(done => setTimeout(done, milliseconds));
const execFileAsync = promisify(execFile);
async function execute(command, args) {
  const { stdout } = await execFileAsync(command, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  return stdout;
}
async function json(path) { return JSON.parse(await readFile(path, 'utf8')); }
async function optionalJson(path) {
  try { return await json(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
function assertSource(manifest, expectedRevision, expectedTimestamp, expectedRun) {
  const identity = manifest.identity;
  if (!identity || identity.sourceRevision !== expectedRevision) throw Error('Pair source revision does not match the selected revision.');
  if (expectedTimestamp && Date.parse(identity.sourceTimestamp) !== Date.parse(expectedTimestamp)) throw Error('Pair source timestamp does not match the selected commit.');
  if (!Number.isFinite(Date.parse(identity.sourceTimestamp))) throw Error('Pair source timestamp is invalid.');
  if (identity.releaseId !== `${identity.version}-${expectedRevision}` || !/^[a-zA-Z0-9.+_-]+$/.test(identity.releaseId)) throw Error('Unsafe or inconsistent release identity.');
  if (expectedRun && (String(manifest.workflow?.runId) !== String(expectedRun.id) || Number(manifest.workflow?.runAttempt) !== Number(expectedRun.run_attempt))) throw Error('Pair workflow run or attempt does not match the downloaded artifact.');
}

async function publicationLock(output, { sleep, now, timeoutMs }) {
  const lock = join(output, '.pair-publication.lock'), deadline = now() + timeoutMs;
  while (true) {
    try {
      await mkdir(lock);
      try { await writeFile(join(lock, 'owner.json'), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }) + '\n', { flag: 'wx' }); }
      catch (error) { await rm(lock, { recursive: true }); throw error; }
      return () => rm(lock, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (now() >= deadline) throw Error(`Another pair publication holds ${lock}. Its current release was preserved.`);
      await sleep(Math.min(250, Math.max(1, deadline - now())));
    }
  }
}

/** Copy verified immutable files, then commit both links through one rename. */
export async function publishPair(artifactRoot, outputDirectory, options = {}) {
  const { expectedRevision, expectedTimestamp, expectedRun, compareRevisions, migration,
    validate = validatePair, sleep = pause, now = Date.now, lockTimeoutMs = 60000 } = options;
  let manifest = await validate(artifactRoot, { expectedRevision });
  assertSource(manifest, expectedRevision ?? manifest.identity.sourceRevision, expectedTimestamp, expectedRun);
  const output = resolve(outputDirectory);
  await mkdir(output, { recursive: true });
  const unlock = await publicationLock(output, { sleep, now, timeoutMs: lockTimeoutMs });
  let staging, pointer;
  try {
    const current = await optionalJson(join(output, 'current.json'));
    if (current) {
      if (current.schema !== 1 || !current.identity?.sourceRevision || !Number.isFinite(Date.parse(current.identity.sourceTimestamp)) || !current.downloads?.windows || !current.downloads?.mac) throw Error('Existing current.json is not a valid paired publication; it was preserved.');
      if (current.identity.sourceRevision !== manifest.identity.sourceRevision) {
        if (migration && current.identity.sourceRevision === migration.fromRevision) {
          safePath(current.identity.releaseId);
          const previous = await validate(join(output, 'releases', current.identity.releaseId), {expectedRevision: migration.fromRevision});
          const before = previous.identity.sourceInputs, after = manifest.identity.sourceInputs;
          if (previous.identity.releaseId !== current.identity.releaseId || before?.viewerRepository !== 'hypermemetic-ai/score-viewer' || after?.viewerRepository !== before.viewerRepository ||
              !before.viewerRevision || !after.viewerRevision || !(await migration.compareViewerRevisions(before.viewerRevision, after.viewerRevision))) {
            throw Error('Viewer source ancestry for the explicit ISO delivery migration was not established; the current pair was preserved.');
          }
          for (const [platform, name] of [['windows', 'Windows.zip'], ['mac', 'Mac.zip']]) {
            const pin = previous.files['packages/' + name], published = current.downloads[platform];
            if (!pin || pin.sha256 !== published.sha256 || pin.size !== published.size || published.href !== `releases/${current.identity.releaseId}/packages/${name}`) throw Error('Existing publication differs from its verified pair; migration refused.');
          }
        } else if (compareRevisions) {
          if (!(await compareRevisions(current.identity.sourceRevision, manifest.identity.sourceRevision))) throw Error('Selected revision does not descend from the current pair; the current pair was preserved.');
        } else if (Date.parse(manifest.identity.sourceTimestamp) <= Date.parse(current.identity.sourceTimestamp)) throw Error('Refusing an older or unordered finishing release; the current pair was preserved.');
      }
    }
    const releases = join(output, 'releases');
    await mkdir(releases, { recursive: true });
    staging = await mkdtemp(join(releases, '.incoming-'));
    const payload = join(staging, 'pair');
    await cp(artifactRoot, payload, { recursive: true, force: false, errorOnExist: true });
    const copied = await validate(payload, { expectedRevision: manifest.identity.sourceRevision });
    assertSource(copied, manifest.identity.sourceRevision, expectedTimestamp, expectedRun);
    if (JSON.stringify(copied) !== JSON.stringify(manifest)) throw Error('Pair changed while being copied; the current pair was preserved.');
    const destination = join(releases, manifest.identity.releaseId);
    const existing = await optionalJson(join(destination, 'release.json'));
    if (existing) {
      const verifiedExisting = await validate(destination, { expectedRevision: manifest.identity.sourceRevision });
      if (JSON.stringify(verifiedExisting.identity) !== JSON.stringify(manifest.identity)) throw Error('An immutable release with this identity has different runtime inputs; it was preserved.');
      // A rebuild can vary ZIP metadata, native signatures and run timings. The
      // first independently verified pair for this exact input stays immutable.
      manifest = verifiedExisting;
      await rm(staging, { recursive: true }); staging = undefined;
    } else {
      await rename(payload, destination);
    }
    try { await writeFile(join(output, 'index.html'), DOWNLOAD_INDEX, { flag: 'wx' }); }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (await readFile(join(output, 'index.html'), 'utf8') !== DOWNLOAD_INDEX) throw Error('Existing index.html belongs to another page; it was preserved. Use a dedicated delivery directory.');
    }
    const publication = {
      schema: 1,
      identity: Object.fromEntries(['releaseId', 'sourceRevision', 'sourceTimestamp', 'version', 'sourceInputs'].map(key => [key, manifest.identity[key]])),
      downloads: Object.fromEntries([['windows', 'Windows.zip'], ['mac', 'Mac.zip']].map(([platform, filename]) => {
        const path = `packages/${filename}`, file = manifest.files[path];
        if (!file) throw Error(`Verified pair is missing ${path}.`);
        return [platform, { href: `releases/${manifest.identity.releaseId}/${path}`, sha256: file.sha256, size: file.size }];
      })),
    };
    pointer = join(output, `.current-${randomUUID()}.json`);
    await writeFile(pointer, JSON.stringify(publication, null, 2) + '\n', { flag: 'wx' });
    await rename(pointer, join(output, 'current.json')); pointer = undefined;
    return publication;
  } finally {
    if (staging) await rm(staging, { recursive: true });
    if (pointer) await rm(pointer, { force: true });
    await unlock();
  }
}

function belongsToWorkflow(run) { return run.path?.split('@')[0] === `.github/workflows/${WORKFLOW}`; }
export function matchesSourceRun(run, sourceRevision) {
  if (!belongsToWorkflow(run)) return false;
  // A dispatch's workflow head identifies its definition, not source_revision.
  if (run.event === 'workflow_dispatch') return new RegExp(`(?:^|[^a-f0-9])${sourceRevision}(?:$|[^a-f0-9])`, 'i').test(run.display_title ?? '');
  return run.event === 'push' && run.head_sha === sourceRevision;
}

function reviewedScorePin(options) {
  if (options.scorePath === undefined && options.scoreSha256 === undefined) return undefined;
  if (options.scorePath === undefined || options.scoreSha256 === undefined) throw Error('--score-path and --score-sha256 must be supplied together.');
  safePath(options.scorePath);
  if (!/\.(?:tuna|isoscore)$/.test(options.scorePath) || !/^[a-f0-9]{64}$/.test(options.scoreSha256)) throw Error('Invalid reviewed score path or SHA256.');
  return { path: options.scorePath, sha256: options.scoreSha256 };
}

export function workflowTimingEvidence(run, jobs) {
  const timestamp = value => {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw Error('GitHub returned an invalid workflow timestamp.');
    return new Date(value).toISOString();
  };
  const elapsed = (start, end) => {
    if (start === null || end === null) return null;
    const milliseconds = Date.parse(end) - Date.parse(start);
    if (milliseconds < 0) throw Error('GitHub returned unordered workflow timestamps.');
    return milliseconds;
  };
  const rows = jobs.map(job => {
    if (!job || !Number.isSafeInteger(job.id) || typeof job.name !== 'string' ||
      (job.run_id !== undefined && String(job.run_id) !== String(run.id)) ||
      (job.run_attempt !== undefined && Number(job.run_attempt) !== Number(run.run_attempt))) throw Error('GitHub returned a mismatched workflow job.');
    const startedAt = timestamp(job.started_at), completedAt = timestamp(job.completed_at);
    return { id: job.id, name: job.name, status: job.status, conclusion: job.conclusion,
      startedAt, completedAt, elapsedMs: elapsed(startedAt, completedAt) };
  });
  const createdAt = timestamp(run.created_at), startedAt = timestamp(run.run_started_at);
  // updated_at can change after execution; actual job completion is the end
  // boundary. Missing API timestamps stay null rather than becoming estimates.
  const completedAt = rows.length && rows.every(job => job.status === 'completed' && job.completedAt !== null)
    ? new Date(Math.max(...rows.map(job => Date.parse(job.completedAt)))).toISOString() : null;
  return { runId: run.id, runAttempt: run.run_attempt, createdAt, startedAt, completedAt,
    apiUpdatedAt: timestamp(run.updated_at), queueMs: elapsed(createdAt, startedAt),
    executionMs: elapsed(startedAt, completedAt), jobs: rows };
}

/** This is the only recipient publication operation; there is no platform option. */
export async function releaseScoreViewer(options, dependencies = {}) {
  if (!options.output) throw Error('A private --output directory is required.');
  const scorePin = reviewedScorePin(options);
  if (options.migrateFromIsoCarrier && !/^[a-f0-9]{40}$/.test(options.migrateFromIsoCarrier)) throw Error('Migration requires the exact previous ISO carrier SHA.');
  const { run = execute, validate = validatePair, sleep = pause, now = Date.now, log = console.log } = dependencies;
  const repository = options.repository ?? (await run('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'])).trim();
  if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository)) throw Error('Invalid GitHub repository.');
  const api = async path => JSON.parse(await run('gh', ['api', `repos/${repository}/${path}`]));
  // Explicit object-shaped pages work with the installed GitHub CLI, including
  // versions before `gh api --slurp`. Bound requests by GitHub's total_count.
  const listCollection = async (path, key) => {
    const items = []; let pageCount = 1;
    for (let page = 1; page <= pageCount; page++) {
      const result = await api(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
      if (!Array.isArray(result[key]) || !Number.isSafeInteger(result.total_count) || result.total_count < 0) throw Error(`GitHub returned an invalid ${key === 'artifacts' ? 'artifact' : 'job'} page; current downloads were preserved.`);
      if (page === 1) pageCount = Math.max(1, Math.ceil(result.total_count / 100));
      items.push(...result[key]);
      if (result[key].length < 100) break;
    }
    return items;
  };
  const commit = await api(`commits/${encodeURIComponent(options.revision ?? 'main')}`);
  const sourceRevision = commit.sha, sourceTimestamp = commit.commit?.committer?.date;
  if (!/^[a-f0-9]{40}$/.test(sourceRevision) || !Number.isFinite(Date.parse(sourceTimestamp))) throw Error('GitHub did not resolve an exact source commit and timestamp.');
  const artifactName = `ISO-Score-Viewer-paired-${sourceRevision}`;
  log(`Selected ${repository}@${sourceRevision}; both Windows and Mac are required.`);
  const deadline = now() + (options.timeoutMs ?? 45 * 60 * 1000);
  const discovery = scorePin ? await mkdtemp(join(tmpdir(), 'iso-score-viewer-input-')) : undefined;
  let downloadedPair;
  try {
    // The same source can be prepared with different reviewed score inputs. The
    // actual prepared manifest, not a source-only run title, proves this choice.
    const inspected = new Map();
    const inspectRunScore = async (candidate, paired) => {
      const key = `${candidate.id}:${candidate.run_attempt}:${paired}`;
      if (inspected.has(key)) return inspected.get(key);
      const folder = join(discovery, key.replaceAll(':', '-'));
      await mkdir(folder);
      const name = paired ? artifactName : `Score-Viewer-prepared-${sourceRevision}`;
      await run('gh', ['run', 'download', String(candidate.id), '--repo', repository, '--name', name, '--dir', folder]);
      const manifest = await json(join(folder, ...(paired ? ['prepared'] : []), 'manifest.json'));
      validateIdentity(manifest.identity);
      const matches = manifest.identity.sourceRevision === sourceRevision && Date.parse(manifest.identity.sourceTimestamp) === Date.parse(sourceTimestamp) &&
        manifest.identity.score.path === scorePin.path && manifest.identity.score.sha256 === scorePin.sha256;
      inspected.set(key, matches);
      if (matches && paired) downloadedPair = folder;
      if (!matches) log(`Skipping workflow ${candidate.id}: prepared score differs from the reviewed path/SHA256.`);
      return matches;
    };
    const matchingRunningInput = async candidates => {
      for (const candidate of candidates) {
        let current = candidate;
        while (true) {
          const files = await listCollection(`actions/runs/${current.id}/artifacts`, 'artifacts');
          if (files.some(a => a.name === artifactName && !a.expired) && current.status === 'completed') {
            if (current.conclusion === 'success' && await inspectRunScore(current, true)) return current;
            break;
          }
          if (files.some(a => a.name === `Score-Viewer-prepared-${sourceRevision}` && !a.expired)) {
            if (await inspectRunScore(current, false)) return current;
            break;
          }
          if (current.status === 'completed') break;
          if (now() >= deadline) throw Error('Timed out waiting for prepared score identity; current downloads were preserved.');
          // Preparation may still be running. Wait for its identity instead of
          // dispatching a second request that could have the same input.
          await sleep(options.pollMs ?? 10000);
          current = await api(`actions/runs/${current.id}`);
        }
      }
    };
    // Artifact identity is authoritative for dispatches whose workflow head differs
    // from their exact source_revision input. Do not rely on head_sha alone.
    const artifacts = (await listCollection(`actions/artifacts?name=${artifactName}`, 'artifacts')).filter(artifact => artifact.name === artifactName && !artifact.expired);
    let selected;
    for (const artifact of artifacts.sort((a, b) => Number(b.id) - Number(a.id))) {
      const candidate = await api(`actions/runs/${artifact.workflow_run.id}`);
      if (belongsToWorkflow(candidate) && candidate.status === 'completed' && candidate.conclusion === 'success' &&
        (!scorePin || await inspectRunScore(candidate, true))) { selected = candidate; break; }
    }
    const workflowRuns = async () => (await api(`actions/workflows/${WORKFLOW}/runs?per_page=100`)).workflow_runs ?? [];
    if (!selected) {
      const previous = await workflowRuns();
      const running = previous.filter(candidate => matchesSourceRun(candidate, sourceRevision) && candidate.status !== 'completed');
      selected = scorePin ? await matchingRunningInput(running) : running[0];
      if (!selected) {
        const ref = options.ref ?? 'main';
        log(`Dispatching paired workflow on ${ref} for ${sourceRevision}.`);
        await run('gh', ['workflow', 'run', WORKFLOW, '--repo', repository, '--ref', ref, '-f', `source_revision=${sourceRevision}`,
          ...(scorePin ? ['-f', `score_path=${scorePin.path}`, '-f', `score_sha256=${scorePin.sha256}`] : [])]);
        const previousIds = new Set(previous.map(candidate => candidate.id));
        while (!selected) {
          if (now() >= deadline) throw Error('Timed out waiting for the dispatched paired workflow; current downloads were preserved.');
          const fresh = (await workflowRuns()).filter(candidate => !previousIds.has(candidate.id) && candidate.event === 'workflow_dispatch' && candidate.head_branch === ref && matchesSourceRun(candidate, sourceRevision));
          selected = scorePin ? await matchingRunningInput(fresh) : fresh[0];
          if (!selected && scorePin && fresh.some(candidate => candidate.status === 'completed' && candidate.conclusion !== 'success')) throw Error('Paired workflow failed before preparing the reviewed score; current downloads were preserved.');
          if (!selected) await sleep(options.pollMs ?? 10000);
        }
      }
      let lastStatus;
      while (selected.status !== 'completed') {
        if (now() >= deadline) throw Error(`Timed out waiting for workflow ${selected.id}; current downloads were preserved.`);
        if (selected.status !== lastStatus) { log(`Workflow ${selected.id}: ${selected.status}.`); lastStatus = selected.status; }
        await sleep(options.pollMs ?? 10000);
        selected = await api(`actions/runs/${selected.id}`);
      }
      if (selected.conclusion !== 'success') throw Error(`Paired workflow ${selected.id} finished with ${selected.conclusion}; current downloads were preserved.`);
      const completed = await listCollection(`actions/runs/${selected.id}/artifacts`, 'artifacts');
      if (!completed.some(artifact => artifact.name === artifactName && !artifact.expired)) throw Error(`Workflow ${selected.id} did not produce its complete paired artifact; current downloads were preserved.`);
    } else log(`Reusing completed paired workflow ${selected.id}.`);
    const workflowEvidence = workflowTimingEvidence(selected, await listCollection(`actions/runs/${selected.id}/attempts/${selected.run_attempt}/jobs`, 'jobs'));
    const stage = downloadedPair ?? await mkdtemp(join(tmpdir(), 'iso-score-viewer-pair-'));
    try {
      log(`Downloading and independently verifying ${artifactName}.`);
      if (!downloadedPair) await run('gh', ['run', 'download', String(selected.id), '--repo', repository, '--name', artifactName, '--dir', stage]);
      if (scorePin) {
        const identity = (await json(join(stage, 'prepared', 'manifest.json'))).identity;
        validateIdentity(identity);
        if (identity.score.path !== scorePin.path || identity.score.sha256 !== scorePin.sha256) throw Error('Downloaded pair score differs from the reviewed path/SHA256; current downloads were preserved.');
      }
      const cache = {
        preparation: (await json(join(stage, 'prepared', 'manifest.json'))).cache,
        'windows-x64': (await json(join(stage, 'receipts', 'windows-x64.json'))).cache,
        'macos-universal': (await json(join(stage, 'receipts', 'macos-universal.json'))).cache,
      };
      const publication = await publishPair(stage, options.output, {
        expectedRevision: sourceRevision, expectedTimestamp: sourceTimestamp, expectedRun: selected,
        validate, sleep, now, lockTimeoutMs: options.lockTimeoutMs,
        migration: options.migrateFromIsoCarrier ? {fromRevision: options.migrateFromIsoCarrier,
          compareViewerRevisions: async (current, next) => ['ahead', 'identical'].includes(JSON.parse(await run('gh', ['api', `repos/hypermemetic-ai/score-viewer/compare/${current}...${next}`])).status)} : undefined,
        compareRevisions: async (current, next) => ['ahead', 'identical'].includes((await api(`compare/${current}...${next}`)).status),
      });
      log(`Published ${publication.identity.releaseId}: ${resolve(options.output)}`);
      log(`Windows: ${publication.downloads.windows.href}\nMac: ${publication.downloads.mac.href}`);
      log(JSON.stringify({ workflowEvidence: { ...workflowEvidence, sourceRevision, artifactName, cache } }));
      return publication;
    } finally { await rm(stage, { recursive: true }); }
  } finally { if (discovery) await rm(discovery, { recursive: true, force: true }); }
}

export function parseArguments(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--help' || flag === '-h') { options.help = true; continue; }
    const key = { '--output': 'output', '--revision': 'revision', '--ref': 'ref', '--repository': 'repository', '--score-path': 'scorePath', '--score-sha256': 'scoreSha256', '--migrate-from-iso-carrier': 'migrateFromIsoCarrier' }[flag];
    if (!key) throw Error(`Unknown option: ${flag}. A Score Viewer release always includes Windows and Mac.`);
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw Error(`${flag} requires a value.`);
    if (options[key]) throw Error(`Duplicate option: ${flag}.`);
    options[key] = args[++i];
  }
  if (!options.help && !options.output) throw Error('Usage: npm run release:score-viewer -- --output <private-directory> [--revision <reviewed-commit>] [--ref <workflow-branch>]');
  reviewedScorePin(options);
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) console.log('Usage: npm run release:score-viewer -- --output <private-directory> [--revision <reviewed-commit>] [--ref <workflow-branch>] [--repository <owner/repo>] [--score-path <reviewed.tuna-or-isoscore> --score-sha256 <SHA256>]\nDefaults: reviewed main revision and main workflow ref. Always downloads, verifies and publishes Windows x64 and universal Mac together. Explicit score pins must be supplied together and are verified against actual prepared output.');
    else await releaseScoreViewer(options);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
