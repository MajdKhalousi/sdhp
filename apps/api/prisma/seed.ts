import {
  PrismaClient,
  UserRole,
  Gender,
  AppointmentStatus,
  QueueStatus,
  LabOrderStatus,
  RadiologyOrderStatus,
  InvoiceStatus,
  PaymentMethod,
  ClinicalReportStatus,
  VisitTypeCode,
  ClinicPatientLinkType,
  ClinicPatientStatus,
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
    update: { passwordHash },
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

  const orgAdminUser = await prisma.user.upsert({
    where: { phone: '+963912345678' },
    update: { passwordHash, firstName: 'Ahmad', lastName: 'Khalil' },
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
    update: { passwordHash },
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

  // Nurse
  await prisma.user.upsert({
    where: { phone: '+963912003001' },
    update: { passwordHash },
    create: {
      phone: '+963912003001',
      email: 'nurse@alnour.sy',
      passwordHash,
      firstName: 'Amal',
      lastName: 'Hasan',
      firstNameAr: 'أمل',
      lastNameAr: 'حسن',
      role: UserRole.NURSE,
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
    },
  });

  // Accountant
  const userAccountant = await prisma.user.upsert({
    where: { phone: '+963912004001' },
    update: { passwordHash },
    create: {
      phone: '+963912004001',
      email: 'accountant@alnour.sy',
      passwordHash,
      firstName: 'Rana',
      lastName: 'Mansour',
      firstNameAr: 'رنا',
      lastNameAr: 'منصور',
      role: UserRole.ACCOUNTANT,
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
    },
  });

  // Technician
  await prisma.user.upsert({
    where: { phone: '+963912005001' },
    update: { passwordHash },
    create: {
      phone: '+963912005001',
      email: 'technician@alnour.sy',
      passwordHash,
      firstName: 'Yousef',
      lastName: 'Haddad',
      firstNameAr: 'يوسف',
      lastNameAr: 'حداد',
      role: UserRole.TECHNICIAN,
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
    },
  });

  // Doctor users
  const drSamerUser = await prisma.user.upsert({
    where: { phone: '+963912001001' },
    update: { passwordHash, firstName: 'Samer', lastName: 'Hassan', role: UserRole.DOCTOR },
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
    update: { passwordHash, firstName: 'Layla', lastName: 'Nasser', role: UserRole.DOCTOR },
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
    update: { passwordHash, firstName: 'Omar', lastName: 'Saleh', role: UserRole.DOCTOR },
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
  // Original 10
  const saraMahmoud = await prisma.patient.upsert({
    where: { organizationId_mrn: { organizationId: 'seed-org-001', mrn: 'MRN-000001' } },
    update: { firstName: 'Sara', lastName: 'Mahmoud', phone: '+963912100001', gender: Gender.FEMALE },
    create: {
      id: 'seed-pat-sara',
      organizationId: 'seed-org-001',
      mrn: 'MRN-000001',
      firstName: 'Sara',
      lastName: 'Mahmoud',
      firstNameAr: 'سارة',
      lastNameAr: 'محمود',
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
      mrn: 'MRN-000002',
      firstName: 'Khalid',
      lastName: 'Mousa',
      firstNameAr: 'خالد',
      lastNameAr: 'موسى',
      dateOfBirth: new Date('1981-03-15'),
      gender: Gender.MALE,
      phone: '+963912100002',
      address: 'Mazzeh, Damascus',
      bloodType: 'B+',
      emergencyName: 'Fatima Mousa',
      emergencyPhone: '+963912100020',
      notes: 'Known hypertensive. On Amlodipine + Lisinopril.',
    },
  });

  const nourIbrahim = await prisma.patient.upsert({
    where: { id: 'seed-pat-002' },
    update: {},
    create: {
      id: 'seed-pat-002',
      organizationId: 'seed-org-001',
      mrn: 'MRN-000003',
      firstName: 'Nour',
      lastName: 'Ibrahim',
      firstNameAr: 'نور',
      lastNameAr: 'إبراهيم',
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
      mrn: 'MRN-000004',
      firstName: 'Tariq',
      lastName: 'Saleh',
      firstNameAr: 'طارق',
      lastNameAr: 'صالح',
      dateOfBirth: new Date('1968-01-10'),
      gender: Gender.MALE,
      phone: '+963912100004',
      address: 'Bab Sharqi, Damascus',
      bloodType: 'O-',
      notes: 'Active smoker. Referred for stress echo. Cardiology follow-up.',
    },
  });

  const linaAhmad = await prisma.patient.upsert({
    where: { id: 'seed-pat-004' },
    update: {},
    create: {
      id: 'seed-pat-004',
      organizationId: 'seed-org-001',
      mrn: 'MRN-000005',
      firstName: 'Lina',
      lastName: 'Ahmad',
      firstNameAr: 'لينا',
      lastNameAr: 'أحمد',
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
      mrn: 'MRN-000006',
      firstName: 'Mohammad',
      lastName: 'Diab',
      firstNameAr: 'محمد',
      lastNameAr: 'دياب',
      dateOfBirth: new Date('1961-11-30'),
      gender: Gender.MALE,
      phone: '+963912100006',
      address: 'Kafar Sousa, Damascus',
      bloodType: 'AB+',
      notes: 'Type 2 DM. HbA1c improving (7.6%). On Metformin + Empagliflozin.',
    },
  });

  const rimaHamdan = await prisma.patient.upsert({
    where: { id: 'seed-pat-006' },
    update: {},
    create: {
      id: 'seed-pat-006',
      organizationId: 'seed-org-001',
      mrn: 'MRN-000007',
      firstName: 'Rima',
      lastName: 'Hamdan',
      firstNameAr: 'ريما',
      lastNameAr: 'حمدان',
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
      mrn: 'MRN-000008',
      firstName: 'Basel',
      lastName: 'Haddad',
      firstNameAr: 'باسل',
      lastNameAr: 'حداد',
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
      mrn: 'MRN-000009',
      firstName: 'Hana',
      lastName: 'Yousef',
      firstNameAr: 'هناء',
      lastNameAr: 'يوسف',
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
      mrn: 'MRN-000010',
      firstName: 'Wissam',
      lastName: 'Khoury',
      firstNameAr: 'وسام',
      lastNameAr: 'خوري',
      dateOfBirth: new Date('1976-08-03'),
      gender: Gender.MALE,
      phone: '+963912100010',
      address: 'Abu Rummaneh, Damascus',
      bloodType: 'B-',
    },
  });

  // Additional patients — realistic clinical profiles
  const ahmadRashid = await prisma.patient.upsert({
    where: { id: 'seed-pat-010' },
    update: {},
    create: {
      id: 'seed-pat-010',
      organizationId: 'seed-org-001',
      mrn: 'MRN-000011',
      firstName: 'Ahmad',
      lastName: 'Rashid',
      firstNameAr: 'أحمد',
      lastNameAr: 'راشد',
      dateOfBirth: new Date('1979-06-12'),
      gender: Gender.MALE,
      phone: '+963912100011',
      address: 'Qassaa, Damascus',
      bloodType: 'A+',
      nationalId: '0112345678',
      emergencyName: 'Marwa Rashid (Wife)',
      emergencyPhone: '+963912100110',
      notes: 'Type 2 DM + Essential hypertension. Quarterly follow-up.',
    },
  }).catch(() => null);

  const fatimaNasser = await prisma.patient.upsert({
    where: { id: 'seed-pat-011' },
    update: {},
    create: {
      id: 'seed-pat-011',
      organizationId: 'seed-org-001',
      mrn: 'MRN-000012',
      firstName: 'Fatima',
      lastName: 'Nasser',
      firstNameAr: 'فاطمة',
      lastNameAr: 'ناصر',
      dateOfBirth: new Date('1993-11-25'),
      gender: Gender.FEMALE,
      phone: '+963912100012',
      address: 'Zamalka, Damascus',
      bloodType: 'O+',
    },
  }).catch(() => null);

  const yousefKhatib = await prisma.patient.upsert({
    where: { id: 'seed-pat-012' },
    update: {},
    create: {
      id: 'seed-pat-012',
      organizationId: 'seed-org-001',
      mrn: 'MRN-000013',
      firstName: 'Yousef',
      lastName: 'Khatib',
      firstNameAr: 'يوسف',
      lastNameAr: 'الخطيب',
      dateOfBirth: new Date('1952-03-08'),
      gender: Gender.MALE,
      phone: '+963912100013',
      address: 'Al-Midan, Damascus',
      bloodType: 'O-',
      emergencyName: 'Khalil Khatib (Son)',
      emergencyPhone: '+963912100130',
      notes: 'COPD Gold Stage II. Ex-smoker. On bronchodilator therapy.',
    },
  }).catch(() => null);

  const mariamAziz = await prisma.patient.upsert({
    where: { id: 'seed-pat-013' },
    update: {},
    create: {
      id: 'seed-pat-013',
      organizationId: 'seed-org-001',
      mrn: 'MRN-000014',
      firstName: 'Mariam',
      lastName: 'Aziz',
      firstNameAr: 'مريم',
      lastNameAr: 'عزيز',
      dateOfBirth: new Date('1996-08-14'),
      gender: Gender.FEMALE,
      phone: '+963912100014',
      bloodType: 'B+',
    },
  }).catch(() => null);

  const hassanBarakat = await prisma.patient.upsert({
    where: { id: 'seed-pat-014' },
    update: {},
    create: {
      id: 'seed-pat-014',
      organizationId: 'seed-org-001',
      mrn: 'MRN-000015',
      firstName: 'Hassan',
      lastName: 'Barakat',
      firstNameAr: 'حسن',
      lastNameAr: 'بركات',
      dateOfBirth: new Date('1969-04-22'),
      gender: Gender.MALE,
      phone: '+963912100015',
      address: 'Shaghour, Damascus',
      bloodType: 'AB-',
      emergencyName: 'Nadia Barakat (Wife)',
      emergencyPhone: '+963912100150',
      notes: 'Post-MI (STEMI, 6 months ago). On dual antiplatelet, ACEi, beta-blocker, statin.',
    },
  }).catch(() => null);

  const dimaKassab = await prisma.patient.upsert({
    where: { id: 'seed-pat-015' },
    update: {},
    create: {
      id: 'seed-pat-015',
      organizationId: 'seed-org-001',
      mrn: 'MRN-000016',
      firstName: 'Dima',
      lastName: 'Kassab',
      firstNameAr: 'ديما',
      lastNameAr: 'كساب',
      dateOfBirth: new Date('1986-09-30'),
      gender: Gender.FEMALE,
      phone: '+963912100016',
      address: 'Rukn Al-Din, Damascus',
      bloodType: 'A-',
      notes: 'Hypothyroidism on Levothyroxine. TSH monitoring every 6 months.',
    },
  }).catch(() => null);

  const mazenAlAmin = await prisma.patient.upsert({
    where: { id: 'seed-pat-016' },
    update: {},
    create: {
      id: 'seed-pat-016',
      organizationId: 'seed-org-001',
      mrn: 'MRN-000017',
      firstName: 'Mazen',
      lastName: 'Al-Amin',
      firstNameAr: 'مازن',
      lastNameAr: 'الأمين',
      dateOfBirth: new Date('2005-01-17'),
      gender: Gender.MALE,
      phone: '+963912100017',
      bloodType: 'O+',
      emergencyName: 'Bilal Al-Amin (Father)',
      emergencyPhone: '+963912100170',
    },
  }).catch(() => null);

  const rimShaaban = await prisma.patient.upsert({
    where: { id: 'seed-pat-017' },
    update: {},
    create: {
      id: 'seed-pat-017',
      organizationId: 'seed-org-001',
      mrn: 'MRN-000018',
      firstName: 'Rim',
      lastName: 'Shaaban',
      firstNameAr: 'ريم',
      lastNameAr: 'شعبان',
      dateOfBirth: new Date('1960-12-05'),
      gender: Gender.FEMALE,
      phone: '+963912100018',
      address: 'Al-Yarmouk, Damascus',
      bloodType: 'B+',
      notes: 'Osteoporosis. T-score −2.8 lumbar spine. On bisphosphonate.',
    },
  }).catch(() => null);

  const karimNassar = await prisma.patient.upsert({
    where: { id: 'seed-pat-018' },
    update: {},
    create: {
      id: 'seed-pat-018',
      organizationId: 'seed-org-001',
      mrn: 'MRN-000019',
      firstName: 'Karim',
      lastName: 'Nassar',
      firstNameAr: 'كريم',
      lastNameAr: 'نصار',
      dateOfBirth: new Date('2016-07-09'),
      gender: Gender.MALE,
      phone: '+963912100019',
      bloodType: 'A+',
      emergencyName: 'Rana Nassar (Mother)',
      emergencyPhone: '+963912100190',
    },
  }).catch(() => null);

  const lailaFakhoury = await prisma.patient.upsert({
    where: { id: 'seed-pat-019' },
    update: {},
    create: {
      id: 'seed-pat-019',
      organizationId: 'seed-org-001',
      mrn: 'MRN-000020',
      firstName: 'Laila',
      lastName: 'Fakhoury',
      firstNameAr: 'ليلى',
      lastNameAr: 'فاخوري',
      dateOfBirth: new Date('1974-05-28'),
      gender: Gender.FEMALE,
      phone: '+963912100020',
      address: 'Mezze Villas, Damascus',
      bloodType: 'O+',
    },
  }).catch(() => null);

  // ── Clinic Patient Links ───────────────────────────────────────────────────
  // The real create-patient flow (patients.service.ts) always creates a
  // ClinicPatient row in the same transaction as the Patient — GET /patients
  // is driven entirely by ClinicPatient, not Patient. This seed creates
  // Patient rows directly via prisma.patient.upsert(), bypassing that service
  // layer, so it must replicate the link here or seeded patients are
  // invisible to the API despite existing in the database.
  const seededPatients = [
    saraMahmoud, khalidMousa, nourIbrahim, tariqSaleh, linaAhmad,
    mohammadDiab, rimaHamdan, baselHaddad, hanaYousef, wissamKhoury,
    ahmadRashid, fatimaNasser, yousefKhatib, mariamAziz, hassanBarakat,
    dimaKassab, mazenAlAmin, rimShaaban, karimNassar, lailaFakhoury,
  ].filter((p): p is NonNullable<typeof p> => p !== null);

  for (const patient of seededPatients) {
    await prisma.clinicPatient.upsert({
      where: {
        organizationId_patientId: {
          organizationId: patient.organizationId,
          patientId: patient.id,
        },
      },
      update: {},
      create: {
        organizationId: patient.organizationId,
        patientId: patient.id,
        mrn: patient.mrn,
        linkType: ClinicPatientLinkType.CLINIC_CREATED,
        status: ClinicPatientStatus.ACTIVE,
        linkedById: orgAdminUser.id,
        linkedAt: patient.createdAt ?? new Date(),
        lastVisitAt: null,
        deletedAt: null,
      },
    });
  }

  // ── Allergies ──────────────────────────────────────────────────────────────
  const khalidAllergyExists = await prisma.allergy.findFirst({
    where: { patientId: khalidMousa.id, substance: 'Penicillin', deletedAt: null },
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
    where: { patientId: mohammadDiab.id, substance: 'Sulfonamides', deletedAt: null },
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

  // New allergies for new patients
  if (yousefKhatib) {
    const yousefNsaidAllergyExists = await prisma.allergy.findFirst({
      where: { patientId: yousefKhatib.id, substance: 'NSAIDs', deletedAt: null },
    });
    if (!yousefNsaidAllergyExists) {
      await prisma.allergy.create({
        data: {
          patientId: yousefKhatib.id,
          substance: 'NSAIDs (Ibuprofen, Naproxen)',
          reaction: 'Bronchospasm, worsening dyspnoea',
          severity: 'SEVERE',
        },
      });
    }
  }

  if (hassanBarakat) {
    const hassanContrastAllergyExists = await prisma.allergy.findFirst({
      where: { patientId: hassanBarakat.id, substance: 'Iodinated Contrast', deletedAt: null },
    });
    if (!hassanContrastAllergyExists) {
      await prisma.allergy.create({
        data: {
          patientId: hassanBarakat.id,
          substance: 'Iodinated Contrast Media',
          reaction: 'Anaphylaxis — facial oedema, hypotension (prior cardiac cath)',
          severity: 'SEVERE',
        },
      });
    }
  }

  if (dimaKassab) {
    const dimaLatexAllergyExists = await prisma.allergy.findFirst({
      where: { patientId: dimaKassab.id, substance: 'Latex', deletedAt: null },
    });
    if (!dimaLatexAllergyExists) {
      await prisma.allergy.create({
        data: {
          patientId: dimaKassab.id,
          substance: 'Latex',
          reaction: 'Contact urticaria, pruritus',
          severity: 'MILD',
        },
      });
    }
  }

  const tariPenicillinAllergyExists = await prisma.allergy.findFirst({
    where: { patientId: tariqSaleh.id, substance: 'Penicillin', deletedAt: null },
  });
  if (!tariPenicillinAllergyExists) {
    await prisma.allergy.create({
      data: {
        patientId: tariqSaleh.id,
        substance: 'Penicillin',
        reaction: 'Rash, mild urticaria',
        severity: 'MILD',
      },
    });
  }

  // ── Historical Appointments (COMPLETED) — original set ─────────────────────
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

  // Extended historical appointments — 14 to 21 days ago
  if (ahmadRashid) await prisma.appointment.upsert({
    where: { id: 'seed-appt-014' },
    update: { status: AppointmentStatus.COMPLETED },
    create: {
      id: 'seed-appt-014',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: ahmadRashid.id,
      doctorId: doctorOmar.id,
      scheduledAt: daysAgo(14, 9, 0),
      durationMin: 20,
      status: AppointmentStatus.COMPLETED,
    },
  }).catch(() => null);

  if (yousefKhatib) await prisma.appointment.upsert({
    where: { id: 'seed-appt-015' },
    update: { status: AppointmentStatus.COMPLETED },
    create: {
      id: 'seed-appt-015',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: yousefKhatib.id,
      doctorId: doctorSamer.id,
      scheduledAt: daysAgo(14, 10, 30),
      durationMin: 20,
      status: AppointmentStatus.COMPLETED,
    },
  }).catch(() => null);

  if (hassanBarakat) await prisma.appointment.upsert({
    where: { id: 'seed-appt-016' },
    update: { status: AppointmentStatus.COMPLETED },
    create: {
      id: 'seed-appt-016',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: hassanBarakat.id,
      doctorId: doctorSamer.id,
      scheduledAt: daysAgo(12, 9, 0),
      durationMin: 20,
      status: AppointmentStatus.COMPLETED,
    },
  }).catch(() => null);

  if (dimaKassab) await prisma.appointment.upsert({
    where: { id: 'seed-appt-017' },
    update: { status: AppointmentStatus.COMPLETED },
    create: {
      id: 'seed-appt-017',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: dimaKassab.id,
      doctorId: doctorOmar.id,
      scheduledAt: daysAgo(10, 10, 0),
      durationMin: 20,
      status: AppointmentStatus.COMPLETED,
    },
  }).catch(() => null);

  if (rimShaaban) await prisma.appointment.upsert({
    where: { id: 'seed-appt-018' },
    update: { status: AppointmentStatus.COMPLETED },
    create: {
      id: 'seed-appt-018',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: rimShaaban.id,
      doctorId: doctorOmar.id,
      scheduledAt: daysAgo(9, 9, 30),
      durationMin: 20,
      status: AppointmentStatus.COMPLETED,
    },
  }).catch(() => null);

  // Cancelled and no-show historical entries
  if (mazenAlAmin) await prisma.appointment.upsert({
    where: { id: 'seed-appt-023' },
    update: {},
    create: {
      id: 'seed-appt-023',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: mazenAlAmin.id,
      doctorId: doctorSamer.id,
      scheduledAt: daysAgo(6, 11, 0),
      durationMin: 20,
      status: AppointmentStatus.NO_SHOW,
    },
  }).catch(() => null);

  if (lailaFakhoury) await prisma.appointment.upsert({
    where: { id: 'seed-appt-024' },
    update: {},
    create: {
      id: 'seed-appt-024',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: lailaFakhoury.id,
      doctorId: doctorOmar.id,
      scheduledAt: daysAgo(8, 10, 0),
      durationMin: 20,
      status: AppointmentStatus.CANCELLED,
      cancelReason: 'Patient requested rescheduling — travel conflict.',
      cancelledAt: daysAgo(8, 8, 0),
    },
  }).catch(() => null);

  // ── Today's Appointments ────────────────────────────────────────────────────
  // Completed earlier today (queue DONE) — Ahmad Rashid follow-up
  if (ahmadRashid) await prisma.appointment.upsert({
    where: { id: 'seed-appt-019' },
    update: { status: AppointmentStatus.COMPLETED },
    create: {
      id: 'seed-appt-019',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: ahmadRashid.id,
      doctorId: doctorOmar.id,
      scheduledAt: todayAt(8, 0),
      durationMin: 20,
      status: AppointmentStatus.COMPLETED,
    },
  }).catch(() => null);

  // IN_PROGRESS (currently with doctor) — Dima Kassab
  if (dimaKassab) await prisma.appointment.upsert({
    where: { id: 'seed-appt-020' },
    update: { status: AppointmentStatus.IN_PROGRESS },
    create: {
      id: 'seed-appt-020',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: dimaKassab.id,
      doctorId: doctorOmar.id,
      scheduledAt: todayAt(8, 30),
      durationMin: 20,
      status: AppointmentStatus.IN_PROGRESS,
    },
  }).catch(() => null);

  // CHECKED_IN → queue CALLED — Fatima Nasser
  if (fatimaNasser) await prisma.appointment.upsert({
    where: { id: 'seed-appt-021' },
    update: {},
    create: {
      id: 'seed-appt-021',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: fatimaNasser.id,
      doctorId: doctorLayla.id,
      scheduledAt: todayAt(9, 0),
      durationMin: 15,
      status: AppointmentStatus.CHECKED_IN,
    },
  }).catch(() => null);

  // Karim Nassar — pediatric walk-in today, CHECKED_IN / WAITING
  if (karimNassar) await prisma.appointment.upsert({
    where: { id: 'seed-appt-022' },
    update: {},
    create: {
      id: 'seed-appt-022',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: karimNassar.id,
      doctorId: doctorLayla.id,
      scheduledAt: todayAt(9, 30),
      durationMin: 15,
      status: AppointmentStatus.CHECKED_IN,
    },
  }).catch(() => null);

  // Completed earlier today — Nour Ibrahim (General Medicine) 07:30
  await prisma.appointment.upsert({
    where: { id: 'seed-appt-td-001' },
    update: { scheduledAt: todayAt(7, 30), status: AppointmentStatus.COMPLETED },
    create: {
      id: 'seed-appt-td-001',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: nourIbrahim.id,
      doctorId: doctorOmar.id,
      scheduledAt: todayAt(7, 30),
      durationMin: 20,
      status: AppointmentStatus.COMPLETED,
    },
  });

  // Completed earlier today — Tariq Saleh (Cardiology) 08:00
  await prisma.appointment.upsert({
    where: { id: 'seed-appt-td-002' },
    update: { scheduledAt: todayAt(8, 0), status: AppointmentStatus.COMPLETED },
    create: {
      id: 'seed-appt-td-002',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: tariqSaleh.id,
      doctorId: doctorSamer.id,
      scheduledAt: todayAt(8, 0),
      durationMin: 20,
      status: AppointmentStatus.COMPLETED,
    },
  });

  // Existing today's appointments
  await prisma.appointment.upsert({
    where: { id: 'seed-appt-008' },
    update: { scheduledAt: todayAt(10, 0) },
    create: {
      id: 'seed-appt-008',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: baselHaddad.id,
      doctorId: doctorSamer.id,
      scheduledAt: todayAt(10, 0),
      durationMin: 20,
      status: AppointmentStatus.CONFIRMED,
    },
  });

  await prisma.appointment.upsert({
    where: { id: 'seed-appt-009' },
    update: { scheduledAt: todayAt(10, 30) },
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
    update: { scheduledAt: todayAt(11, 0) },
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
    update: { scheduledAt: todayAt(12, 0), status: AppointmentStatus.NO_SHOW },
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

  if (hassanBarakat) await prisma.appointment.upsert({
    where: { id: 'seed-appt-025' },
    update: {},
    create: {
      id: 'seed-appt-025',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: hassanBarakat.id,
      doctorId: doctorSamer.id,
      scheduledAt: daysAgo(-3, 9, 0),
      durationMin: 20,
      status: AppointmentStatus.CONFIRMED,
    },
  }).catch(() => null);

  if (mariamAziz) await prisma.appointment.upsert({
    where: { id: 'seed-appt-026' },
    update: {},
    create: {
      id: 'seed-appt-026',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: mariamAziz.id,
      doctorId: doctorOmar.id,
      scheduledAt: daysAgo(-5, 10, 0),
      durationMin: 20,
      status: AppointmentStatus.SCHEDULED,
    },
  }).catch(() => null);

  // ── Queue Entries ──────────────────────────────────────────────────────────
  const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Damascus' });

  // Ticket 1 — Ahmad Rashid — DONE (completed this morning)
  try {
    await prisma.queueEntry.upsert({
      where: { appointmentId: 'seed-appt-019' },
      update: {},
      create: {
        id: 'seed-queue-019',
        appointmentId: 'seed-appt-019',
        organizationId: 'seed-org-001',
        businessDate: todayDate,
        ticketNumber: 1,
        status: QueueStatus.DONE,
        calledAt: todayAt(8, 2),
        completedAt: todayAt(8, 22),
      },
    });
  } catch { /* ticket conflict from prior seed run — skip */ }

  // Ticket 2 — Dima Kassab — IN_PROGRESS (currently with Dr. Omar)
  try {
    await prisma.queueEntry.upsert({
      where: { appointmentId: 'seed-appt-020' },
      update: {},
      create: {
        id: 'seed-queue-020',
        appointmentId: 'seed-appt-020',
        organizationId: 'seed-org-001',
        businessDate: todayDate,
        ticketNumber: 2,
        status: QueueStatus.IN_PROGRESS,
        calledAt: todayAt(8, 32),
      },
    });
  } catch { /* skip */ }

  // Ticket 3 — Fatima Nasser — CALLED (waiting to enter room)
  try {
    await prisma.queueEntry.upsert({
      where: { appointmentId: 'seed-appt-021' },
      update: {},
      create: {
        id: 'seed-queue-021',
        appointmentId: 'seed-appt-021',
        organizationId: 'seed-org-001',
        businessDate: todayDate,
        ticketNumber: 3,
        status: QueueStatus.CALLED,
        calledAt: todayAt(9, 5),
      },
    });
  } catch { /* skip */ }

  // Ticket 4 — Karim Nassar — WAITING (walk-in)
  try {
    await prisma.queueEntry.upsert({
      where: { appointmentId: 'seed-appt-022' },
      update: {},
      create: {
        id: 'seed-queue-022',
        appointmentId: 'seed-appt-022',
        organizationId: 'seed-org-001',
        businessDate: todayDate,
        ticketNumber: 4,
        status: QueueStatus.WAITING,
      },
    });
  } catch { /* skip */ }

  // Ticket 9001 — Hana Yousef — WAITING (original seed entry)
  try {
    await prisma.queueEntry.upsert({
      where: { appointmentId: 'seed-appt-009' },
      update: { businessDate: todayDate },
      create: {
        id: 'seed-queue-009',
        appointmentId: 'seed-appt-009',
        organizationId: 'seed-org-001',
        businessDate: todayDate,
        ticketNumber: 9001,
        status: QueueStatus.WAITING,
      },
    });
  } catch { /* skip */ }

  // Ticket 5 — Nour Ibrahim — DONE (completed earlier today)
  try {
    await prisma.queueEntry.upsert({
      where: { appointmentId: 'seed-appt-td-001' },
      update: { businessDate: todayDate },
      create: {
        id: 'seed-queue-td-001',
        appointmentId: 'seed-appt-td-001',
        organizationId: 'seed-org-001',
        businessDate: todayDate,
        ticketNumber: 5,
        status: QueueStatus.DONE,
        calledAt: todayAt(7, 35),
        completedAt: todayAt(7, 55),
      },
    });
  } catch { /* skip */ }

  // Ticket 6 — Tariq Saleh — DONE (completed earlier today)
  try {
    await prisma.queueEntry.upsert({
      where: { appointmentId: 'seed-appt-td-002' },
      update: { businessDate: todayDate },
      create: {
        id: 'seed-queue-td-002',
        appointmentId: 'seed-appt-td-002',
        organizationId: 'seed-org-001',
        businessDate: todayDate,
        ticketNumber: 6,
        status: QueueStatus.DONE,
        calledAt: todayAt(8, 5),
        completedAt: todayAt(8, 25),
      },
    });
  } catch { /* skip */ }

  // ── Encounters (all completed appointments) ────────────────────────────────
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

  // Extended historical encounters — 9 to 14 days ago
  const enc8 = ahmadRashid ? await prisma.encounter.upsert({
    where: { appointmentId: 'seed-appt-014' },
    update: {},
    create: {
      id: 'seed-enc-008',
      organizationId: 'seed-org-001',
      patientId: ahmadRashid.id,
      doctorId: doctorOmar.id,
      appointmentId: 'seed-appt-014',
      chiefComplaint: 'Routine quarterly follow-up for Type 2 diabetes and hypertension.',
      notes: 'HbA1c 7.9%. Fasting glucose 156 mg/dL. BP 144/88 — above target. Weight unchanged at 92 kg. No symptoms of hypoglycaemia. Denies polyuria or polydipsia. Peripheral sensation intact bilaterally.',
      diagnosis: 'Type 2 DM (E11.9) + Essential hypertension (I10) — suboptimal control',
      diagnosisCode: 'E11.9',
      vitals: {
        temperature: '37.0',
        bloodPressure: '144/88',
        heartRate: '80',
        oxygenSaturation: '97',
        weight: '92',
        height: '174',
      },
      treatmentPlan: 'Increase Metformin to 1000mg BD. Initiate Amlodipine 5mg OD for BP. Low-carbohydrate diet reinforcement. Follow up in 3 months with HbA1c.',
      followUpDate: daysAgo(-76),
      startedAt: daysAgo(14, 9, 5),
      endedAt: daysAgo(14, 9, 26),
    },
  }).catch(() => null) : null;

  const enc9 = yousefKhatib ? await prisma.encounter.upsert({
    where: { appointmentId: 'seed-appt-015' },
    update: {},
    create: {
      id: 'seed-enc-009',
      organizationId: 'seed-org-001',
      patientId: yousefKhatib.id,
      doctorId: doctorSamer.id,
      appointmentId: 'seed-appt-015',
      chiefComplaint: 'Worsening shortness of breath for 4 days. Increased sputum — yellow-green. Mild fever.',
      notes: 'Known COPD Gold Stage II. Temperature 37.9°C. O2 sat 92% on room air. Chest: bilateral wheeze, prolonged expiration, right basal crackles. Sputum purulent. Likely acute exacerbation with bacterial superinfection. CXR ordered: no consolidation. Started on short course of systemic steroids + antibiotics.',
      diagnosis: 'Acute exacerbation of COPD with suspected bacterial infection',
      diagnosisCode: 'J44.1',
      vitals: {
        temperature: '37.9',
        bloodPressure: '130/80',
        heartRate: '96',
        oxygenSaturation: '92',
        weight: '68',
        height: '169',
        respiratoryRate: '22',
      },
      treatmentPlan: 'Prednisone 40mg OD × 5 days. Amoxicillin-Clavulanate 1g BD × 7 days (avoid if true Pen allergy — NSAID allergy only, not Pen). Continue Salbutamol inhaler 2 puffs QID. Budesonide/Formoterol inhaler. Monitor O2 sat daily. Return if O2 <90% or dyspnoea worsens.',
      followUpDate: daysAgo(-7),
      startedAt: daysAgo(14, 10, 35),
      endedAt: daysAgo(14, 11, 0),
    },
  }).catch(() => null) : null;

  const enc10 = hassanBarakat ? await prisma.encounter.upsert({
    where: { appointmentId: 'seed-appt-016' },
    update: {},
    create: {
      id: 'seed-enc-010',
      organizationId: 'seed-org-001',
      patientId: hassanBarakat.id,
      doctorId: doctorSamer.id,
      appointmentId: 'seed-appt-016',
      chiefComplaint: 'Post-MI cardiac follow-up — 6 months post-STEMI. Feels well. Reports good exercise tolerance.',
      notes: 'No angina, dyspnoea, or palpitations. Echo last month: EF 48% (recovering from 38% post-MI). BP 124/78. HR 62 bpm. Dual antiplatelet therapy ongoing. No bleeding symptoms. Ankle oedema absent. Lung fields clear.',
      diagnosis: 'Old myocardial infarction — stable, recovering EF',
      diagnosisCode: 'I25.2',
      vitals: {
        temperature: '36.6',
        bloodPressure: '124/78',
        heartRate: '62',
        oxygenSaturation: '98',
        weight: '80',
        height: '172',
      },
      treatmentPlan: 'Continue Aspirin 100mg OD + Clopidogrel 75mg OD (dual antiplatelet until 12 months post-MI). Bisoprolol 5mg OD. Atorvastatin 80mg nocte. Ramipril 5mg OD. Repeat echo at 12 months. Cardiac rehab referral. No heavy lifting.',
      followUpDate: daysAgo(-90),
      startedAt: daysAgo(12, 9, 5),
      endedAt: daysAgo(12, 9, 28),
    },
  }).catch(() => null) : null;

  const enc11 = dimaKassab ? await prisma.encounter.upsert({
    where: { appointmentId: 'seed-appt-017' },
    update: {},
    create: {
      id: 'seed-enc-011',
      organizationId: 'seed-org-001',
      patientId: dimaKassab.id,
      doctorId: doctorOmar.id,
      appointmentId: 'seed-appt-017',
      chiefComplaint: 'Hypothyroidism 6-month follow-up. Reports improved energy. No palpitations.',
      notes: 'TSH 2.8 mIU/L (within target range 0.5–4.0). FT4 normal. No symptoms of under- or over-replacement. Weight stable. BP 118/74. Latex allergy documented — gloves avoided.',
      diagnosis: 'Hypothyroidism — well-controlled on current dose',
      diagnosisCode: 'E03.9',
      vitals: {
        temperature: '36.5',
        bloodPressure: '118/74',
        heartRate: '70',
        oxygenSaturation: '99',
        weight: '65',
        height: '168',
      },
      treatmentPlan: 'Continue Levothyroxine 75mcg OD (30 min before breakfast). Repeat TSH in 6 months. Avoid iron supplements within 4h of Levothyroxine dose.',
      followUpDate: daysAgo(-180),
      startedAt: daysAgo(10, 10, 5),
      endedAt: daysAgo(10, 10, 22),
    },
  }).catch(() => null) : null;

  const enc12 = rimShaaban ? await prisma.encounter.upsert({
    where: { appointmentId: 'seed-appt-018' },
    update: {},
    create: {
      id: 'seed-enc-012',
      organizationId: 'seed-org-001',
      patientId: rimShaaban.id,
      doctorId: doctorOmar.id,
      appointmentId: 'seed-appt-018',
      chiefComplaint: 'Annual osteoporosis review. Back is comfortable since starting treatment. No new fractures.',
      notes: 'T-score lumbar spine −2.8 on last DEXA (1 year ago). No vertebral fracture history. Good compliance with Alendronate. Dietary calcium intake adequate. No dental procedures planned. Vitamin D 32 ng/mL (adequate). Repeat DEXA scheduled.',
      diagnosis: 'Postmenopausal osteoporosis — stable on bisphosphonate',
      diagnosisCode: 'M81.0',
      vitals: {
        temperature: '36.4',
        bloodPressure: '126/78',
        heartRate: '72',
        oxygenSaturation: '98',
        weight: '58',
        height: '158',
      },
      treatmentPlan: 'Continue Alendronate 70mg once weekly (morning, fasting, upright posture for 30 min). Calcium Carbonate 1000mg + Vitamin D3 800 IU daily. Repeat DEXA in 2 years. Fall prevention counselling.',
      followUpDate: daysAgo(-365),
      startedAt: daysAgo(9, 9, 35),
      endedAt: daysAgo(9, 9, 55),
    },
  }).catch(() => null) : null;

  // Today's completed encounter — Ahmad Rashid morning visit
  const enc13 = ahmadRashid ? await prisma.encounter.upsert({
    where: { appointmentId: 'seed-appt-019' },
    update: {},
    create: {
      id: 'seed-enc-013',
      organizationId: 'seed-org-001',
      patientId: ahmadRashid.id,
      doctorId: doctorOmar.id,
      appointmentId: 'seed-appt-019',
      chiefComplaint: 'Hypertension and diabetes check-in. Reports stable glucose readings at home.',
      notes: 'HbA1c result from last lab 7.4% — on target. Fasting glucose today 132 mg/dL. BP 136/84 — mild elevation. No pedal oedema. Continues Metformin 1000mg BD. Amlodipine 5mg OD started last visit — tolerating well.',
      diagnosis: 'Type 2 DM (E11.9) + Essential hypertension (I10) — improving',
      diagnosisCode: 'E11.9',
      vitals: {
        temperature: '36.7',
        bloodPressure: '136/84',
        heartRate: '78',
        oxygenSaturation: '98',
        weight: '91',
        height: '174',
      },
      treatmentPlan: 'Increase Amlodipine to 10mg OD. Reinforce dietary adherence. Recheck BP in 4 weeks. Next HbA1c in 3 months. Continue current DM regimen.',
      followUpDate: daysAgo(-28),
      startedAt: todayAt(8, 5),
      endedAt: todayAt(8, 22),
    },
  }).catch(() => null) : null;

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

  // Enc 8 — DM+HTN follow-up 14 days ago (Ahmad Rashid)
  if (enc8) await prisma.prescription.upsert({
    where: { id: 'seed-rx-013' },
    update: { encounterId: enc8.id },
    create: {
      id: 'seed-rx-013',
      encounterId: enc8.id,
      medication: 'Metformin',
      dosage: '1000mg',
      frequency: 'Twice daily with meals',
      duration: '3 months',
      instructions: 'Take with meals to reduce GI side effects.',
      quantity: 180,
      refillsLeft: 2,
    },
  }).catch(() => null);

  if (enc8) await prisma.prescription.upsert({
    where: { id: 'seed-rx-014' },
    update: { encounterId: enc8.id },
    create: {
      id: 'seed-rx-014',
      encounterId: enc8.id,
      medication: 'Amlodipine',
      dosage: '5mg',
      frequency: 'Once daily (morning)',
      duration: '30 days',
      instructions: 'Take in the morning with water.',
      quantity: 30,
      refillsLeft: 2,
    },
  }).catch(() => null);

  // Enc 9 — COPD exacerbation (Yousef Khatib)
  if (enc9) await prisma.prescription.upsert({
    where: { id: 'seed-rx-015' },
    update: { encounterId: enc9.id },
    create: {
      id: 'seed-rx-015',
      encounterId: enc9.id,
      medication: 'Prednisone',
      dosage: '40mg',
      frequency: 'Once daily (morning)',
      duration: '5 days',
      instructions: 'Take in the morning with food. Do not stop abruptly.',
      quantity: 5,
      refillsLeft: 0,
    },
  }).catch(() => null);

  if (enc9) await prisma.prescription.upsert({
    where: { id: 'seed-rx-016' },
    update: { encounterId: enc9.id },
    create: {
      id: 'seed-rx-016',
      encounterId: enc9.id,
      medication: 'Amoxicillin-Clavulanate',
      dosage: '1g',
      frequency: 'Twice daily',
      duration: '7 days',
      instructions: 'Take with food to minimise GI upset. Complete the full course.',
      quantity: 14,
      refillsLeft: 0,
    },
  }).catch(() => null);

  if (enc9) await prisma.prescription.upsert({
    where: { id: 'seed-rx-017' },
    update: { encounterId: enc9.id },
    create: {
      id: 'seed-rx-017',
      encounterId: enc9.id,
      medication: 'Salbutamol Inhaler',
      dosage: '100mcg',
      frequency: '2 puffs four times daily + as needed',
      duration: 'Ongoing',
      instructions: 'Shake well before use. Rinse mouth after use if with spacer.',
      quantity: 2,
      refillsLeft: 2,
    },
  }).catch(() => null);

  // Enc 10 — Post-MI cardiac follow-up (Hassan Barakat)
  if (enc10) await prisma.prescription.upsert({
    where: { id: 'seed-rx-018' },
    update: { encounterId: enc10.id },
    create: {
      id: 'seed-rx-018',
      encounterId: enc10.id,
      medication: 'Aspirin',
      dosage: '100mg',
      frequency: 'Once daily',
      duration: 'Long-term',
      instructions: 'Take after meals. Do not stop without cardiology advice.',
      quantity: 90,
      refillsLeft: 3,
    },
  }).catch(() => null);

  if (enc10) await prisma.prescription.upsert({
    where: { id: 'seed-rx-019' },
    update: { encounterId: enc10.id },
    create: {
      id: 'seed-rx-019',
      encounterId: enc10.id,
      medication: 'Bisoprolol',
      dosage: '5mg',
      frequency: 'Once daily (morning)',
      duration: 'Long-term',
      instructions: 'Do not stop abruptly — taper under medical supervision.',
      quantity: 30,
      refillsLeft: 3,
    },
  }).catch(() => null);

  if (enc10) await prisma.prescription.upsert({
    where: { id: 'seed-rx-020' },
    update: { encounterId: enc10.id },
    create: {
      id: 'seed-rx-020',
      encounterId: enc10.id,
      medication: 'Atorvastatin',
      dosage: '80mg',
      frequency: 'Once daily (evening)',
      duration: 'Long-term',
      instructions: 'Take at bedtime. Report muscle cramps or weakness.',
      quantity: 30,
      refillsLeft: 3,
    },
  }).catch(() => null);

  if (enc10) await prisma.prescription.upsert({
    where: { id: 'seed-rx-021' },
    update: { encounterId: enc10.id },
    create: {
      id: 'seed-rx-021',
      encounterId: enc10.id,
      medication: 'Ramipril',
      dosage: '5mg',
      frequency: 'Once daily',
      duration: 'Long-term',
      instructions: 'May cause dry cough. Report persistent cough — alternative can be prescribed.',
      quantity: 30,
      refillsLeft: 3,
    },
  }).catch(() => null);

  // Enc 11 — Hypothyroidism (Dima Kassab)
  if (enc11) await prisma.prescription.upsert({
    where: { id: 'seed-rx-022' },
    update: { encounterId: enc11.id },
    create: {
      id: 'seed-rx-022',
      encounterId: enc11.id,
      medication: 'Levothyroxine',
      dosage: '75mcg',
      frequency: 'Once daily (30 min before breakfast)',
      duration: '6 months',
      instructions: 'Take on empty stomach. Avoid calcium, iron, or antacids within 4 hours.',
      quantity: 180,
      refillsLeft: 1,
    },
  }).catch(() => null);

  // Enc 12 — Osteoporosis (Rim Shaaban)
  if (enc12) await prisma.prescription.upsert({
    where: { id: 'seed-rx-023' },
    update: { encounterId: enc12.id },
    create: {
      id: 'seed-rx-023',
      encounterId: enc12.id,
      medication: 'Alendronate',
      dosage: '70mg',
      frequency: 'Once weekly (Sunday morning, fasting)',
      duration: 'Long-term',
      instructions: 'Take with a full glass of water. Remain upright for 30 minutes afterwards. Do not eat for 30 minutes after dose.',
      quantity: 4,
      refillsLeft: 5,
    },
  }).catch(() => null);

  if (enc12) await prisma.prescription.upsert({
    where: { id: 'seed-rx-024' },
    update: { encounterId: enc12.id },
    create: {
      id: 'seed-rx-024',
      encounterId: enc12.id,
      medication: 'Calcium Carbonate + Vitamin D3 (500mg/400IU)',
      dosage: '2 tablets',
      frequency: 'Once daily with main meal',
      duration: 'Long-term',
      instructions: 'Take with food. Do not take calcium within 2 hours of Alendronate.',
      quantity: 60,
      refillsLeft: 3,
    },
  }).catch(() => null);

  // Enc 13 — Today's visit — Ahmad Rashid (Amlodipine increase)
  if (enc13) await prisma.prescription.upsert({
    where: { id: 'seed-rx-025' },
    update: { encounterId: enc13.id },
    create: {
      id: 'seed-rx-025',
      encounterId: enc13.id,
      medication: 'Amlodipine',
      dosage: '10mg',
      frequency: 'Once daily (morning)',
      duration: '30 days',
      instructions: 'Increased from 5mg. Monitor for ankle swelling or flushing.',
      quantity: 30,
      refillsLeft: 2,
    },
  }).catch(() => null);

  // ── Lab Orders ──────────────────────────────────────────────────────────────
  await prisma.labOrder.upsert({
    where: { id: 'seed-lab-001' },
    update: {},
    create: {
      id: 'seed-lab-001',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: khalidMousa.id,
      encounterId: enc1.id,
      orderedById: doctorSamer.id,
      testName: 'Complete Blood Count',
      testCode: 'CBC',
      status: LabOrderStatus.REVIEWED,
      collectedAt: daysAgo(6, 9, 30),
      notes: 'Pre-medication adjustment baseline CBC.',
    },
  });

  await prisma.labOrder.upsert({
    where: { id: 'seed-lab-002' },
    update: {},
    create: {
      id: 'seed-lab-002',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: mohammadDiab.id,
      encounterId: enc5.id,
      orderedById: doctorOmar.id,
      testName: 'Glycated Haemoglobin (HbA1c)',
      testCode: 'HBA1C',
      status: LabOrderStatus.REVIEWED,
      collectedAt: daysAgo(2, 8, 0),
      notes: 'Quarterly glycaemic monitoring.',
    },
  });

  await prisma.labOrder.upsert({
    where: { id: 'seed-lab-003' },
    update: {},
    create: {
      id: 'seed-lab-003',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: mohammadDiab.id,
      encounterId: enc5.id,
      orderedById: doctorOmar.id,
      testName: 'Fasting Blood Glucose',
      testCode: 'FBG',
      status: LabOrderStatus.RESULTED,
      collectedAt: daysAgo(2, 8, 5),
    },
  });

  await prisma.labOrder.upsert({
    where: { id: 'seed-lab-004' },
    update: {},
    create: {
      id: 'seed-lab-004',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: nourIbrahim.id,
      encounterId: enc2.id,
      orderedById: doctorOmar.id,
      testName: 'Lipid Panel',
      testCode: 'LIPIDS',
      status: LabOrderStatus.RESULTED,
      collectedAt: daysAgo(6, 10, 15),
      notes: 'Annual cardiovascular risk screen.',
    },
  });

  await prisma.labOrder.upsert({
    where: { id: 'seed-lab-005' },
    update: {},
    create: {
      id: 'seed-lab-005',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: saraMahmoud.id,
      encounterId: enc4.id,
      orderedById: doctorOmar.id,
      testName: 'Liver Function Test',
      testCode: 'LFT',
      status: LabOrderStatus.SAMPLE_COLLECTED,
      collectedAt: daysAgo(3, 11, 30),
      notes: 'Anaemia workup — rule out hepatic involvement.',
    },
  });

  await prisma.labOrder.upsert({
    where: { id: 'seed-lab-006' },
    update: {},
    create: {
      id: 'seed-lab-006',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: tariqSaleh.id,
      encounterId: enc3.id,
      orderedById: doctorSamer.id,
      testName: 'Kidney Function Test',
      testCode: 'RFT',
      status: LabOrderStatus.ORDERED,
      notes: 'Pre-ACE inhibitor baseline renal function.',
    },
  });

  // ── Lab Results (for REVIEWED orders) ───────────────────────────────────────
  await prisma.labResult.upsert({
    where: { labOrderId: 'seed-lab-001' },
    update: {},
    create: {
      id: 'seed-lab-result-001',
      labOrderId: 'seed-lab-001',
      resultValue: 'WBC 6.8×10⁹/L | RBC 4.5×10¹²/L | Hgb 138 g/L | Hct 0.42 | PLT 224×10⁹/L | MCV 89 fL',
      unit: 'mixed',
      referenceRange: 'WBC 4–11 | RBC 4.2–5.4 | Hgb 130–175 | PLT 150–400',
      interpretation: 'NORMAL',
      resultNotes: 'All parameters within normal limits.',
      resultAt: daysAgo(5, 14, 0),
      reviewedById: doctorSamer.id,
      reviewedAt: daysAgo(5, 15, 30),
    },
  });

  await prisma.labResult.upsert({
    where: { labOrderId: 'seed-lab-002' },
    update: {},
    create: {
      id: 'seed-lab-result-002',
      labOrderId: 'seed-lab-002',
      resultValue: '7.6',
      unit: '%',
      referenceRange: '< 7.0% (diabetic target)',
      interpretation: 'HIGH',
      resultNotes: 'Improving from 8.2% three months ago. Continue current management.',
      resultAt: daysAgo(1, 10, 0),
      reviewedById: doctorOmar.id,
      reviewedAt: daysAgo(1, 11, 0),
    },
  });

  // ── Radiology Orders ─────────────────────────────────────────────────────────
  await prisma.radiologyOrder.upsert({
    where: { id: 'seed-rad-001' },
    update: {},
    create: {
      id: 'seed-rad-001',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: tariqSaleh.id,
      encounterId: enc3.id,
      orderedById: doctorSamer.id,
      modality: 'XR',
      bodyPart: 'Chest',
      clinicalInfo: 'Stable angina — assess cardiac silhouette and pulmonary vasculature.',
      status: RadiologyOrderStatus.RESULTED,
      priority: 'ROUTINE',
    },
  });

  await prisma.radiologyOrder.upsert({
    where: { id: 'seed-rad-002' },
    update: {},
    create: {
      id: 'seed-rad-002',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: saraMahmoud.id,
      encounterId: enc4.id,
      orderedById: doctorOmar.id,
      modality: 'US',
      bodyPart: 'Abdomen',
      clinicalInfo: 'Iron deficiency anaemia — rule out hepatosplenomegaly.',
      status: RadiologyOrderStatus.REVIEWED,
    },
  });

  await prisma.radiologyOrder.upsert({
    where: { id: 'seed-rad-003' },
    update: {},
    create: {
      id: 'seed-rad-003',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: khalidMousa.id,
      encounterId: enc1.id,
      orderedById: doctorSamer.id,
      modality: 'ECHO',
      bodyPart: 'Heart',
      clinicalInfo: 'HTN with suboptimal BP control — assess LV function and hypertrophy.',
      status: RadiologyOrderStatus.SCHEDULED,
      scheduledAt: todayAt(14, 0),
    },
  });

  // ── Radiology Reports (for REVIEWED orders) ──────────────────────────────────
  await prisma.radiologyReport.upsert({
    where: { radiologyOrderId: 'seed-rad-002' },
    update: {},
    create: {
      id: 'seed-rad-report-001',
      radiologyOrderId: 'seed-rad-002',
      findings: 'Liver: normal size and echotexture. No focal lesion. Gallbladder: normal, no calculi. Spleen: 11 cm, not enlarged. Kidneys: bilateral normal size and echogenicity. No free fluid. No abdominal mass.',
      impression: 'Normal abdominal ultrasound. No hepatosplenomegaly. No structural cause for anaemia identified.',
      reportedById: doctorOmar.id,
      reportedAt: daysAgo(2, 16, 0),
      reviewedById: doctorOmar.id,
      reviewedAt: daysAgo(2, 17, 0),
    },
  });

  // ── Invoices ─────────────────────────────────────────────────────────────────
  await prisma.invoice.upsert({
    where: { id: 'seed-inv-001' },
    update: {},
    create: {
      id: 'seed-inv-001',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: khalidMousa.id,
      encounterId: enc1.id,
      createdById: userAccountant.id,
      invoiceNumber: 'INV-SEED-001',
      status: InvoiceStatus.PAID,
      subtotal: 225.00,
      discountAmount: 0,
      totalAmount: 225.00,
      paidAmount: 225.00,
      issuedAt: daysAgo(7),
      dueDate: daysAgo(2),
      notes: 'HTN follow-up — cardiology consultation + echocardiography service.',
    },
  });

  await prisma.invoiceItem.upsert({
    where: { id: 'seed-inv-item-001' },
    update: {},
    create: {
      id: 'seed-inv-item-001',
      invoiceId: 'seed-inv-001',
      description: 'Cardiology Consultation',
      quantity: 1,
      unitPrice: 75.00,
      totalPrice: 75.00,
      discount: 0,
    },
  });

  await prisma.invoiceItem.upsert({
    where: { id: 'seed-inv-item-002' },
    update: {},
    create: {
      id: 'seed-inv-item-002',
      invoiceId: 'seed-inv-001',
      description: 'Echocardiography Service',
      quantity: 1,
      unitPrice: 150.00,
      totalPrice: 150.00,
      discount: 0,
    },
  });

  await prisma.invoice.upsert({
    where: { id: 'seed-inv-002' },
    update: {},
    create: {
      id: 'seed-inv-002',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: mohammadDiab.id,
      encounterId: enc5.id,
      createdById: userAccountant.id,
      invoiceNumber: 'INV-SEED-002',
      status: InvoiceStatus.PARTIALLY_PAID,
      subtotal: 110.00,
      discountAmount: 0,
      totalAmount: 110.00,
      paidAmount: 55.00,
      issuedAt: daysAgo(3),
      dueDate: daysAgo(-7),
      notes: 'DM quarterly follow-up — consultation + HbA1c + fasting glucose.',
    },
  });

  await prisma.invoiceItem.upsert({
    where: { id: 'seed-inv-item-003' },
    update: {},
    create: {
      id: 'seed-inv-item-003',
      invoiceId: 'seed-inv-002',
      description: 'General Medicine Consultation',
      quantity: 1,
      unitPrice: 50.00,
      totalPrice: 50.00,
      discount: 0,
    },
  });

  await prisma.invoiceItem.upsert({
    where: { id: 'seed-inv-item-004' },
    update: {},
    create: {
      id: 'seed-inv-item-004',
      invoiceId: 'seed-inv-002',
      description: 'HbA1c Laboratory Test',
      quantity: 1,
      unitPrice: 40.00,
      totalPrice: 40.00,
      discount: 0,
    },
  });

  await prisma.invoiceItem.upsert({
    where: { id: 'seed-inv-item-005' },
    update: {},
    create: {
      id: 'seed-inv-item-005',
      invoiceId: 'seed-inv-002',
      description: 'Fasting Blood Glucose Test',
      quantity: 1,
      unitPrice: 20.00,
      totalPrice: 20.00,
      discount: 0,
    },
  });

  await prisma.invoice.upsert({
    where: { id: 'seed-inv-003' },
    update: {},
    create: {
      id: 'seed-inv-003',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: saraMahmoud.id,
      encounterId: enc4.id,
      createdById: userAccountant.id,
      invoiceNumber: 'INV-SEED-003',
      status: InvoiceStatus.DRAFT,
      subtotal: 165.00,
      discountAmount: 10.00,
      totalAmount: 155.00,
      paidAmount: 0,
      notes: 'Anaemia workup — pending final lab results before issue.',
    },
  });

  await prisma.invoiceItem.upsert({
    where: { id: 'seed-inv-item-006' },
    update: {},
    create: {
      id: 'seed-inv-item-006',
      invoiceId: 'seed-inv-003',
      description: 'General Medicine Consultation',
      quantity: 1,
      unitPrice: 50.00,
      totalPrice: 50.00,
      discount: 0,
    },
  });

  await prisma.invoiceItem.upsert({
    where: { id: 'seed-inv-item-007' },
    update: {},
    create: {
      id: 'seed-inv-item-007',
      invoiceId: 'seed-inv-003',
      description: 'Abdominal Ultrasound',
      quantity: 1,
      unitPrice: 80.00,
      totalPrice: 80.00,
      discount: 0,
    },
  });

  await prisma.invoiceItem.upsert({
    where: { id: 'seed-inv-item-008' },
    update: {},
    create: {
      id: 'seed-inv-item-008',
      invoiceId: 'seed-inv-003',
      description: 'Liver Function Test',
      quantity: 1,
      unitPrice: 35.00,
      totalPrice: 35.00,
      discount: 0,
    },
  });

  await prisma.invoice.upsert({
    where: { id: 'seed-inv-004' },
    update: {},
    create: {
      id: 'seed-inv-004',
      organizationId: 'seed-org-001',
      branchId: 'seed-branch-001',
      patientId: tariqSaleh.id,
      encounterId: enc3.id,
      createdById: userAccountant.id,
      invoiceNumber: 'INV-SEED-004',
      status: InvoiceStatus.ISSUED,
      subtotal: 135.00,
      discountAmount: 0,
      totalAmount: 135.00,
      paidAmount: 0,
      issuedAt: daysAgo(5),
      dueDate: daysAgo(-14),
      notes: 'Stable angina assessment — cardiology consultation + chest X-ray.',
    },
  });

  await prisma.invoiceItem.upsert({
    where: { id: 'seed-inv-item-009' },
    update: {},
    create: {
      id: 'seed-inv-item-009',
      invoiceId: 'seed-inv-004',
      description: 'Cardiology Consultation',
      quantity: 1,
      unitPrice: 75.00,
      totalPrice: 75.00,
      discount: 0,
    },
  });

  await prisma.invoiceItem.upsert({
    where: { id: 'seed-inv-item-010' },
    update: {},
    create: {
      id: 'seed-inv-item-010',
      invoiceId: 'seed-inv-004',
      description: 'Chest X-Ray',
      quantity: 1,
      unitPrice: 60.00,
      totalPrice: 60.00,
      discount: 0,
    },
  });

  // ── Payments ─────────────────────────────────────────────────────────────────
  await prisma.payment.upsert({
    where: { id: 'seed-payment-001' },
    update: {},
    create: {
      id: 'seed-payment-001',
      invoiceId: 'seed-inv-001',
      amount: 225.00,
      method: PaymentMethod.CASH,
      notes: 'Full payment received at reception.',
      paidAt: daysAgo(7, 10, 0),
      receivedById: userAccountant.id,
    },
  });

  await prisma.payment.upsert({
    where: { id: 'seed-payment-002' },
    update: {},
    create: {
      id: 'seed-payment-002',
      invoiceId: 'seed-inv-002',
      amount: 55.00,
      method: PaymentMethod.CASH,
      notes: 'Partial payment — balance $55.00 outstanding.',
      paidAt: daysAgo(3, 10, 0),
      receivedById: userAccountant.id,
    },
  });

  // ── Clinical Reports ─────────────────────────────────────────────────────────
  await prisma.clinicalReport.upsert({
    where: { id: 'seed-clinical-001' },
    update: {},
    create: {
      id: 'seed-clinical-001',
      organizationId: 'seed-org-001',
      patientId: khalidMousa.id,
      encounterId: enc1.id,
      createdById: drSamerUser.id,
      title: 'Hypertension Follow-Up Visit',
      status: ClinicalReportStatus.FINALIZED,
      content: `PATIENT: Khalid Mousa | MRN: MRN-000002 | DOB: 1981-03-15 | GENDER: Male
DATE OF VISIT: ${daysAgo(7).toLocaleDateString('en-GB')}
ATTENDING PHYSICIAN: Dr. Samer Hassan — Cardiology

CHIEF COMPLAINT
Follow-up for essential hypertension. Patient reports elevated home BP readings and occasional morning headaches.

HISTORY OF PRESENT ILLNESS
Mr. Khalid Mousa is a 44-year-old male with essential hypertension managed on Amlodipine 5mg + Lisinopril 10mg. Reports good medication compliance. Home BP log shows persistent readings of 150–160/90–95 mmHg over 2 weeks. Occasional morning headaches. No chest pain, dyspnoea, or ankle swelling.

EXAMINATION
Vitals: BP 148/92 mmHg | HR 78 bpm | SpO₂ 98% | Weight 83 kg | Height 175 cm
Cardiovascular: Regular rate and rhythm. No murmurs. No pedal oedema.
Respiratory: Clear bilaterally.

INVESTIGATIONS
CBC: All parameters within normal limits.
Echocardiogram: Scheduled.

ASSESSMENT
Essential hypertension — suboptimal control on current regimen.

PLAN
1. Increase Amlodipine to 10mg OD.
2. Continue Lisinopril 10mg OD.
3. Low-sodium diet and 30-minute daily walking.
4. Repeat BP check in 2 weeks. Echocardiogram scheduled.

FOLLOW-UP: 2 weeks.`,
    },
  });

  await prisma.clinicalReport.upsert({
    where: { id: 'seed-clinical-002' },
    update: {},
    create: {
      id: 'seed-clinical-002',
      organizationId: 'seed-org-001',
      patientId: mohammadDiab.id,
      encounterId: enc5.id,
      createdById: drOmarUser.id,
      title: 'Diabetes Mellitus Quarterly Review',
      status: ClinicalReportStatus.FINALIZED,
      content: `PATIENT: Mohammad Diab | MRN: MRN-000006 | DOB: 1961-11-30 | GENDER: Male
DATE OF VISIT: ${daysAgo(3).toLocaleDateString('en-GB')}
ATTENDING PHYSICIAN: Dr. Omar Saleh — General Medicine

CHIEF COMPLAINT
Quarterly diabetes mellitus review. Previous HbA1c 8.2% (3 months ago). Patient reports improved dietary compliance.

HISTORY OF PRESENT ILLNESS
Mr. Mohammad Diab is a 63-year-old male with Type 2 Diabetes Mellitus on Metformin 1000mg BD. HbA1c today 7.6% — an improvement of 0.6% from the prior reading. No hypoglycaemic episodes. BP 134/82 mmHg.

EXAMINATION
Vitals: BP 134/82 mmHg | HR 76 bpm | SpO₂ 97% | Weight 88 kg | Height 170 cm | BMI 30.4
Feet: No ulcers. Peripheral sensation intact bilaterally (10g monofilament).
Fundoscopy (last month): No diabetic retinopathy.

INVESTIGATIONS
HbA1c: 7.6% (improving from 8.2%) — above target < 7.0%.
Fasting Glucose: 142 mg/dL.

ASSESSMENT
Type 2 DM — glycaemic control improving but not yet at target.

PLAN
1. Continue Metformin 1000mg BD.
2. Add Empagliflozin 10mg OD.
3. Target HbA1c < 7.0% by next review.
4. Reinforce dietary adherence and 150 min/week moderate activity.
5. Annual lipid panel, nephrology screen, and foot exam.

FOLLOW-UP: 3 months.`,
    },
  });

  await prisma.clinicalReport.upsert({
    where: { id: 'seed-clinical-003' },
    update: {},
    create: {
      id: 'seed-clinical-003',
      organizationId: 'seed-org-001',
      patientId: saraMahmoud.id,
      encounterId: enc4.id,
      createdById: drOmarUser.id,
      title: 'Anaemia Assessment — Working Note',
      status: ClinicalReportStatus.DRAFT,
      content: `PATIENT: Sara Mahmoud | MRN: MRN-000001 | DOB: 1992-03-14 | GENDER: Female
DATE OF VISIT: ${daysAgo(4).toLocaleDateString('en-GB')}
ATTENDING PHYSICIAN: Dr. Omar Saleh — General Medicine

[DRAFT — Awaiting final laboratory results before finalisation]

CHIEF COMPLAINT
Mild fatigue and light-headedness for 2 weeks. No fever. No weight loss.

PROVISIONAL ASSESSMENT
Iron deficiency anaemia — suspected. CBC and serum ferritin ordered. Abdominal US normal (no hepatosplenomegaly). LFT pending.

INTERIM PLAN
Ferrous Sulfate 325mg TID with orange juice.
Dietary counselling provided.
Review in 4 weeks with CBC and ferritin results.

[To be finalised once lab results are reviewed.]`,
    },
  });

  // ── Clinic Settings (org-001) ────────────────────────────────────────────
  const clinicSettings = await prisma.clinicSettings.upsert({
    where: { organizationId: 'seed-org-001' },
    update: { defaultSlotMin: 20, lunchStartTime: '13:30', lunchEndTime: '14:30', timezone: 'Asia/Damascus' },
    create: {
      id: 'seed-settings-001',
      organizationId: 'seed-org-001',
      defaultSlotMin: 20,
      lunchStartTime: '13:30',
      lunchEndTime: '14:30',
      timezone: 'Asia/Damascus',
    },
  });

  // Working days: Sun–Thu open 08:00–17:00, Fri–Sat closed
  const workingDays = [
    { dayOfWeek: 0, startTime: '08:00', endTime: '17:00', isOpen: true },  // Sun
    { dayOfWeek: 1, startTime: '08:00', endTime: '17:00', isOpen: true },  // Mon
    { dayOfWeek: 2, startTime: '08:00', endTime: '17:00', isOpen: true },  // Tue
    { dayOfWeek: 3, startTime: '08:00', endTime: '17:00', isOpen: true },  // Wed
    { dayOfWeek: 4, startTime: '08:00', endTime: '17:00', isOpen: true },  // Thu
    { dayOfWeek: 5, startTime: '08:00', endTime: '13:00', isOpen: false }, // Fri
    { dayOfWeek: 6, startTime: '08:00', endTime: '13:00', isOpen: false }, // Sat
  ];
  for (const wd of workingDays) {
    await prisma.clinicWorkingDay.upsert({
      where: { clinicSettingsId_dayOfWeek: { clinicSettingsId: clinicSettings.id, dayOfWeek: wd.dayOfWeek } },
      update: { startTime: wd.startTime, endTime: wd.endTime, isOpen: wd.isOpen },
      create: { ...wd, clinicSettingsId: clinicSettings.id },
    });
  }

  // ── Visit Types (org-001) ─────────────────────────────────────────────────
  const visitTypes: Array<{
    id: string;
    code: VisitTypeCode;
    name: string;
    nameAr: string;
    color: string;
    durationMinutes: number;
    basePrice: number | null;
  }> = [
    {
      id: 'seed-vt-consultation',
      code: VisitTypeCode.CONSULTATION,
      name: 'Consultation',
      nameAr: 'استشارة',
      color: '#3B82F6',
      durationMinutes: 20,
      basePrice: 50.00,
    },
    {
      id: 'seed-vt-followup',
      code: VisitTypeCode.FOLLOW_UP,
      name: 'Follow-Up',
      nameAr: 'متابعة',
      color: '#10B981',
      durationMinutes: 15,
      basePrice: 30.00,
    },
    {
      id: 'seed-vt-emergency',
      code: VisitTypeCode.EMERGENCY,
      name: 'Emergency',
      nameAr: 'طارئ',
      color: '#EF4444',
      durationMinutes: 30,
      basePrice: 100.00,
    },
    {
      id: 'seed-vt-procedure',
      code: VisitTypeCode.PROCEDURE,
      name: 'Procedure',
      nameAr: 'إجراء طبي',
      color: '#8B5CF6',
      durationMinutes: 45,
      basePrice: 150.00,
    },
    {
      id: 'seed-vt-free',
      code: VisitTypeCode.FREE_VISIT,
      name: 'Free Visit',
      nameAr: 'زيارة مجانية',
      color: '#6B7280',
      durationMinutes: 20,
      basePrice: 0.00,
    },
  ];

  for (const vt of visitTypes) {
    await prisma.visitType.upsert({
      where: { organizationId_code: { organizationId: 'seed-org-001', code: vt.code } },
      update: { name: vt.name, nameAr: vt.nameAr, color: vt.color, durationMinutes: vt.durationMinutes, basePrice: vt.basePrice },
      create: { ...vt, organizationId: 'seed-org-001' },
    });
  }

  // ── Services Catalog (org-001) ────────────────────────────────────────────
  const services = [
    { id: 'seed-svc-ecg',        code: 'ECG',        name: 'ECG',                    nameAr: 'تخطيط القلب الكهربائي',           departmentId: 'seed-dept-001', defaultPrice: 25.00 },
    { id: 'seed-svc-echo',       code: 'ECHO',       name: 'Echocardiography',        nameAr: 'صدى القلب',                       departmentId: 'seed-dept-001', defaultPrice: 60.00 },
    { id: 'seed-svc-abd-us',     code: 'ABD_US',     name: 'Abdominal Ultrasound',    nameAr: 'الموجات فوق الصوتية للبطن',       departmentId: null,            defaultPrice: 40.00 },
    { id: 'seed-svc-injection',  code: 'INJECTION',  name: 'Injection Service',       nameAr: 'حقنة',                            departmentId: 'seed-dept-002', defaultPrice: 5.00  },
    { id: 'seed-svc-dressing',   code: 'DRESSING',   name: 'Wound Dressing',          nameAr: 'تضميد الجرح',                     departmentId: 'seed-dept-002', defaultPrice: 8.00  },
    { id: 'seed-svc-nebulizer',  code: 'NEBULIZER',  name: 'Nebulizer Treatment',     nameAr: 'جهاز البخار',                     departmentId: 'seed-dept-002', defaultPrice: 10.00 },
    { id: 'seed-svc-cbc',        code: 'CBC',        name: 'Complete Blood Count',    nameAr: 'صورة دم كاملة',                   departmentId: null,            defaultPrice: 15.00 },
    { id: 'seed-svc-hba1c',      code: 'HBA1C',      name: 'HbA1c Test',             nameAr: 'فحص السكر التراكمي',               departmentId: null,            defaultPrice: 20.00 },
    { id: 'seed-svc-lipid',      code: 'LIPID_PANEL',name: 'Lipid Panel',             nameAr: 'تحليل دهون الدم',                 departmentId: null,            defaultPrice: 20.00 },
    { id: 'seed-svc-xray-chest', code: 'XRAY_CHEST', name: 'Chest X-Ray',             nameAr: 'أشعة سينية للصدر',                departmentId: null,            defaultPrice: 30.00 },
  ];

  for (const svc of services) {
    await prisma.service.upsert({
      where: { organizationId_code: { organizationId: 'seed-org-001', code: svc.code } },
      update: { name: svc.name, nameAr: svc.nameAr, defaultPrice: svc.defaultPrice },
      create: { ...svc, organizationId: 'seed-org-001' },
    });
  }

  // ── Doctor Schedules (org-001) ─────────────────────────────────────────────
  // Sun(0)–Thu(4) 08:00–16:00 for Samer (Cardiology) and Omar (General Medicine)
  // Sun(0)–Thu(4) 08:00–14:00 for Layla (Pediatrics, shorter morning shift)
  const doctorScheduleSeed = [
    // Dr. Samer Hassan — Cardiology, Sun–Thu 08:00–16:00
    { doctorId: doctorSamer.id, dayOfWeek: 0, startTime: '08:00', endTime: '16:00' },
    { doctorId: doctorSamer.id, dayOfWeek: 1, startTime: '08:00', endTime: '16:00' },
    { doctorId: doctorSamer.id, dayOfWeek: 2, startTime: '08:00', endTime: '16:00' },
    { doctorId: doctorSamer.id, dayOfWeek: 3, startTime: '08:00', endTime: '16:00' },
    { doctorId: doctorSamer.id, dayOfWeek: 4, startTime: '08:00', endTime: '16:00' },
    // Dr. Layla Nasser — Pediatrics, Sun–Thu 08:00–14:00
    { doctorId: doctorLayla.id, dayOfWeek: 0, startTime: '08:00', endTime: '14:00' },
    { doctorId: doctorLayla.id, dayOfWeek: 1, startTime: '08:00', endTime: '14:00' },
    { doctorId: doctorLayla.id, dayOfWeek: 2, startTime: '08:00', endTime: '14:00' },
    { doctorId: doctorLayla.id, dayOfWeek: 3, startTime: '08:00', endTime: '14:00' },
    { doctorId: doctorLayla.id, dayOfWeek: 4, startTime: '08:00', endTime: '14:00' },
    // Dr. Omar Saleh — General Medicine, Sun–Thu 08:00–17:00
    { doctorId: doctorOmar.id, dayOfWeek: 0, startTime: '08:00', endTime: '17:00' },
    { doctorId: doctorOmar.id, dayOfWeek: 1, startTime: '08:00', endTime: '17:00' },
    { doctorId: doctorOmar.id, dayOfWeek: 2, startTime: '08:00', endTime: '17:00' },
    { doctorId: doctorOmar.id, dayOfWeek: 3, startTime: '08:00', endTime: '17:00' },
    { doctorId: doctorOmar.id, dayOfWeek: 4, startTime: '08:00', endTime: '17:00' },
  ];

  for (const s of doctorScheduleSeed) {
    await prisma.doctorSchedule.upsert({
      where: { doctorId_dayOfWeek: { doctorId: s.doctorId, dayOfWeek: s.dayOfWeek } },
      update: { startTime: s.startTime, endTime: s.endTime, isActive: true },
      create: { ...s, isActive: true },
    });
  }

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║        Al-Nour Medical Center — Demo Seed Ready (B18.0)      ║
╠══════════════════════════════════════════════════════════════╣
║  Demo Accounts                                               ║
║  ─────────────────────────────────────────────────────────  ║
║  SUPER ADMIN   +963900000001  /  password123                 ║
║  ORG ADMIN     +963912345678  /  password123                 ║
║  SECRETARY     +963912002001  /  password123                 ║
║  NURSE         +963912003001  /  password123                 ║
║  DOCTOR        +963912001001  /  password123  (Cardiology)   ║
║  DOCTOR        +963912001002  /  password123  (Pediatrics)   ║
║  DOCTOR        +963912001003  /  password123  (General Med)  ║
║  ACCOUNTANT    +963912004001  /  password123  (Rana Mansour) ║
║  TECHNICIAN    +963912005001  /  password123  (Yousef Haddad)║
╠══════════════════════════════════════════════════════════════╣
║  Data Summary                                                ║
║  ─────────────────────────────────────────────────────────  ║
║  Patients: 20  │  Appointments: 28  │  Doctors: 3           ║
║  Encounters: 13  │  Prescriptions: 25  │  Allergies: 6      ║
║  Lab Orders: 6  │  Radiology Orders: 3                       ║
║  Invoices: 4  │  Payments: 2  │  Clinical Reports: 3        ║
║  Today: 8 appts (2 DONE / 1 IN_PROGRESS / 3 CHECKED_IN+CONF / 1 NO_SHOW)
║  Visit Types: 5  │  Services: 10  │  Clinic Settings: 1     ║
║  Doctor Schedules: 15 (3 doctors × 5 days)                  ║
╚══════════════════════════════════════════════════════════════╝
  `);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
