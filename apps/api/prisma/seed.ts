import {
  PrismaClient,
  UserRole,
  Gender,
  AppointmentStatus,
  QueueStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function daysAgo(n: number, hour = 9, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function todayAt(hour = 9, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // ── Organizations ──────────────────────────────────────────────────────────
  await prisma.organization.upsert({
    where: { id: 'seed-org-001' },
    update: { name: 'Al-Nour Medical Center', nameAr: 'مركز النور الطبي' },
    create: {
      id: 'seed-org-001',
      name: 'Al-Nour Medical Center',
      nameAr: 'مركز النور الطبي',
      type: 'HOSPITAL',
      phone: '+963112000000',
      address: '14 Al-Jalaa Street, Mazzeh, Damascus, Syria',
    },
  });

  await prisma.organization.upsert({
    where: { id: 'seed-org-002' },
    update: {},
    create: {
      id: 'seed-org-002',
      name: 'Aleppo Clinic',
      nameAr: 'عيادة حلب',
      type: 'CLINIC',
    },
  });

  // ── Branches ───────────────────────────────────────────────────────────────
  await prisma.branch.upsert({
    where: { id: 'seed-branch-001' },
    update: {},
    create: {
      id: 'seed-branch-001',
      organizationId: 'seed-org-001',
      name: 'Damascus Main Branch',
      nameAr: 'الفرع الرئيسي - دمشق',
      address: '14 Al-Jalaa Street, Mazzeh, Damascus',
      phone: '+963112000001',
    },
  });

  await prisma.branch.upsert({
    where: { id: 'seed-branch-002' },
    update: {},
    create: {
      id: 'seed-branch-002',
      organizationId: 'seed-org-001',
      name: 'Damascus South Branch',
      nameAr: 'فرع دمشق الجنوبي',
      address: 'Kafar Sousa District, Damascus',
      phone: '+963112000002',
    },
  });

  await prisma.branch.upsert({
    where: { id: 'seed-branch-003' },
    update: { deletedAt: null, isActive: true },
    create: {
      id: 'seed-branch-003',
      organizationId: 'seed-org-002',
      name: 'Aleppo Main Branch',
      nameAr: 'الفرع الرئيسي - حلب',
      address: 'Al-Zahraa Street, Aleppo',
      phone: '+963212000001',
    },
  });

  // ── Departments ────────────────────────────────────────────────────────────
  await prisma.department.upsert({
    where: { id: 'seed-dept-001' },
    update: { name: 'Cardiology', nameAr: 'قسم القلبية' },
    create: {
      id: 'seed-dept-001',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      name: 'Cardiology',
      nameAr: 'قسم القلبية',
      code: 'CARD',
    },
  });

  await prisma.department.upsert({
    where: { id: 'seed-dept-002' },
    update: { name: 'General Medicine', nameAr: 'الطب العام' },
    create: {
      id: 'seed-dept-002',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      name: 'General Medicine',
      nameAr: 'الطب العام',
      code: 'GM',
    },
  });

  await prisma.department.upsert({
    where: { id: 'seed-dept-006' },
    update: {},
    create: {
      id: 'seed-dept-006',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      name: 'Pediatrics',
      nameAr: 'طب الأطفال',
      code: 'PED',
    },
  });

  await prisma.department.upsert({
    where: { id: 'seed-dept-003' },
    update: { deletedAt: null, isActive: true },
    create: {
      id: 'seed-dept-003',
      organizationId: 'seed-org-002',
      branchId: 'seed-branch-003',
      name: 'Pediatrics',
      nameAr: 'طب الأطفال',
      code: 'PED',
    },
  });

  // ── Demo Users ─────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { phone: '+963900000001' },
    update: {},
    create: {
      phone: '+963900000001',
      email: 'superadmin@sdhp.sy',
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      organizationId: 'seed-org-001',
    },
  });

  await prisma.user.upsert({
    where: { phone: '+963912345678' },
    update: { firstName: 'Ahmad', lastName: 'Khalil' },
    create: {
      phone: '+963912345678',
      email: 'admin@alnour.sy',
      passwordHash,
      firstName: 'Ahmad',
      lastName: 'Khalil',
      role: UserRole.ORG_ADMIN,
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
    },
  });

  await prisma.user.upsert({
    where: { phone: '+963912002001' },
    update: {},
    create: {
      phone: '+963912002001',
      email: 'reception@alnour.sy',
      passwordHash,
      firstName: 'Sara',
      lastName: 'Qassem',
      role: UserRole.SECRETARY,
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
    },
  });

  // Doctor users
  const drSamerUser = await prisma.user.upsert({
    where: { phone: '+963912001001' },
    update: { firstName: 'Samer', lastName: 'Hassan', role: UserRole.DOCTOR },
    create: {
      phone: '+963912001001',
      email: 'samer.hassan@alnour.sy',
      passwordHash,
      firstName: 'Samer',
      lastName: 'Hassan',
      role: UserRole.DOCTOR,
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
    },
  });

  const drLaylaUser = await prisma.user.upsert({
    where: { phone: '+963912001002' },
    update: { firstName: 'Layla', lastName: 'Nasser', role: UserRole.DOCTOR },
    create: {
      phone: '+963912001002',
      email: 'layla.nasser@alnour.sy',
      passwordHash,
      firstName: 'Layla',
      lastName: 'Nasser',
      role: UserRole.DOCTOR,
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
    },
  });

  const drOmarUser = await prisma.user.upsert({
    where: { phone: '+963912001003' },
    update: { firstName: 'Omar', lastName: 'Saleh', role: UserRole.DOCTOR },
    create: {
      phone: '+963912001003',
      email: 'omar.saleh@alnour.sy',
      passwordHash,
      firstName: 'Omar',
      lastName: 'Saleh',
      role: UserRole.DOCTOR,
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
    },
  });

  // ── Doctor Profiles ────────────────────────────────────────────────────────
  const doctorSamer = await prisma.doctor.upsert({
    where: { userId: drSamerUser.id },
    update: {
      departmentId: 'seed-dept-001',
      specialization: 'Cardiology',
      licenseNumber: 'SY-CARD-2018-0421',
    },
    create: {
      userId: drSamerUser.id,
      departmentId: 'seed-dept-001',
      specialization: 'Cardiology',
      licenseNumber: 'SY-CARD-2018-0421',
      consultationMinutes: 20,
      maxPatientsPerDay: 25,
    },
  });

  const doctorLayla = await prisma.doctor.upsert({
    where: { userId: drLaylaUser.id },
    update: {
      departmentId: 'seed-dept-006',
      specialization: 'Pediatrics',
      licenseNumber: 'SY-PED-2020-0873',
    },
    create: {
      userId: drLaylaUser.id,
      departmentId: 'seed-dept-006',
      specialization: 'Pediatrics',
      licenseNumber: 'SY-PED-2020-0873',
      consultationMinutes: 15,
      maxPatientsPerDay: 30,
    },
  });

  const doctorOmar = await prisma.doctor.upsert({
    where: { userId: drOmarUser.id },
    update: {
      departmentId: 'seed-dept-002',
      specialization: 'General Medicine',
      licenseNumber: 'SY-GM-2015-0212',
    },
    create: {
      userId: drOmarUser.id,
      departmentId: 'seed-dept-002',
      specialization: 'General Medicine',
      licenseNumber: 'SY-GM-2015-0212',
      consultationMinutes: 20,
      maxPatientsPerDay: 30,
    },
  });

  // ── Patients ───────────────────────────────────────────────────────────────
  const saraMahmoud = await prisma.patient.upsert({
    where: { organizationId_mrn: { organizationId: 'seed-org-001', mrn: 'MRN-001' } },
    update: { firstName: 'Sara', lastName: 'Mahmoud', phone: '+963912100001', gender: Gender.FEMALE },
    create: {
      id: 'seed-pat-sara',
      organizationId: 'seed-org-001',
      mrn: 'MRN-001',
      firstName: 'Sara',
      lastName: 'Mahmoud',
      dateOfBirth: new Date('1992-03-14'),
      gender: Gender.FEMALE,
      phone: '+963912100001',
      address: 'Bab Touma, Damascus',
    },
  });

  const khalidMousa = await prisma.patient.upsert({
    where: { id: 'seed-pat-001' },
    update: {},
    create: {
      id: 'seed-pat-001',
      organizationId: 'seed-org-001',
      mrn: 'MRN-002',
      firstName: 'Khalid',
      lastName: 'Mousa',
      dateOfBirth: new Date('1981-03-15'),
      gender: Gender.MALE,
      phone: '+963912100002',
      address: 'Mazzeh, Damascus',
      bloodType: 'B+',
      emergencyName: 'Fatima Mousa',
      emergencyPhone: '+963912100020',
    },
  });

  const nourIbrahim = await prisma.patient.upsert({
    where: { id: 'seed-pat-002' },
    update: {},
    create: {
      id: 'seed-pat-002',
      organizationId: 'seed-org-001',
      mrn: 'MRN-003',
      firstName: 'Nour',
      lastName: 'Ibrahim',
      dateOfBirth: new Date('1994-07-22'),
      gender: Gender.FEMALE,
      phone: '+963912100003',
      bloodType: 'A+',
    },
  });

  const tariqSaleh = await prisma.patient.upsert({
    where: { id: 'seed-pat-003' },
    update: {},
    create: {
      id: 'seed-pat-003',
      organizationId: 'seed-org-001',
      mrn: 'MRN-004',
      firstName: 'Tariq',
      lastName: 'Saleh',
      dateOfBirth: new Date('1968-01-10'),
      gender: Gender.MALE,
      phone: '+963912100004',
      address: 'Bab Sharqi, Damascus',
      bloodType: 'O-',
    },
  });

  const linaAhmad = await prisma.patient.upsert({
    where: { id: 'seed-pat-004' },
    update: {},
    create: {
      id: 'seed-pat-004',
      organizationId: 'seed-org-001',
      mrn: 'MRN-005',
      firstName: 'Lina',
      lastName: 'Ahmad',
      dateOfBirth: new Date('2018-04-05'),
      gender: Gender.FEMALE,
      phone: '+963912100005',
      emergencyName: 'Reem Ahmad (Mother)',
      emergencyPhone: '+963912100050',
    },
  });

  const mohammadDiab = await prisma.patient.upsert({
    where: { id: 'seed-pat-005' },
    update: {},
    create: {
      id: 'seed-pat-005',
      organizationId: 'seed-org-001',
      mrn: 'MRN-006',
      firstName: 'Mohammad',
      lastName: 'Diab',
      dateOfBirth: new Date('1961-11-30'),
      gender: Gender.MALE,
      phone: '+963912100006',
      address: 'Kafar Sousa, Damascus',
      bloodType: 'AB+',
    },
  });

  const rimaHamdan = await prisma.patient.upsert({
    where: { id: 'seed-pat-006' },
    update: {},
    create: {
      id: 'seed-pat-006',
      organizationId: 'seed-org-001',
      mrn: 'MRN-007',
      firstName: 'Rima',
      lastName: 'Hamdan',
      dateOfBirth: new Date('1984-09-18'),
      gender: Gender.FEMALE,
      phone: '+963912100007',
      bloodType: 'A-',
    },
  });

  const baselHaddad = await prisma.patient.upsert({
    where: { id: 'seed-pat-007' },
    update: {},
    create: {
      id: 'seed-pat-007',
      organizationId: 'seed-org-001',
      mrn: 'MRN-008',
      firstName: 'Basel',
      lastName: 'Haddad',
      dateOfBirth: new Date('1988-02-27'),
      gender: Gender.MALE,
      phone: '+963912100008',
      address: 'Malki, Damascus',
      bloodType: 'O+',
    },
  });

  const hanaYousef = await prisma.patient.upsert({
    where: { id: 'seed-pat-008' },
    update: {},
    create: {
      id: 'seed-pat-008',
      organizationId: 'seed-org-001',
      mrn: 'MRN-009',
      firstName: 'Hana',
      lastName: 'Yousef',
      dateOfBirth: new Date('1991-05-11'),
      gender: Gender.FEMALE,
      phone: '+963912100009',
    },
  });

  const wissamKhoury = await prisma.patient.upsert({
    where: { id: 'seed-pat-009' },
    update: {},
    create: {
      id: 'seed-pat-009',
      organizationId: 'seed-org-001',
      mrn: 'MRN-010',
      firstName: 'Wissam',
      lastName: 'Khoury',
      dateOfBirth: new Date('1976-08-03'),
      gender: Gender.MALE,
      phone: '+963912100010',
      address: 'Abu Rummaneh, Damascus',
      bloodType: 'B-',
    },
  });

  // ── Allergies ──────────────────────────────────────────────────────────────
  const khalidAllergyExists = await prisma.allergy.findFirst({
    where: { patientId: khalidMousa.id, substance: 'Penicillin' },
  });
  if (!khalidAllergyExists) {
    await prisma.allergy.create({
      data: {
        patientId: khalidMousa.id,
        substance: 'Penicillin',
        reaction: 'Urticaria (hives), angioedema',
        severity: 'MODERATE',
      },
    });
  }

  const mohammadAllergyExists = await prisma.allergy.findFirst({
    where: { patientId: mohammadDiab.id, substance: 'Sulfonamides' },
  });
  if (!mohammadAllergyExists) {
    await prisma.allergy.create({
      data: {
        patientId: mohammadDiab.id,
        substance: 'Sulfonamides',
        reaction: 'Maculopapular rash',
        severity: 'MILD',
      },
    });
  }

  // ── Historical Appointments (COMPLETED) ────────────────────────────────────
  await prisma.appointment.upsert({
    where: { id: 'seed-appt-001' },
    update: { status: AppointmentStatus.COMPLETED },
    create: {
      id: 'seed-appt-001',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: khalidMousa.id,
      doctorId: doctorSamer.id,
      scheduledAt: daysAgo(7, 9, 0),
      durationMin: 20,
      status: AppointmentStatus.COMPLETED,
    },
  });

  await prisma.appointment.upsert({
    where: { id: 'seed-appt-002' },
    update: { status: AppointmentStatus.COMPLETED },
    create: {
      id: 'seed-appt-002',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: nourIbrahim.id,
      doctorId: doctorOmar.id,
      scheduledAt: daysAgo(7, 10, 0),
      durationMin: 20,
      status: AppointmentStatus.COMPLETED,
    },
  });

  await prisma.appointment.upsert({
    where: { id: 'seed-appt-003' },
    update: { status: AppointmentStatus.COMPLETED },
    create: {
      id: 'seed-appt-003',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: tariqSaleh.id,
      doctorId: doctorSamer.id,
      scheduledAt: daysAgo(5, 9, 30),
      durationMin: 20,
      status: AppointmentStatus.COMPLETED,
    },
  });

  await prisma.appointment.upsert({
    where: { id: 'seed-appt-004' },
    update: { status: AppointmentStatus.COMPLETED },
    create: {
      id: 'seed-appt-004',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: saraMahmoud.id,
      doctorId: doctorOmar.id,
      scheduledAt: daysAgo(4, 11, 0),
      durationMin: 20,
      status: AppointmentStatus.COMPLETED,
    },
  });

  await prisma.appointment.upsert({
    where: { id: 'seed-appt-005' },
    update: { status: AppointmentStatus.COMPLETED },
    create: {
      id: 'seed-appt-005',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: mohammadDiab.id,
      doctorId: doctorOmar.id,
      scheduledAt: daysAgo(3, 9, 0),
      durationMin: 20,
      status: AppointmentStatus.COMPLETED,
    },
  });

  await prisma.appointment.upsert({
    where: { id: 'seed-appt-006' },
    update: { status: AppointmentStatus.COMPLETED },
    create: {
      id: 'seed-appt-006',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: rimaHamdan.id,
      doctorId: doctorOmar.id,
      scheduledAt: daysAgo(3, 10, 30),
      durationMin: 20,
      status: AppointmentStatus.COMPLETED,
    },
  });

  await prisma.appointment.upsert({
    where: { id: 'seed-appt-007' },
    update: { status: AppointmentStatus.COMPLETED },
    create: {
      id: 'seed-appt-007',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: linaAhmad.id,
      doctorId: doctorLayla.id,
      scheduledAt: daysAgo(2, 9, 0),
      durationMin: 15,
      status: AppointmentStatus.COMPLETED,
    },
  });

  // ── Today's Appointments ───────────────────────────────────────────────────
  await prisma.appointment.upsert({
    where: { id: 'seed-appt-008' },
    update: {},
    create: {
      id: 'seed-appt-008',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: baselHaddad.id,
      doctorId: doctorSamer.id,
      scheduledAt: todayAt(9, 0),
      durationMin: 20,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  await prisma.appointment.upsert({
    where: { id: 'seed-appt-009' },
    update: {},
    create: {
      id: 'seed-appt-009',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: hanaYousef.id,
      doctorId: doctorOmar.id,
      scheduledAt: todayAt(10, 30),
      durationMin: 20,
      status: AppointmentStatus.CHECKED_IN,
    },
  });

  await prisma.appointment.upsert({
    where: { id: 'seed-appt-010' },
    update: {},
    create: {
      id: 'seed-appt-010',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: wissamKhoury.id,
      doctorId: doctorSamer.id,
      scheduledAt: todayAt(11, 0),
      durationMin: 20,
      status: AppointmentStatus.SCHEDULED,
    },
  });

  await prisma.appointment.upsert({
    where: { id: 'seed-appt-011' },
    update: { status: AppointmentStatus.NO_SHOW },
    create: {
      id: 'seed-appt-011',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: khalidMousa.id,
      doctorId: doctorSamer.id,
      scheduledAt: todayAt(12, 0),
      durationMin: 20,
      status: AppointmentStatus.NO_SHOW,
    },
  });

  // ── Future Appointments ────────────────────────────────────────────────────
  await prisma.appointment.upsert({
    where: { id: 'seed-appt-012' },
    update: {},
    create: {
      id: 'seed-appt-012',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: nourIbrahim.id,
      doctorId: doctorOmar.id,
      scheduledAt: daysAgo(-1, 9, 0),
      durationMin: 20,
      status: AppointmentStatus.SCHEDULED,
    },
  });

  await prisma.appointment.upsert({
    where: { id: 'seed-appt-013' },
    update: {},
    create: {
      id: 'seed-appt-013',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: rimaHamdan.id,
      doctorId: doctorOmar.id,
      scheduledAt: daysAgo(-1, 10, 0),
      durationMin: 20,
      status: AppointmentStatus.SCHEDULED,
    },
  });

  // ── Queue Entry (today's checked-in patient) ───────────────────────────────
  try {
    await prisma.queueEntry.upsert({
      where: { appointmentId: 'seed-appt-009' },
      update: {},
      create: {
        id: 'seed-queue-009',
        appointmentId: 'seed-appt-009',
        organizationId: 'seed-org-001',
        ticketNumber: 9001,
        status: QueueStatus.WAITING,
      },
    });
  } catch {
    // ticket number conflict — skip (queue entry may already exist from a prior session)
  }

  // ── Encounters (for all completed historical appointments) ─────────────────
  const enc1 = await prisma.encounter.upsert({
    where: { appointmentId: 'seed-appt-001' },
    update: {},
    create: {
      id: 'seed-enc-001',
      organizationId: 'seed-org-001',
      patientId: khalidMousa.id,
      doctorId: doctorSamer.id,
      appointmentId: 'seed-appt-001',
      chiefComplaint: 'Follow-up for hypertension. Blood pressure has been elevated per home monitoring.',
      notes: 'Patient reports occasional morning headaches. No chest pain or dyspnoea. Compliant with medication. BP today 148/92 mmHg. HR 78 bpm. No pedal oedema. Peripheral pulses intact.',
      diagnosis: 'Essential hypertension — suboptimal control',
      diagnosisCode: 'I10',
      vitals: {
        temperature: '36.8',
        bloodPressure: '148/92',
        heartRate: '78',
        oxygenSaturation: '98',
        weight: '83',
        height: '175',
      },
      treatmentPlan: 'Increase Amlodipine to 10mg OD. Continue Lisinopril 10mg OD. Low-sodium diet and 30 min daily walking. Repeat BP check in 2 weeks.',
      followUpDate: daysAgo(-14),
      startedAt: daysAgo(7, 9, 5),
      endedAt: daysAgo(7, 9, 25),
    },
  });

  const enc2 = await prisma.encounter.upsert({
    where: { appointmentId: 'seed-appt-002' },
    update: {},
    create: {
      id: 'seed-enc-002',
      organizationId: 'seed-org-001',
      patientId: nourIbrahim.id,
      doctorId: doctorOmar.id,
      appointmentId: 'seed-appt-002',
      chiefComplaint: 'Annual preventive health check. Patient feels well with no specific complaints.',
      notes: 'BMI 22.1. Vitals stable. HEENT, cardiorespiratory, and abdominal exam within normal limits. Recommended routine labs.',
      diagnosis: 'General adult medical examination — no abnormal findings',
      diagnosisCode: 'Z00.01',
      vitals: {
        temperature: '36.5',
        bloodPressure: '112/74',
        heartRate: '72',
        oxygenSaturation: '99',
        weight: '58',
        height: '162',
        respiratoryRate: '14',
      },
      treatmentPlan: 'Continue healthy lifestyle. Order CBC, lipid panel, fasting glucose, TSH. Follow up if results abnormal or symptoms arise.',
      startedAt: daysAgo(7, 10, 5),
      endedAt: daysAgo(7, 10, 25),
    },
  });

  const enc3 = await prisma.encounter.upsert({
    where: { appointmentId: 'seed-appt-003' },
    update: {},
    create: {
      id: 'seed-enc-003',
      organizationId: 'seed-org-001',
      patientId: tariqSaleh.id,
      doctorId: doctorSamer.id,
      appointmentId: 'seed-appt-003',
      chiefComplaint: 'Recurrent chest pressure on exertion for 3 weeks. Relieved by rest within minutes.',
      notes: 'Substernal pressure radiating to left shoulder with walking >200m. Known smoker, 20 pack-years. Resting ECG: sinus rhythm, no acute ST changes. BP 138/86, HR 82. Referred for urgent stress echocardiography.',
      diagnosis: 'Stable angina pectoris',
      diagnosisCode: 'I20.9',
      vitals: {
        temperature: '36.7',
        bloodPressure: '138/86',
        heartRate: '82',
        oxygenSaturation: '97',
        weight: '91',
        height: '178',
      },
      treatmentPlan: 'Start Isosorbide Mononitrate 20mg BD. Aspirin 100mg OD. Atorvastatin 40mg nocte. Urgent stress echo referral. Strict smoking cessation counselling.',
      followUpDate: daysAgo(-7),
      startedAt: daysAgo(5, 9, 35),
      endedAt: daysAgo(5, 9, 58),
    },
  });

  const enc4 = await prisma.encounter.upsert({
    where: { appointmentId: 'seed-appt-004' },
    update: {},
    create: {
      id: 'seed-enc-004',
      organizationId: 'seed-org-001',
      patientId: saraMahmoud.id,
      doctorId: doctorOmar.id,
      appointmentId: 'seed-appt-004',
      chiefComplaint: 'Mild fatigue and occasional light-headedness for 2 weeks. No fever or weight loss.',
      notes: 'Patient appears mildly pale. No jaundice. No lymphadenopathy. Heart and lungs clear. Abdomen soft and non-tender. Suspected iron deficiency given dietary history. Ordered CBC and serum ferritin.',
      diagnosis: 'Iron deficiency anaemia — suspected, pending labs',
      diagnosisCode: 'D50.9',
      vitals: {
        temperature: '36.6',
        bloodPressure: '108/68',
        heartRate: '88',
        oxygenSaturation: '98',
        weight: '54',
        height: '165',
      },
      treatmentPlan: 'Ferrous Sulfate 325mg TID with orange juice. Dietary counselling — increase iron-rich foods. Review CBC and ferritin in 4 weeks.',
      followUpDate: daysAgo(-30),
      startedAt: daysAgo(4, 11, 5),
      endedAt: daysAgo(4, 11, 22),
    },
  });

  const enc5 = await prisma.encounter.upsert({
    where: { appointmentId: 'seed-appt-005' },
    update: {},
    create: {
      id: 'seed-enc-005',
      organizationId: 'seed-org-001',
      patientId: mohammadDiab.id,
      doctorId: doctorOmar.id,
      appointmentId: 'seed-appt-005',
      chiefComplaint: 'Quarterly diabetes follow-up. Last HbA1c 8.2% (3 months ago). Reports improved compliance.',
      notes: 'HbA1c today 7.6% — improving. Fasting glucose 142 mg/dL. Feet exam: no ulcers, peripheral sensation intact. BP 134/82. Ophthalmology review last month: no retinopathy.',
      diagnosis: 'Type 2 diabetes mellitus — improving glycaemic control',
      diagnosisCode: 'E11.9',
      vitals: {
        temperature: '36.9',
        bloodPressure: '134/82',
        heartRate: '76',
        oxygenSaturation: '97',
        weight: '88',
        height: '170',
      },
      treatmentPlan: 'Continue Metformin 1000mg BD. Add Empagliflozin 10mg OD for glycaemic and cardiovascular benefit. Target HbA1c <7%. Follow up in 3 months.',
      followUpDate: daysAgo(-90),
      startedAt: daysAgo(3, 9, 5),
      endedAt: daysAgo(3, 9, 28),
    },
  });

  const enc6 = await prisma.encounter.upsert({
    where: { appointmentId: 'seed-appt-006' },
    update: {},
    create: {
      id: 'seed-enc-006',
      organizationId: 'seed-org-001',
      patientId: rimaHamdan.id,
      doctorId: doctorOmar.id,
      appointmentId: 'seed-appt-006',
      chiefComplaint: 'Lower back pain for 5 days, worse with bending and prolonged sitting. No radiation to legs.',
      notes: 'Mechanical low back pain. No saddle anaesthesia. SLR negative bilaterally. Lumbar ROM restricted by pain. No fever. No recent trauma. No neurological deficits on exam.',
      diagnosis: 'Acute mechanical low back pain',
      diagnosisCode: 'M54.5',
      vitals: {
        temperature: '36.5',
        bloodPressure: '118/76',
        heartRate: '74',
        oxygenSaturation: '99',
        weight: '62',
        height: '163',
      },
      treatmentPlan: 'Naproxen 500mg BD with meals × 5 days. Cyclobenzaprine 5mg TID PRN for spasm. Hot compresses. Avoid bed rest. Return if neurological symptoms develop.',
      startedAt: daysAgo(3, 10, 35),
      endedAt: daysAgo(3, 10, 52),
    },
  });

  const enc7 = await prisma.encounter.upsert({
    where: { appointmentId: 'seed-appt-007' },
    update: {},
    create: {
      id: 'seed-enc-007',
      organizationId: 'seed-org-001',
      patientId: linaAhmad.id,
      doctorId: doctorLayla.id,
      appointmentId: 'seed-appt-007',
      chiefComplaint: 'Well-child visit. 6-year-old female. Parents concerned about appetite and growth.',
      notes: 'Alert, active child in no distress. Weight 24 kg (50th percentile). Height 116 cm (50th percentile). Growth velocity appropriate for age. Picky eating — no signs of nutritional deficiency. Developmental milestones met. Immunisations up to date.',
      diagnosis: 'Well-child examination — 6 years, no abnormal findings',
      diagnosisCode: 'Z00.129',
      vitals: {
        temperature: '36.6',
        bloodPressure: '96/60',
        heartRate: '92',
        oxygenSaturation: '99',
        weight: '24',
        height: '116',
      },
      treatmentPlan: 'No pharmacological intervention required. Balanced diet with variety — involve child in food preparation. Children\'s multivitamin syrup OD. Limit screen time per guidelines. Next well-child visit at age 7.',
      startedAt: daysAgo(2, 9, 5),
      endedAt: daysAgo(2, 9, 20),
    },
  });

  // ── Prescriptions ──────────────────────────────────────────────────────────
  // Enc 1 — Hypertension (Khalid Mousa)
  await prisma.prescription.upsert({
    where: { id: 'seed-rx-001' },
    update: { encounterId: enc1.id },
    create: {
      id: 'seed-rx-001',
      encounterId: enc1.id,
      medication: 'Amlodipine',
      dosage: '10mg',
      frequency: 'Once daily (morning)',
      duration: '30 days',
      instructions: 'Take in the morning. Monitor for ankle swelling.',
      quantity: 30,
      refillsLeft: 2,
    },
  });

  await prisma.prescription.upsert({
    where: { id: 'seed-rx-002' },
    update: { encounterId: enc1.id },
    create: {
      id: 'seed-rx-002',
      encounterId: enc1.id,
      medication: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Once daily',
      duration: '30 days',
      instructions: 'Take on empty stomach. Avoid potassium supplements unless directed.',
      quantity: 30,
      refillsLeft: 2,
    },
  });

  // Enc 2 — Annual checkup (Nour Ibrahim)
  await prisma.prescription.upsert({
    where: { id: 'seed-rx-003' },
    update: { encounterId: enc2.id },
    create: {
      id: 'seed-rx-003',
      encounterId: enc2.id,
      medication: 'Vitamin D3',
      dosage: '1000 IU',
      frequency: 'Once daily',
      duration: '3 months',
      instructions: 'Take with a fatty meal for optimal absorption.',
      quantity: 90,
      refillsLeft: 1,
    },
  });

  // Enc 3 — Angina (Tariq Saleh)
  await prisma.prescription.upsert({
    where: { id: 'seed-rx-004' },
    update: { encounterId: enc3.id },
    create: {
      id: 'seed-rx-004',
      encounterId: enc3.id,
      medication: 'Isosorbide Mononitrate',
      dosage: '20mg',
      frequency: 'Twice daily',
      duration: '30 days',
      instructions: 'Take morning and early afternoon. Maintain >8h nitrate-free interval.',
      quantity: 60,
      refillsLeft: 1,
    },
  });

  await prisma.prescription.upsert({
    where: { id: 'seed-rx-005' },
    update: { encounterId: enc3.id },
    create: {
      id: 'seed-rx-005',
      encounterId: enc3.id,
      medication: 'Aspirin',
      dosage: '100mg',
      frequency: 'Once daily',
      duration: 'Long-term',
      instructions: 'Take after meals. Do not crush or chew.',
      quantity: 90,
      refillsLeft: 3,
    },
  });

  await prisma.prescription.upsert({
    where: { id: 'seed-rx-006' },
    update: { encounterId: enc3.id },
    create: {
      id: 'seed-rx-006',
      encounterId: enc3.id,
      medication: 'Atorvastatin',
      dosage: '40mg',
      frequency: 'Once daily (evening)',
      duration: 'Long-term',
      instructions: 'Take at bedtime. Report any muscle pain or weakness immediately.',
      quantity: 30,
      refillsLeft: 5,
    },
  });

  // Enc 4 — Anaemia (Sara Mahmoud)
  await prisma.prescription.upsert({
    where: { id: 'seed-rx-007' },
    update: { encounterId: enc4.id },
    create: {
      id: 'seed-rx-007',
      encounterId: enc4.id,
      medication: 'Ferrous Sulfate',
      dosage: '325mg',
      frequency: 'Three times daily',
      duration: '4 weeks',
      instructions: 'Take 30 minutes before meals with orange juice. May cause dark stools — this is expected.',
      quantity: 84,
      refillsLeft: 0,
    },
  });

  // Enc 5 — Diabetes (Mohammad Diab)
  await prisma.prescription.upsert({
    where: { id: 'seed-rx-008' },
    update: { encounterId: enc5.id },
    create: {
      id: 'seed-rx-008',
      encounterId: enc5.id,
      medication: 'Metformin',
      dosage: '1000mg',
      frequency: 'Twice daily with meals',
      duration: '3 months',
      instructions: 'Take with meals to reduce GI side effects.',
      quantity: 180,
      refillsLeft: 2,
    },
  });

  await prisma.prescription.upsert({
    where: { id: 'seed-rx-009' },
    update: { encounterId: enc5.id },
    create: {
      id: 'seed-rx-009',
      encounterId: enc5.id,
      medication: 'Empagliflozin',
      dosage: '10mg',
      frequency: 'Once daily (morning)',
      duration: '3 months',
      instructions: 'Ensure adequate hydration. Withhold if unwell or fasting for procedures.',
      quantity: 90,
      refillsLeft: 2,
    },
  });

  // Enc 6 — Back pain (Rima Hamdan)
  await prisma.prescription.upsert({
    where: { id: 'seed-rx-010' },
    update: { encounterId: enc6.id },
    create: {
      id: 'seed-rx-010',
      encounterId: enc6.id,
      medication: 'Naproxen',
      dosage: '500mg',
      frequency: 'Twice daily with meals',
      duration: '5 days',
      instructions: 'Take strictly with meals. Avoid if history of peptic ulcer disease.',
      quantity: 10,
      refillsLeft: 0,
    },
  });

  await prisma.prescription.upsert({
    where: { id: 'seed-rx-011' },
    update: { encounterId: enc6.id },
    create: {
      id: 'seed-rx-011',
      encounterId: enc6.id,
      medication: 'Cyclobenzaprine',
      dosage: '5mg',
      frequency: 'Three times daily as needed',
      duration: '5 days',
      instructions: 'Use only when needed for muscle spasm. May cause drowsiness — do not drive.',
      quantity: 15,
      refillsLeft: 0,
    },
  });

  // Enc 7 — Paediatrics (Lina Ahmad)
  await prisma.prescription.upsert({
    where: { id: 'seed-rx-012' },
    update: { encounterId: enc7.id },
    create: {
      id: 'seed-rx-012',
      encounterId: enc7.id,
      medication: "Children's Multivitamin Syrup",
      dosage: '5ml',
      frequency: 'Once daily after breakfast',
      duration: '1 month',
      instructions: 'Shake well before use. Refrigerate after opening.',
      quantity: 1,
      refillsLeft: 1,
    },
  });

  console.log(`
╔══════════════════════════════════════════════════════╗
║       Al-Nour Medical Center — Demo Seed Ready       ║
╠══════════════════════════════════════════════════════╣
║  Demo Accounts                                       ║
║  ─────────────────────────────────────────────────  ║
║  SUPER ADMIN   +963900000001  /  password123         ║
║  ORG ADMIN     +963912345678  /  password123         ║
║  SECRETARY     +963912002001  /  password123         ║
║  DOCTOR        +963912001001  /  password123         ║
║  DOCTOR        +963912001002  /  password123         ║
║  DOCTOR        +963912001003  /  password123         ║
╠══════════════════════════════════════════════════════╣
║  Data                                                ║
║  ─────────────────────────────────────────────────  ║
║  Patients: 9  │  Appointments: 13  │  Doctors: 3    ║
║  Encounters: 7  │  Prescriptions: 12  │  Queued: 1  ║
╚══════════════════════════════════════════════════════╝
  `);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
