#!/usr/bin/env node
// One-off testing helper: plays out a complete field visit (check-in -> photo -> form ->
// check-out) against your own already-running local backend, using the real API endpoints —
// nothing here is faked at the database level, it just does the same steps the phone app would.
// Exists because testing without a phone in hand still needs a way to put a fresh item in the
// supervisor's Approvals queue. Run with: node backend/scripts/simulate-field-visit.mjs
//
// Flags:
//   --resubmit   just logs in and resubmits an already-rejected Danapur visit (for the reject ->
//                resubmit -> approve loop, doesn't redo check-in/photo/form).
//   --deviation  logs in, checks in if needed, sends a GPS reading well outside the campaign's
//                tolerance, and submits a deviation request — puts a fresh item in the new
//                Deviations page, Pending review tab (Stage 4.1).
//   --device-risk  logs in, sends two GPS readings 6.6km apart 10 seconds apart (an impossible
//                  jump) to flag the test device — puts a fresh item on the Device Risk page
//                  (S4.2). Safe to re-run any time, doesn't need a check-in first.
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

async function resubmitOnly() {
  log('1/3', `Requesting OTP for ${MOBILE_NUMBER}...`);
  const otp = await api('/auth/otp/request', { method: 'POST', body: { mobileNumber: MOBILE_NUMBER } });
  if (!otp.devOtpCode) throw new Error('No dev OTP code returned — is OTP_PROVIDER set to something other than "mock"?');

  log('2/3', 'Verifying OTP and logging in...');
  const auth = await api('/auth/otp/verify', {
    method: 'POST',
    body: {
      challengeId: otp.challengeId,
      code: otp.devOtpCode,
      device: { fingerprint: DEVICE_FINGERPRINT, model: 'Simulated test device', osVersion: 'N/A', appVersion: 'script' },
    },
  });
  const token = auth.accessToken;
  log('2/3', `Logged in as ${auth.user.fullName}.`);

  const assignments = await api('/me/assignments', { token });
  let assignment = assignments.find((a) => a.pjpRow?.locationName === TARGET_LOCATION);
  if (!assignment) {
    // Once checked out, an assignment can drop out of /me/assignments (status no longer
    // ASSIGNED/IN_PROGRESS) — fall back to re-deriving the activity via getOrCreateActivity,
    // which is safe to call again since it always returns the existing activity if one exists.
    throw new Error(
      `Could not find "${TARGET_LOCATION}" in your active assignments — if it's already been ` +
        `checked out, this script doesn't currently have another way to find its activity ID. ` +
        `Tell Claude and this can be extended.`,
    );
  }
  const campaignId = assignment.campaign.id;
  const bundle = await api(`/campaigns/${campaignId}/assignments/${assignment.id}/activity`, { token });

  log('3/3', 'Resubmitting for review...');
  await api(`/campaigns/${campaignId}/activity-instances/${bundle.activity.id}/resubmit`, { method: 'POST', token });

  console.log('\nDone. Danapur Cantt Market has been resubmitted and should be back in the');
  console.log('Approvals page, Pending tab — refresh it in your browser to see it.');
}

