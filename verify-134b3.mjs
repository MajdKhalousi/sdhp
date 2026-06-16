/**
 * Verification script for Phase 134B3 — Nurse Triage Backend
 *
 * Tests:
 *  1. PATCH /v1/queue/:id/triage as NURSE → 200, triage data stored
 *  2. PATCH /v1/queue/:id/triage as ORG_ADMIN → 200
 *  3. PATCH /v1/queue/:id/triage as SUPER_ADMIN → 200
 *  4. PATCH /v1/queue/:id/triage as SECRETARY → 403
 *  5. PATCH /v1/queue/:id/triage as DOCTOR → 403
 *  6. PATCH /v1/queue/unknown/triage → 404
 *  7. Triage does not change queue status
 *  8. GET /v1/queue/:id returns triageVitals and chiefComplaintDraft fields
 *  9. POST /v1/encounters with appointmentId, no vitals in DTO → vitals prefilled from triage
 * 10. POST /v1/encounters with appointmentId, no chiefComplaint → chiefComplaint prefilled
 * 11. POST /v1/encounters with explicit dto.vitals → DTO vitals win
 * 12. POST /v1/encounters with explicit dto.chiefComplaint → DTO chiefComplaint wins
 * 13. POST /v1/encounters with no triage data on queue → encounter.vitals null, no error
 */

import { execSync } from 'child_process';

const BASE = 'http://localhost:3001/api/v1';

// ── helpers ────────────────────────────────────────────────────────────────

async function request(method, path, token, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let json;
  try { json = await res.json(); } catch { json = null; }
  return { status: res.status, body: json };
}

async function login(phone, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  const j = await res.json();
  if (!j.accessToken) throw new Error(`Login failed for ${phone}: ${JSON.stringify(j)}`);
  return j.accessToken;
}

const pass = (label) => console.log(`  ✅ ${label}`);
const fail = (label, detail) => { console.log(`  ❌ ${label}`); console.log(`     ${detail}`); failed.push(label); };
const failed = [];

// ── fetch tokens ──────────────────────────────────────────────────────────

console.log('\n── Fetching tokens ──');
const [nurseToken, orgAdminToken, secretaryToken, doctorToken] = await Promise.all([
  login('+963912003001', 'password123'),
  login('+963912345678', 'password123'),
  login('+963912002001', 'password123'),
  login('+963912001001', 'password123'),
]);

// Decode org from token (simple base64 decode of payload)
function decodeOrg(token) {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  return payload;
}

const adminPayload = decodeOrg(orgAdminToken);
console.log(`  Org: ${adminPayload.organizationId}`);

// SUPER_ADMIN token — try env var, otherwise skip super_admin tests
let superToken = null;
try {
  superToken = await login('+963900000001', 'password123');
  console.log('  SUPER_ADMIN token acquired');
} catch {
  console.log('  SUPER_ADMIN credentials not found — skipping SUPER_ADMIN test');
}

// ── create a test appointment + queue entry ────────────────────────────────

console.log('\n── Setting up test data ──');

// Find a patient
const patientsRes = await request('GET', `/patients?limit=1`, orgAdminToken);
if (!patientsRes.body?.data?.length) {
  console.log('❌ No patients found — cannot run tests');
  process.exit(1);
}
const patient = patientsRes.body.data[0];
console.log(`  Patient: ${patient.firstName} ${patient.lastName} (${patient.id})`);

// Find a doctor
const doctorsRes = await request('GET', `/doctors?limit=1`, orgAdminToken);
if (!doctorsRes.body?.data?.length) {
  console.log('❌ No doctors found — cannot run tests');
  process.exit(1);
}
const doctor = doctorsRes.body.data[0];
console.log(`  Doctor: ${doctor.user.firstName} ${doctor.user.lastName} (${doctor.id})`);

