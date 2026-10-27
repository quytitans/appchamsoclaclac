// Seed dữ liệu demo cho tính năng "nhiều sổ tiêm chủng/account" — chỉ dùng để test ở local.
// Chạy: npm run seed:vaccines (trong thư mục server)
// Đăng nhập account "laclac" / PIN 1111 để xem kết quả.
import { db } from "../src/db/index.js";

const ACCOUNT = "laclac";

function clearExisting() {
  const profiles = db.prepare("SELECT id FROM vaccine_profiles WHERE account = ?").all(ACCOUNT) as {
    id: number;
  }[];
  for (const p of profiles) {
    const vaccineIds = db.prepare("SELECT id FROM vaccines WHERE profile_id = ?").all(p.id) as { id: number }[];
    for (const v of vaccineIds) {
      db.prepare("DELETE FROM vaccine_doses WHERE vaccine_id = ?").run(v.id);
    }
    db.prepare("DELETE FROM vaccines WHERE profile_id = ?").run(p.id);
  }
  db.prepare("DELETE FROM vaccine_profiles WHERE account = ?").run(ACCOUNT);
}

type DurationType = "lifetime" | "limited" | "yearly";
type ProfileType = "baby" | "male" | "female" | "cat" | "dog";

interface SeedDose {
  doseNumber: number;
  date: string;
  planned?: boolean;
  location?: string;
}

interface SeedVaccine {
  diseaseName: string;
  vaccineName: string;
  totalDoses?: number;
  durationType: DurationType;
  durationYears?: number;
  doses: SeedDose[];
}

interface SeedProfile {
  name: string;
  profileType: ProfileType;
  reminderEmails?: string[];
  vaccines: SeedVaccine[];
}