async function deviationOnly() {
  log('1/4', `Requesting OTP for ${MOBILE_NUMBER}...`);
  const otp = await api('/auth/otp/request', { method: 'POST', body: { mobileNumber: MOBILE_NUMBER } });
  if (!otp.devOtpCode) throw new Error('No dev OTP code returned — is OTP_PROVIDER set to something other than "mock"?');

  log('2/4', 'Verifying OTP and logging in...');
  const auth = await api('/auth/otp/verify', {
    method: 'POST',
    body: {
      challengeId: otp.challengeId,
      code: otp.devOtpCode,
      device: { fingerprint: DEVICE_FINGERPRINT, model: 'Simulated test device', osVersion: 'N/A', appVersion: 'script' },
    },
  });
  const token = auth.accessToken;
  log('2/4', `Logged in as ${auth.user.fullName}.`);

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

  log('3/4', 'Opening the activity, checking in if needed, and sending a GPS reading well outside the tolerance...');
  const bundle = await api(`/campaigns/${campaignId}/assignments/${assignment.id}/activity`, { token });
  const activityId = bundle.activity.id;
  if (!bundle.checkIn) {
    await api(`/campaigns/${campaignId}/activity-instances/${activityId}/check-in`, {
      method: 'POST',
      token,
      body: { latitude: lat, longitude: lng, accuracyMeters: 8, deviceTimestamp: new Date().toISOString() },
    });
  }
  // ~1.5km north of the planned point — comfortably past every campaign's default 250m tolerance.
  const farLat = lat + 0.0135;
  await api(`/campaigns/${campaignId}/activity-instances/${activityId}/gps-points`, {
    method: 'POST',
    token,
    body: { points: [{ latitude: farLat, longitude: lng, accuracyMeters: 10, speedKmh: 12, recordedAt: new Date().toISOString() }] },
  });

  log('4/4', 'Submitting a deviation request explaining the off-plan location...');
  await api(`/campaigns/${campaignId}/activity-instances/${activityId}/deviation-requests`, {
    method: 'POST',
    token,
    body: {
      deviationType: 'OUTSIDE_PERMITTED_RADIUS',
      reason: 'Simulated: market relocated for the day, testing the deviation review screen.',
      remarks: 'Generated by simulate-field-visit.mjs --deviation',
      distanceMeters: 1500,
    },
  });

  console.log('\nDone. A deviation request for Danapur Cantt Market has been submitted and should');
  console.log('now be in the Deviations page, Pending review tab — refresh it in your browser to see it.');
}

async function deviceRiskOnly() {
  log('1/3', `Requesting OTP for ${MOBILE_NUMBER}...`);
  const otp = await api('/auth/otp/request', { method: 'POST', body: { mobileNumber: MOBILE_NUMBER } });
  if (!otp.devOtpCode) throw new Error('No dev OTP code returned — is OTP_PROVIDER set to something other than "mock"?');

  log('2/3', 'Verifying OTP and logging in...');
  const auth = await api('/auth/otp/verify', {
    method: 'POST',
    body: {
      challengeId: otp.challengeId,
      code: otp.devOtpCode,
      device: { fingerprint: DEVICE_FINGERPRINT, model: 'Simulated test device', osVersion: 'N/A', appVersion: 'script' },
    },
  });
  const token = auth.accessToken;
  log('2/3', `Logged in as ${auth.user.fullName}.`);

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

  log('3/3', 'Sending two GPS readings 6.6km apart, 10 seconds apart (an impossible jump)...');
  // GPS ingestion works whether or not the activity is checked in/out (see Stage 4.2's device-risk
  // service — it deliberately doesn't gate telemetry, only starting/completing the activity), so
  // this doesn't need check-in first and can be re-run any time to generate a fresh test signal.
  const bundle = await api(`/campaigns/${campaignId}/assignments/${assignment.id}/activity`, { token });
  const activityId = bundle.activity.id;
  const now = Date.now();
  await api(`/campaigns/${campaignId}/activity-instances/${activityId}/gps-points`, {
    method: 'POST',
    token,
    body: {
      points: [
        { latitude: lat, longitude: lng, accuracyMeters: 8, speedKmh: 5, recordedAt: new Date(now).toISOString() },
        { latitude: lat + 0.06, longitude: lng + 0.06, accuracyMeters: 10, speedKmh: 8, recordedAt: new Date(now + 10000).toISOString() },
      ],
    },
  });

  console.log('\nDone. This device should now be flagged — open the Device Risk page in the web');
  console.log('admin (needs the "block" permission, e.g. log in as Rohan Mehta) to review it.');
}

async function main() {
  if (process.argv.includes('--resubmit')) {
    return resubmitOnly();
  }
  if (process.argv.includes('--deviation')) {
    return deviationOnly();
  }
  if (process.argv.includes('--device-risk')) {
    return deviceRiskOnly();
  }

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
