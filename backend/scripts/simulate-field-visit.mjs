#!/usr/bin/env node
// One-off testing helper: plays out a complete field visit (check-in -> photo -> form ->
// check-out) against your own already-running local backend, using the real API endpoints —
// nothing here is faked at the database level, it just does the same steps the phone app would.
// Exists because testing without a phone in hand still needs a way to put a fresh item in the
// supervisor's Approvals queue. Run with: node backend/scripts/simulate-field-visit.mjs
//
// Uses Rahul Kumar's seeded login (9000000009) and his Danapur Cantt Market assignment. The photo
// is an obviously synthetic solid-colour test image generated on the fly — not a real photograph,
// clearly test data, consistent with every other demo identity already in the seed data.

// Printed before anything else — including before any imports have a chance to hang or fail
// silently — so a stuck/failed run is never just a blinking cursor with no clue why.
console.log('Starting the field-visit simulation... (this should take about 10-15 seconds)');

const BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/api/v1';
const MOBILE_NUMBER = '9000000009'; // Rahul Kumar (Promoter, Bihar)
const TARGET_LOCATION = 'Danapur Cantt Market';
const DEVICE_FINGERPRINT = 'simulated-field-visit-script';
const REQUEST_TIMEOUT_MS = 15000;

let createHash, randomUUID, sharp;
try {
  ({ createHash, randomUUID } = await import('node:crypto'));
  sharp = (await import('sharp')).default;
  console.log('Loaded dependencies OK.');
} catch (err) {
  console.error('\nCould not load a required package (sharp, used to generate the test photo).');
  console.error('This usually means "pnpm install" needs to be re-run in the backend/ folder.');
  console.error('Underlying error:', err.message);
  process.exit(1);
}

function log(step, msg) {
  console.log(`[${step}] ${msg}`);
}

