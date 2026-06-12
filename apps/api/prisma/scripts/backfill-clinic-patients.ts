import { PrismaClient, ClinicPatientLinkType, ClinicPatientStatus } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

async function main(): Promise<void> {
  console.log(isDryRun ? '[DRY RUN] Starting backfill scan...' : 'Starting backfill...');
  console.log('');

  // ── Fetch all patients ordered by creation date ──────────────────────────────
  const patients = await prisma.patient.findMany({
    orderBy: { createdAt: 'asc' },
  });

  // ── Latest encounter startedAt per patient (single query) ────────────────────
  const lastVisitRows = await prisma.$queryRaw<Array<{ patientId: string; lastVisitAt: Date | null }>>`
    SELECT "patientId", MAX("startedAt") AS "lastVisitAt"
    FROM encounters
    GROUP BY "patientId"
  `;
  const lastVisitMap = new Map<string, Date>(
    lastVisitRows
      .filter((r): r is { patientId: string; lastVisitAt: Date } => r.lastVisitAt !== null)
      .map(r => [r.patientId, r.lastVisitAt]),
  );

  // ── Existing ClinicPatient rows (for explicit skip detection) ─────────────────
  const existingLinks = await prisma.clinicPatient.findMany({
    select: { organizationId: true, patientId: true },
  });
  const existingLinkSet = new Set<string>(
    existingLinks.map(l => `${l.organizationId}:${l.patientId}`),
  );

  // ── Pre-check: duplicate (organizationId, mrn) in patient set ────────────────
  const seenMrnKeys = new Set<string>();
  const dupMrns: string[] = [];
  for (const p of patients) {
    const key = `${p.organizationId}:${p.mrn}`;
    if (seenMrnKeys.has(key)) {
      dupMrns.push(`Patient ${p.id} | org: ${p.organizationId} | MRN: ${p.mrn} — duplicate key`);
    } else {
      seenMrnKeys.add(key);
    }
  }

  // ── Per-row processing ───────────────────────────────────────────────────────
  let wouldCreate = 0;
  let wouldSkip = 0;
  let softDeleted = 0;
  let missingOrg = 0;
  let missingMrn = 0;
  let rowErrors = 0;
  const criticalMessages: string[] = [];

  console.log(`Scanning ${patients.length} patients...\n`);

  for (const patient of patients) {
    const isDeleted = patient.deletedAt !== null;
    if (isDeleted) softDeleted++;

    // Critical: missing organizationId
    if (!patient.organizationId) {
      missingOrg++;
      const msg = `Patient ${patient.id}: missing organizationId`;
      criticalMessages.push(msg);
      console.log(`  [ERROR ] ${patient.id} | missing organizationId`);
      rowErrors++;
      continue;
    }

    // Critical: missing/blank mrn
    if (!patient.mrn || patient.mrn.trim() === '') {
      missingMrn++;
      const msg = `Patient ${patient.id}: missing or blank mrn`;
      criticalMessages.push(msg);
      console.log(`  [ERROR ] ${patient.id} | missing/blank mrn`);
      rowErrors++;
      continue;
    }

    const linkKey = `${patient.organizationId}:${patient.id}`;

    if (existingLinkSet.has(linkKey)) {
      wouldSkip++;
      console.log(
        `  [skip  ] ${patient.id} | org: ${patient.organizationId} | MRN: ${patient.mrn} | link already exists`,
      );
      continue;
    }

    // This patient would be / will be created
    wouldCreate++;
    const lastVisitAt = lastVisitMap.get(patient.id) ?? null;
    const lastVisitStr = lastVisitAt ? lastVisitAt.toISOString().split('T')[0] : 'null';
    console.log(
      `  [create] ${patient.id} | org: ${patient.organizationId} | MRN: ${patient.mrn} | lastVisitAt: ${lastVisitStr}`,
    );

    if (!isDryRun) {
      try {
        await prisma.clinicPatient.create({
          data: {
            organizationId:        patient.organizationId,
            patientId:             patient.id,
            mrn:                   patient.mrn,
            localNotes:            patient.notes ?? null,
            linkType:              ClinicPatientLinkType.IMPORTED,
            status:                ClinicPatientStatus.ACTIVE,
            consentGiven:          true,
            consentAt:             patient.createdAt,
            linkedAt:              patient.createdAt,
            linkedById:            null,
            lastVisitAt:           lastVisitAt ?? null,
            deletedAt:             null,
            registrationSource:    null,
            verificationCodeHash:  null,
            verificationExpiresAt: null,
          },
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`  [ERROR ] ${patient.id} | DB error: ${msg}`);
        rowErrors++;
        criticalMessages.push(`Patient ${patient.id}: ${msg}`);
      }
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  const projectedFinal = existingLinks.length + wouldCreate;

  console.log('');
  console.log('══════════════════════════════════════════════');
  console.log(isDryRun ? '[DRY RUN] Summary' : 'Summary');
  console.log('══════════════════════════════════════════════');
  console.log(`  Patients scanned            : ${patients.length}`);
  console.log(`  ${isDryRun ? 'Would create             ' : 'Created                  '} : ${wouldCreate}`);
  console.log(`  ${isDryRun ? 'Would skip (exists)      ' : 'Skipped (exists)         '} : ${wouldSkip}`);
  console.log(`  Soft-deleted patients        : ${softDeleted}`);
  console.log(`  Missing organizationId       : ${missingOrg}`);
  console.log(`  Missing/blank MRN            : ${missingMrn}`);
  console.log(`  Duplicate org+MRN conflicts  : ${dupMrns.length}`);
  console.log(`  Errors/skipped               : ${rowErrors}`);
  console.log(`  Existing ClinicPatient rows  : ${existingLinks.length}`);
  console.log(`  Projected final count        : ${projectedFinal}`);
  console.log('══════════════════════════════════════════════');

  // ── Write-mode post-verification ─────────────────────────────────────────────
  if (!isDryRun) {
    console.log('');
    console.log('Verification');
    const finalCount = await prisma.clinicPatient.count();
    const unlinkedRows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count
      FROM patients p
      LEFT JOIN clinic_patients cp ON cp."patientId" = p.id
      WHERE cp.id IS NULL
    `;
    const unlinkedCount = Number(unlinkedRows[0].count);
    console.log(`  clinic_patients rows         : ${finalCount}`);
    console.log(`  Patients without a link      : ${unlinkedCount}`);
    if (unlinkedCount > 0) {
      criticalMessages.push(`${unlinkedCount} patients have no ClinicPatient link after backfill`);
    }
  }

  // ── Exit non-zero on any critical condition ───────────────────────────────────
  const hasCritical =
    criticalMessages.length > 0 ||
    dupMrns.length > 0 ||
    missingOrg > 0 ||
    missingMrn > 0;

  if (hasCritical) {
    console.log('');
    console.log('CRITICAL ERRORS — backfill cannot proceed safely:');
    [...criticalMessages, ...dupMrns].forEach(e => console.log(`  ✗ ${e}`));
    process.exit(1);
  }

  console.log('');
  console.log(isDryRun ? '[DRY RUN] Complete. No writes were performed.' : 'Backfill complete.');
}

main()
  .catch(err => {
    console.error('FATAL:', err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