// Schedule at 10:00 AM Damascus time tomorrow (UTC+3 → 07:00 UTC)
// Ensures time is within working hours (08:00–17:00) regardless of when test runs.
const damascusTomorrow = new Date();
damascusTomorrow.setUTCDate(damascusTomorrow.getUTCDate() + 1);
damascusTomorrow.setUTCHours(7, 0, 0, 0); // 07:00 UTC = 10:00 Damascus
const scheduledAt = damascusTomorrow.toISOString();
const apptRes = await request('POST', '/appointments', orgAdminToken, {
  patientId: patient.id,
  doctorId: doctor.id,
  scheduledAt,
  durationMin: 15,
  notes: '134B3 test appointment',
});
if (apptRes.status !== 201) {
  console.log(`❌ Failed to create appointment: ${JSON.stringify(apptRes.body)}`);
  process.exit(1);
}
const appointment = apptRes.body;
console.log(`  Appointment: ${appointment.id} (status: ${appointment.status})`);

// Check in → create queue entry
const queueRes = await request('POST', '/queue', orgAdminToken, { appointmentId: appointment.id });
if (queueRes.status !== 201) {
  console.log(`❌ Failed to create queue entry: ${JSON.stringify(queueRes.body)}`);
  process.exit(1);
}
const queueEntry = queueRes.body;
console.log(`  Queue entry: ${queueEntry.id} (ticket #${queueEntry.ticketNumber})`);

// ── Create a second appointment for encounter prefill tests ────────────────

// Appts 2–4 at 10:15, 10:30, 10:45 Damascus tomorrow
const makeApptTime = (offsetMin) => {
  const d = new Date(damascusTomorrow);
  d.setUTCMinutes(d.getUTCMinutes() + offsetMin);
  return d.toISOString();
};

const appt2Res = await request('POST', '/appointments', orgAdminToken, {
  patientId: patient.id,
  doctorId: doctor.id,
  scheduledAt: makeApptTime(15),
  durationMin: 15,
  notes: '134B3 encounter prefill test',
});
const appointment2 = appt2Res.body;
if (!appointment2.id) { console.log('❌ Appt2 failed:', JSON.stringify(appt2Res.body)); process.exit(1); }
const queue2Res = await request('POST', '/queue', orgAdminToken, { appointmentId: appointment2.id });
const queueEntry2 = queue2Res.body;
console.log(`  Queue entry 2 (for encounter tests): ${queueEntry2.id}`);

const appt3Res = await request('POST', '/appointments', orgAdminToken, {
  patientId: patient.id,
  doctorId: doctor.id,
  scheduledAt: makeApptTime(30),
  durationMin: 15,
});
const appointment3 = appt3Res.body;
if (!appointment3.id) { console.log('❌ Appt3 failed:', JSON.stringify(appt3Res.body)); process.exit(1); }
const queue3Res = await request('POST', '/queue', orgAdminToken, { appointmentId: appointment3.id });
const queueEntry3 = queue3Res.body;
console.log(`  Queue entry 3 (for DTO-wins tests): ${queueEntry3.id}`);

const appt4Res = await request('POST', '/appointments', orgAdminToken, {
  patientId: patient.id,
  doctorId: doctor.id,
  scheduledAt: makeApptTime(45),
  durationMin: 15,
});
const appointment4 = appt4Res.body;
if (!appointment4.id) { console.log('❌ Appt4 failed:', JSON.stringify(appt4Res.body)); process.exit(1); }
const queue4Res = await request('POST', '/queue', orgAdminToken, { appointmentId: appointment4.id });
const queueEntry4 = queue4Res.body;
console.log(`  Queue entry 4 (no-triage baseline): ${queueEntry4.id}`);

// ── Tests ──────────────────────────────────────────────────────────────────

const TRIAGE_BODY = {
  triageVitals: {
    temperature: '37.2',
    bloodPressure: '120/80',
    heartRate: '72',
    oxygenSaturation: '98',
    respiratoryRate: '16',
    weight: '75',
    height: '175',
  },
  chiefComplaintDraft: 'Acute abdominal pain since morning — nurse triage',
};