async function api(path, { method = 'GET', body, token, isForm = false } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !isForm) headers['Content-Type'] = 'application/json';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(
        `${method} ${path} did not respond within ${REQUEST_TIMEOUT_MS / 1000} seconds — is the backend ` +
          `actually running at ${BASE}? (Check the bootstrap.sh terminal tab for "listening on".)`,
      );
    }
    throw new Error(`${method} ${path} failed to connect: ${err.message} — is the backend running at ${BASE}?`);
  } finally {
    clearTimeout(timeout);
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${json?.message ?? text}`);
  }
  return json;
}

async function main() {
  log('1/7', `Requesting OTP for ${MOBILE_NUMBER}...`);
  const otp = await api('/auth/otp/request', { method: 'POST', body: { mobileNumber: MOBILE_NUMBER } });
  if (!otp.devOtpCode) {
    throw new Error('No dev OTP code returned — is OTP_PROVIDER set to something other than "mock"?');
  }

  log('2/7', 'Verifying OTP and logging in...');
  const auth = await api('/auth/otp/verify', {
    method: 'POST',
    body: {
      challengeId: otp.challengeId,
      code: otp.devOtpCode,
      device: { fingerprint: DEVICE_FINGERPRINT, model: 'Simulated test device', osVersion: 'N/A', appVersion: 'script' },
    },
  });
  const token = auth.accessToken;
  log('2/7', `Logged in as ${auth.user.fullName}. Device status: ${auth.device.status}.`);
  if (auth.device.status !== 'ACTIVE') {
    throw new Error(
      `This test device is "${auth.device.status}", not ACTIVE — an admin needs to approve it, or raise ` +
        `MAX_ACTIVE_DEVICES_PER_USER in your .env, same as with a real phone hitting the device cap.`,
    );
  }

  log('3/7', `Finding the "${TARGET_LOCATION}" assignment...`);
  const assignments = await api('/me/assignments', { token });
  const assignment = assignments.find((a) => a.pjpRow?.locationName === TARGET_LOCATION);
  if (!assignment) {
    throw new Error(
      `No assignment found for "${TARGET_LOCATION}" — it may already be checked out, or the seed data has changed.`,
    );
  }
  const campaignId = assignment.campaign.id;
  const lat = Number(assignment.pjpRow.latitude);
  const lng = Number(assignment.pjpRow.longitude);

  log('4/7', 'Opening the activity and checking in...');
  const bundle = await api(`/campaigns/${campaignId}/assignments/${assignment.id}/activity`, { token });
  const activityId = bundle.activity.id;
  if (bundle.checkOut) {
    throw new Error('This activity is already checked out — nothing left to simulate. Pick a fresh assignment.');
  }
  if (!bundle.checkIn) {
    await api(`/campaigns/${campaignId}/activity-instances/${activityId}/check-in`, {
      method: 'POST',
      token,
      body: { latitude: lat, longitude: lng, accuracyMeters: 8, deviceTimestamp: new Date().toISOString() },
    });
  }

  log('5/7', 'Generating a test photo and uploading it (chunked, same as the phone app)...');
  const photo = await sharp({
    create: { width: 1200, height: 900, channels: 3, background: { r: 90, g: 140, b: 190 } },
  })
    .jpeg()
    .toBuffer();
  const sha256Hash = createHash('sha256').update(photo).digest('hex');

  const init = await api(`/campaigns/${campaignId}/activity-instances/${activityId}/media/init`, {
    method: 'POST',
    token,
    body: {
      sha256Hash,
      sizeBytes: photo.length,
      mimeType: 'image/jpeg',
      latitude: lat,
      longitude: lng,
      capturedAt: new Date().toISOString(),
    },
  });
  if (!init.alreadyComplete) {
    const form = new FormData();
    form.append('chunk', new Blob([photo], { type: 'image/jpeg' }), 'chunk-0');
    await fetch(`${BASE}/campaigns/${campaignId}/activity-instances/${activityId}/media/sessions/${init.session.id}/chunks/0`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(async (res) => {
      if (!res.ok) throw new Error(`Chunk upload failed: ${res.status} ${await res.text()}`);
    });
    await api(`/campaigns/${campaignId}/activity-instances/${activityId}/media/sessions/${init.session.id}/complete`, {
      method: 'POST',
      token,
    });
  }

  log('6/7', 'Filling in the milestone form...');
  const refreshed = await api(`/campaigns/${campaignId}/activity-instances/${activityId}`, { token });
  const questions = refreshed.milestone?.formVersion?.sections?.flatMap((s) => s.questions) ?? [];
  const findQ = (label) => questions.find((q) => q.label === label);
  const fieldResponses = [];
  const outletName = findQ('Outlet name');
  const conducted = findQ('Was the activity conducted?');
  const outletType = findQ('Outlet type');
  if (outletName) fieldResponses.push({ formQuestionId: outletName.id, valueJson: 'Danapur Test Kirana Store' });
  if (conducted) fieldResponses.push({ formQuestionId: conducted.id, valueJson: true });
  if (outletType) fieldResponses.push({ formQuestionId: outletType.id, valueJson: 'kirana' });
  if (fieldResponses.length > 0) {
    await api(`/campaigns/${campaignId}/activity-instances/${activityId}/milestone-response`, {
      method: 'POST',
      token,
      body: { clientRef: randomUUID(), fieldResponses },
    });
  }

  log('7/7', 'Checking out...');
  await api(`/campaigns/${campaignId}/activity-instances/${activityId}/check-out`, {
    method: 'POST',
    token,
    body: { latitude: lat, longitude: lng, deviceTimestamp: new Date().toISOString() },
  });

  console.log('\nDone. The Danapur Cantt Market visit is complete and should now be in the');
  console.log('Approvals page, Pending tab — refresh it in your browser to see it.');
}

main().catch((err) => {
  console.error('\nSomething went wrong:', err.message);
  process.exit(1);
});
