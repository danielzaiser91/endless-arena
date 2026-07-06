/**
 * One-time Firebase setup for the leaderboard (implementation.md §11, AGENT_PROMPT.md).
 * Idempotent — safe to re-run. Uses the admin service-account key ONLY to call Google APIs;
 * never logs any credential material, never ships the key to the client.
 *
 * Usage: npx tsx scripts/setup-firebase.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { GoogleAuth } from 'google-auth-library';

const PROJECT_ID = 'adventure-3d-inc';
const FIRESTORE_LOCATION = 'europe-west3';
const KEY_PATH = '.secrets/adventure-3d-inc-firebase-adminsdk-fbsvc-2639c082ff.json';
const WEB_APP_DISPLAY_NAME = 'Endless Arena Web';
const RULES_PATH = 'firestore.rules';
const CONFIG_OUT_PATH = 'src/net/firebase-config.ts';

async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    keyFile: KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const res = await client.getAccessToken();
  if (!res.token) throw new Error('Failed to obtain access token from service account.');
  return res.token;
}

async function api(token: string, method: string, url: string, body?: unknown): Promise<{ ok: boolean; status: number; json: unknown }> {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { ok: res.ok, status: res.status, json };
}

async function pollOperation(token: string, pollUrl: string): Promise<{ done: boolean; response?: Record<string, unknown>; error?: unknown }> {
  for (let i = 0; i < 15; i++) {
    const res = await api(token, 'GET', pollUrl);
    const op = res.json as { done?: boolean; response?: Record<string, unknown>; error?: unknown };
    if (op.done) return { done: true, response: op.response, error: op.error };
    await new Promise((r) => setTimeout(r, 2000));
  }
  return { done: false };
}

async function ensureApiEnabled(token: string, serviceName: string): Promise<boolean> {
  console.log(`→ Ensuring ${serviceName} is enabled…`);
  const check = await api(token, 'GET', `https://serviceusage.googleapis.com/v1/projects/${PROJECT_ID}/services/${serviceName}`);
  const state = (check.json as { state?: string })?.state;
  if (check.ok && state === 'ENABLED') {
    console.log('  ✓ Already enabled.');
    return true;
  }
  const enable = await api(token, 'POST', `https://serviceusage.googleapis.com/v1/projects/${PROJECT_ID}/services/${serviceName}:enable`, {});
  if (!enable.ok) {
    console.log(`  ✗ Failed to enable ${serviceName} (status ${enable.status}).`, enable.json);
    return false;
  }
  const op = enable.json as { done?: boolean; name?: string; error?: unknown };
  if (op.done) {
    if (op.error) { console.log(`  ✗ Enable operation for ${serviceName} failed.`, op.error); return false; }
    console.log('  ✓ Enabled.');
    return true;
  }
  const polled = await pollOperation(token, `https://serviceusage.googleapis.com/v1/${op.name}`);
  if (!polled.done || polled.error) {
    console.log(`  ✗ Enabling ${serviceName} did not complete.`, polled.error ?? '(timed out)');
    return false;
  }
  console.log('  ✓ Enabled.');
  return true;
}

async function ensureFirestoreDatabase(token: string): Promise<void> {
  console.log('→ Checking Firestore default database…');
  const check = await api(token, 'GET', `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)`);
  if (check.ok) {
    console.log('  ✓ Firestore default database already exists.');
    return;
  }
  if (check.status !== 404) {
    console.log(`  ✗ Unexpected status ${check.status} checking Firestore — skipping creation.`, check.json);
    return;
  }
  console.log('  Creating Firestore default database…');
  const create = await api(
    token, 'POST',
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases?databaseId=(default)`,
    { locationId: FIRESTORE_LOCATION, type: 'FIRESTORE_NATIVE' },
  );
  if (!create.ok) {
    console.log(`  ✗ Failed to create Firestore database (status ${create.status}).`, create.json);
    return;
  }
  console.log('  ✓ Firestore database creation started (async operation) — should be ready shortly.');
}

async function ensureAnonymousAuth(token: string): Promise<void> {
  console.log('→ Checking Anonymous Authentication…');
  const check = await api(token, 'GET', `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`);
  if (!check.ok) {
    console.log(`  ✗ Failed to read Identity Toolkit config (status ${check.status}).`, check.json);
    return;
  }
  const cfg = check.json as { signIn?: { anonymous?: { enabled?: boolean } } };
  if (cfg.signIn?.anonymous?.enabled) {
    console.log('  ✓ Anonymous auth already enabled.');
    return;
  }
  const patch = await api(
    token, 'PATCH',
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=signIn.anonymous.enabled`,
    { signIn: { anonymous: { enabled: true } } },
  );
  if (!patch.ok) {
    console.log(`  ✗ Failed to enable anonymous auth (status ${patch.status}).`, patch.json);
    return;
  }
  console.log('  ✓ Anonymous auth enabled.');
}

async function ensureWebAppConfig(token: string): Promise<Record<string, string> | null> {
  console.log('→ Checking Firebase Web App registration…');
  const list = await api(token, 'GET', `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps`);
  if (!list.ok) {
    console.log(`  ✗ Failed to list web apps (status ${list.status}).`, list.json);
    return null;
  }
  const apps = (list.json as { apps?: Array<{ appId: string; displayName?: string }> }).apps ?? [];
  let appId = apps[0]?.appId;

  if (!appId) {
    console.log('  No web app found — registering one…');
    const create = await api(
      token, 'POST',
      `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps`,
      { displayName: WEB_APP_DISPLAY_NAME },
    );
    if (!create.ok) {
      console.log(`  ✗ Failed to create web app (status ${create.status}).`, create.json);
      return null;
    }
    const op = create.json as { name: string };
    appId = await pollWebAppOperation(token, op.name);
    if (!appId) return null;
  }
  console.log('  ✓ Web app registered.');

  const config = await api(token, 'GET', `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps/${appId}/config`);
  if (!config.ok) {
    console.log(`  ✗ Failed to fetch web app config (status ${config.status}).`, config.json);
    return null;
  }
  return config.json as Record<string, string>;
}

async function pollWebAppOperation(token: string, operationName: string): Promise<string | null> {
  for (let i = 0; i < 10; i++) {
    const res = await api(token, 'GET', `https://firebase.googleapis.com/v1/${operationName}`);
    const op = res.json as { done?: boolean; response?: { appId?: string }; error?: unknown };
    if (op.done) {
      if (op.error) {
        console.log('  ✗ Web app creation operation failed.', op.error);
        return null;
      }
      return op.response?.appId ?? null;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log('  ✗ Timed out waiting for web app creation.');
  return null;
}

async function deployFirestoreRules(token: string): Promise<void> {
  console.log('→ Deploying Firestore security rules…');
  const source = readFileSync(RULES_PATH, 'utf8');
  const createRuleset = await api(
    token, 'POST',
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
    { source: { files: [{ name: 'firestore.rules', content: source }] } },
  );
  if (!createRuleset.ok) {
    console.log(`  ✗ Failed to create ruleset (status ${createRuleset.status}).`, createRuleset.json);
    return;
  }
  const ruleset = createRuleset.json as { name: string };

  const releaseName = `projects/${PROJECT_ID}/releases/cloud.firestore`;
  const existingRelease = await api(token, 'GET', `https://firebaserules.googleapis.com/v1/${releaseName}`);
  const releaseBody = { name: releaseName, rulesetName: ruleset.name };
  const publish = existingRelease.ok
    ? await api(token, 'PATCH', `https://firebaserules.googleapis.com/v1/${releaseName}`, { release: releaseBody })
    : await api(token, 'POST', `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases`, releaseBody);

  if (!publish.ok) {
    console.log(`  ✗ Failed to publish rules release (status ${publish.status}).`, publish.json);
    return;
  }
  console.log('  ✓ Firestore security rules deployed.');
}

function writeClientConfig(config: Record<string, string>): void {
  mkdirSync(dirname(CONFIG_OUT_PATH), { recursive: true });
  const body = `/**
 * Public Firebase web-app config — safe to commit (implementation.md §11, §15).
 * Generated by scripts/setup-firebase.ts — do not hand-edit; re-run the script instead.
 */
export const firebaseConfig = {
  apiKey: ${JSON.stringify(config.apiKey)},
  authDomain: ${JSON.stringify(config.authDomain)},
  projectId: ${JSON.stringify(config.projectId)},
  storageBucket: ${JSON.stringify(config.storageBucket)},
  messagingSenderId: ${JSON.stringify(config.messagingSenderId)},
  appId: ${JSON.stringify(config.appId)},
};
`;
  writeFileSync(CONFIG_OUT_PATH, body);
  console.log(`  ✓ Wrote ${CONFIG_OUT_PATH}`);
}

async function main(): Promise<void> {
  const token = await getAccessToken();
  await ensureApiEnabled(token, 'firestore.googleapis.com');
  await ensureApiEnabled(token, 'identitytoolkit.googleapis.com');
  await ensureApiEnabled(token, 'firebaserules.googleapis.com');
  await ensureFirestoreDatabase(token);
  await ensureAnonymousAuth(token);
  const config = await ensureWebAppConfig(token);
  if (config) writeClientConfig(config);
  else console.log('  ⚠ Skipping firebase-config.ts write — web app config unavailable.');
  await deployFirestoreRules(token);
  console.log('Done.');
}

main().catch((err) => {
  console.log('Setup failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