console.log('\n── Test 1: NURSE can PATCH triage ──');
const t1 = await request('PATCH', `/queue/${queueEntry.id}/triage`, nurseToken, TRIAGE_BODY);
if (t1.status === 200 &&
  t1.body?.triageVitals?.temperature === '37.2' &&
  t1.body?.triageVitals?.bloodPressure === '120/80' &&
  t1.body?.chiefComplaintDraft === TRIAGE_BODY.chiefComplaintDraft) {
  pass('NURSE can record triage → 200, triageVitals and chiefComplaintDraft stored');
} else {
  fail('NURSE can record triage', `status=${t1.status} body=${JSON.stringify(t1.body)}`);
}

console.log('\n── Test 2: ORG_ADMIN can PATCH triage ──');
const t2 = await request('PATCH', `/queue/${queueEntry.id}/triage`, orgAdminToken, {
  triageVitals: { temperature: '37.5' },
  chiefComplaintDraft: 'Updated by admin',
});
if (t2.status === 200 && t2.body?.triageVitals?.temperature === '37.5') {
  pass('ORG_ADMIN can record triage → 200');
} else {
  fail('ORG_ADMIN triage', `status=${t2.status} body=${JSON.stringify(t2.body)}`);
}

console.log('\n── Test 3: SUPER_ADMIN can PATCH triage ──');
if (superToken) {
  const t3 = await request('PATCH', `/queue/${queueEntry.id}/triage`, superToken, { triageVitals: { weight: '80' } });
  if (t3.status === 200) {
    pass('SUPER_ADMIN can record triage → 200');
  } else {
    fail('SUPER_ADMIN triage', `status=${t3.status} body=${JSON.stringify(t3.body)}`);
  }
} else {
  console.log('  ⏭  SKIPPED — no SUPER_ADMIN credentials');
}

console.log('\n── Test 4: SECRETARY gets 403 ──');
const t4 = await request('PATCH', `/queue/${queueEntry.id}/triage`, secretaryToken, TRIAGE_BODY);
if (t4.status === 403) {
  pass('SECRETARY → 403 Forbidden');
} else {
  fail('SECRETARY should be blocked', `status=${t4.status}`);
}

console.log('\n── Test 5: DOCTOR gets 403 ──');
const t5 = await request('PATCH', `/queue/${queueEntry.id}/triage`, doctorToken, TRIAGE_BODY);
if (t5.status === 403) {
  pass('DOCTOR → 403 Forbidden');
} else {
  fail('DOCTOR should be blocked', `status=${t5.status}`);
}

console.log('\n── Test 6: Unknown ID → 404 ──');
const t6 = await request('PATCH', `/queue/nonexistent-id-abc123/triage`, nurseToken, TRIAGE_BODY);
if (t6.status === 404) {
  pass('Unknown queue entry → 404');
} else {
  fail('Unknown ID should be 404', `status=${t6.status}`);
}

console.log('\n── Test 7: Triage does NOT change queue status ──');
const t7check = await request('GET', `/queue/${queueEntry.id}`, nurseToken);
if (t7check.body?.status === 'WAITING') {
  pass('Queue status remains WAITING after triage writes');
} else {
  fail('Triage should not change status', `status=${t7check.body?.status}`);
}

console.log('\n── Test 8: GET /queue/:id returns triage fields ──');
const t8 = await request('GET', `/queue/${queueEntry.id}`, nurseToken);
if (t8.body?.triageVitals !== undefined && t8.body?.chiefComplaintDraft !== undefined) {
  pass(`GET /queue/:id includes triageVitals and chiefComplaintDraft (vitals: ${JSON.stringify(t8.body.triageVitals)})`);
} else {
  fail('GET /queue/:id missing triage fields', JSON.stringify(t8.body));
}

// Pre-populate triage on queue entry 2 for encounter prefill tests
await request('PATCH', `/queue/${queueEntry2.id}/triage`, nurseToken, TRIAGE_BODY);

