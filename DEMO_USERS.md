# SDHP Demo Accounts

All demo accounts use the password: **`password123`**

The demo clinic is **Al-Nour Medical Center** (Damascus, Syria).

---

## Accounts by Role

### Super Admin
> Platform-level access. Can manage all organizations and users.

| Field    | Value              |
|----------|--------------------|
| Phone    | +963900000001      |
| Password | password123        |
| Name     | Super Admin        |
| Email    | superadmin@sdhp.sy |
| Scope    | All organizations  |

---

### Org Admin
> Manages Al-Nour Medical Center. Can create appointments, view all patients and doctors.

| Field    | Value              |
|----------|--------------------|
| Phone    | +963912345678      |
| Password | password123        |
| Name     | Ahmad Khalil       |
| Email    | admin@alnour.sy    |
| Scope    | Al-Nour Medical Center |

**Best for demoing:** dashboard stats, patient list, appointment management, doctor roster.

---

### Secretary (Reception)
> Front-desk role. Creates appointments and checks patients into the queue.

| Field    | Value               |
|----------|---------------------|
| Phone    | +963912002001       |
| Password | password123         |
| Name     | Sara Qassem         |
| Email    | reception@alnour.sy |
| Scope    | Al-Nour — Damascus Main Branch |

**Best for demoing:** walk-in check-in flow, queue management, new appointment creation.

---

### Doctor — Cardiology
> Dr. Samer Hassan. Cardiology department.

| Field          | Value                |
|----------------|----------------------|
| Phone          | +963912001001        |
| Password       | password123          |
| Name           | Dr. Samer Hassan     |
| Email          | samer.hassan@alnour.sy |
| Specialization | Cardiology           |
| License        | SY-CARD-2018-0421    |

**Best for demoing:** doctor queue view, starting an encounter, recording vitals + diagnosis, ending encounter.

---

### Doctor — Pediatrics
> Dr. Layla Nasser. Pediatrics department.

| Field          | Value                 |
|----------------|-----------------------|
| Phone          | +963912001002         |
| Password       | password123           |
| Name           | Dr. Layla Nasser      |
| Email          | layla.nasser@alnour.sy |
| Specialization | Pediatrics            |
| License        | SY-PED-2020-0873      |

---

### Doctor — General Medicine
> Dr. Omar Saleh. General Medicine department.

| Field          | Value                |
|----------------|----------------------|
| Phone          | +963912001003        |
| Password       | password123          |
| Name           | Dr. Omar Saleh       |
| Email          | omar.saleh@alnour.sy |
| Specialization | General Medicine     |
| License        | SY-GM-2015-0212      |

---

## Demo Patients (Selected)

| Name            | MRN     | Notes                                |
|-----------------|---------|--------------------------------------|
| Khalid Mousa    | MRN-002 | Hypertension — Dr. Samer (Cardiology) |
| Nour Ibrahim    | MRN-003 | Vitamin D deficiency                 |
| Tariq Saleh     | MRN-004 | Angina — completed encounter         |
| Sara Mahmoud    | MRN-001 | Anaemia — Ferrous Sulfate prescribed |
| Lina Ahmad      | MRN-006 | Paediatric checkup — Dr. Layla       |
| Mohammad Diab   | MRN-007 | Type 2 diabetes — Dr. Omar           |

---

## Suggested Demo Script

1. **Login as Secretary** (+963912002001)
   - Show the dashboard: live appointment count, queue status
   - Navigate to Appointments, show today's scheduled patients
   - Use Walk-in to create a new appointment and issue a queue ticket

2. **Switch to Doctor** (+963912001001)
   - Show "My Patients" queue with the waiting patient
   - Start an encounter, fill vitals and diagnosis, save, then end

3. **Switch to Org Admin** (+963912345678)
   - Show the Patients list with search
   - Open a patient profile, view Medical History (timeline)
   - Show historical encounters with ICD codes and prescriptions

4. **Return to Dashboard**
   - Highlight live stats updating after completed encounter