const today = new Date();
function daysFromToday(delta: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

const PROFILES: SeedProfile[] = [
  {
    name: "Bé Kem",
    profileType: "baby",
    reminderEmails: ["me@example.com"],
    vaccines: [
      {
        diseaseName: "Lao",
        vaccineName: "BCG",
        totalDoses: 1,
        durationType: "lifetime",
        doses: [{ doseNumber: 1, date: daysFromToday(-200) }],
      },
      {
        diseaseName: "Bạch hầu - Ho gà - Uốn ván - Bại liệt - Hib - Viêm gan B",
        vaccineName: "6 trong 1 (Hexaxim)",
        totalDoses: 4,
        durationType: "limited",
        durationYears: 5,
        doses: [
          { doseNumber: 1, date: daysFromToday(-180) },
          { doseNumber: 2, date: daysFromToday(-150) },
          { doseNumber: 3, date: daysFromToday(-5), planned: true },
        ],
      },
      {
        diseaseName: "Cúm mùa",
        vaccineName: "Vaxigrip Tetra",
        durationType: "yearly",
        doses: [{ doseNumber: 1, date: daysFromToday(-30) }],
      },
    ],
  },
  {
    name: "Bố Minh",
    profileType: "male",
    vaccines: [
      {
        diseaseName: "Uốn ván",
        vaccineName: "VAT",
        durationType: "limited",
        durationYears: 10,
        doses: [{ doseNumber: 1, date: daysFromToday(-900) }],
      },
      {
        diseaseName: "Cúm mùa",
        vaccineName: "Influvac Tetra",
        durationType: "yearly",
        doses: [{ doseNumber: 1, date: daysFromToday(3), planned: true }],
      },
    ],
  },
  {
    name: "Mẹ Lan",
    profileType: "female",
    vaccines: [
      {
        diseaseName: "Ung thư cổ tử cung (HPV)",
        vaccineName: "Gardasil 9",
        totalDoses: 3,
        durationType: "limited",
        durationYears: 15,
        doses: [
          { doseNumber: 1, date: daysFromToday(-400) },
          { doseNumber: 2, date: daysFromToday(-200) },
          { doseNumber: 3, date: daysFromToday(-1), planned: true },
        ],
      },
    ],
  },
  {
    name: "Mướp",
    profileType: "cat",
    vaccines: [
      {
        diseaseName: "Dại",
        vaccineName: "Rabisin",
        durationType: "yearly",
        doses: [{ doseNumber: 1, date: daysFromToday(-350) }],
      },
      {
        diseaseName: "Giảm bạch cầu - Viêm mũi khí quản - Calicivirus (FVRCP)",
        vaccineName: "Purevax RCP",
        totalDoses: 2,
        durationType: "limited",
        durationYears: 1,
        doses: [
          { doseNumber: 1, date: daysFromToday(-60) },
          { doseNumber: 2, date: daysFromToday(10), planned: true },
        ],
      },
    ],
  },
  {
    name: "Lu Lu",
    profileType: "dog",
    vaccines: [
      {
        diseaseName: "Dại",
        vaccineName: "Nobivac Rabies",
        durationType: "yearly",
        doses: [{ doseNumber: 1, date: daysFromToday(-20) }],
      },
      {
        diseaseName: "Care - Viêm gan - Lepto - Parvo - Ho cũi chó (5 bệnh)",
        vaccineName: "Vanguard Plus 5",
        totalDoses: 3,
        durationType: "limited",
        durationYears: 1,
        doses: [
          { doseNumber: 1, date: daysFromToday(-90) },
          { doseNumber: 2, date: daysFromToday(-60) },
          { doseNumber: 3, date: daysFromToday(-2), planned: true },
        ],
      },
    ],
  },
];

function run() {
  clearExisting();
  let profileSortOrder = 0;
  for (const profile of PROFILES) {
    const profileResult = db
      .prepare(
        `INSERT INTO vaccine_profiles (account, name, profile_type, reminder_emails, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        ACCOUNT,
        profile.name,
        profile.profileType,
        profile.reminderEmails ? JSON.stringify(profile.reminderEmails) : null,
        profileSortOrder++,
        new Date().toISOString()
      );
    const profileId = profileResult.lastInsertRowid as number;

    let vaccineSortOrder = 0;
    for (const vaccine of profile.vaccines) {
      const vaccineResult = db
        .prepare(
          `INSERT INTO vaccines (account, profile_id, disease_name, vaccine_name, total_doses, duration_type, duration_years, expiry_month, expiry_year, next_dose_date, note, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?)`
        )
        .run(
          ACCOUNT,
          profileId,
          vaccine.diseaseName,
          vaccine.vaccineName,
          vaccine.totalDoses ?? null,
          vaccine.durationType,
          vaccine.durationType === "limited" ? vaccine.durationYears ?? null : null,
          vaccineSortOrder++,
          new Date().toISOString()
        );
      const vaccineId = vaccineResult.lastInsertRowid as number;

      for (const dose of vaccine.doses) {
        db.prepare(
          `INSERT INTO vaccine_doses (vaccine_id, dose_number, location, date, note, planned, created_at)
           VALUES (?, ?, ?, ?, NULL, ?, ?)`
        ).run(
          vaccineId,
          dose.doseNumber,
          dose.location ?? null,
          dose.date,
          dose.planned ? 1 : 0,
          new Date().toISOString()
        );
      }

      if (vaccine.durationType === "limited" && vaccine.durationYears) {
        const dose1 = vaccine.doses.find((d) => d.doseNumber === 1 && !d.planned);
        if (dose1) {
          const [y, m] = dose1.date.split("-").map(Number);
          db.prepare("UPDATE vaccines SET expiry_month = ?, expiry_year = ? WHERE id = ?").run(
            m,
            y + vaccine.durationYears,
            vaccineId
          );
        }
      }
    }
  }

  console.log(`Đã seed ${PROFILES.length} sổ tiêm chủng cho account "${ACCOUNT}" (đăng nhập: laclac / PIN 1111).`);
}

run();