console.log('\n── Test 9: Encounter created with no vitals → prefilled from triage ──');
// Use ORG_ADMIN token — avoids DOCTOR "own profile only" restriction during tests
const t9 = await request('POST', '/encounters', orgAdminToken, {
  patientId: patient.id,
  doctorId: doctor.id,
  appointmentId: appointment2.id,
  // No vitals, no chiefComplaint in DTO
});
if (t9.status === 201 &&
  t9.body?.vitals?.temperature === '37.2' &&
  t9.body?.vitals?.bloodPressure === '120/80' &&
  t9.body?.chiefComplaint === TRIAGE_BODY.chiefComplaintDraft) {
  pass(`Encounter vitals prefilled from triage (temp=${t9.body.vitals.temperature}, bp=${t9.body.vitals.bloodPressure})`);
  pass(`Encounter chiefComplaint prefilled from triage: "${t9.body.chiefComplaint}"`);
} else {
  fail('Encounter prefill from triage', `status=${t9.status} vitals=${JSON.stringify(t9.body?.vitals)} chiefComplaint="${t9.body?.chiefComplaint}"`);
}

// Pre-populate triage on queue entry 3 for DTO-wins tests
await request('PATCH', `/queue/${queueEntry3.id}/triage`, nurseToken, TRIAGE_BODY);

console.log('\n── Tests 11-12: Encounter with explicit DTO fields → DTO wins ──');
const EXPLICIT_VITALS = { temperature: '38.9', bloodPressure: '140/90', heartRate: '95' };
const EXPLICIT_COMPLAINT = 'Doctor-entered chief complaint — overrides triage';
const t11 = await request('POST', '/encounters', orgAdminToken, {
  patientId: patient.id,
  doctorId: doctor.id,
  appointmentId: appointment3.id,
  vitals: EXPLICIT_VITALS,
  chiefComplaint: EXPLICIT_COMPLAINT,
});
if (t11.status === 201) {
  if (t11.body?.vitals?.temperature === '38.9' && t11.body?.vitals?.bloodPressure === '140/90') {
    pass('DTO vitals win over triage vitals (temp=38.9, bp=140/90)');
  } else {
    fail('DTO vitals should override triage', `vitals=${JSON.stringify(t11.body?.vitals)}`);
  }
  if (t11.body?.chiefComplaint === EXPLICIT_COMPLAINT) {
    pass('DTO chiefComplaint wins over triage chiefComplaintDraft');
  } else {
    fail('DTO chiefComplaint should override triage', `got="${t11.body?.chiefComplaint}"`);
  }
} else {
  fail('Encounter with explicit DTO fields', `status=${t11.status} body=${JSON.stringify(t11.body)}`);
}

console.log('\n── Test 13: Encounter with no triage data → vitals null, no error ──');
const t13 = await request('POST', '/encounters', orgAdminToken, {
  patientId: patient.id,
  doctorId: doctor.id,
  appointmentId: appointment4.id,
  // No vitals in DTO, no triage on queue entry 4
});
if (t13.status === 201 && t13.body?.vitals === null) {
  pass('No triage → encounter created, vitals=null, no error');
} else if (t13.status === 201 && t13.body?.vitals === undefined) {
  pass('No triage → encounter created, vitals=null/undefined, no error');
} else {
  fail('Encounter without triage', `status=${t13.status} vitals=${JSON.stringify(t13.body?.vitals)}`);
}

console.log('\n── Security: no passwordHash in any triage response ──');
const secCheck = await request('GET', `/queue/${queueEntry.id}`, nurseToken);
const bodyStr = JSON.stringify(secCheck.body);
if (!bodyStr.includes('passwordHash')) {
  pass('No passwordHash in triage queue response');
} else {
  fail('passwordHash leaked in response', bodyStr.slice(0, 200));
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log('\n──────────────────────────────────────────');
if (failed.length === 0) {
  const total = 13 + (superToken ? 1 : 0);
  console.log(`✅ ALL TESTS PASSED (${total} checks)`);
} else {
  console.log(`❌ ${failed.length} test(s) FAILED:`);
  failed.forEach(f => console.log(`   - ${f}`));
  process.exit(1);
}
