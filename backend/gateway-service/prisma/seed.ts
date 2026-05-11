import { PrismaClient, UserRole, AppointmentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Clear existing data (order matters)
  await prisma.auditLog.deleteMany();
  await prisma.voiceSession.deleteMany();
  await prisma.aISession.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Clinova@123', salt);

  // 2. Create Doctors
  const doc1 = await prisma.user.create({
    data: {
      email: 'dr.smith@clinova.com',
      passwordHash,
      role: UserRole.DOCTOR,
      firstName: 'Sarah',
      lastName: 'Smith',
      doctorProfile: {
        create: {
          licenseNumber: 'MD-778899',
          specialization: 'Cardiology',
          department: 'Heart & Vascular',
        }
      }
    },
    include: { doctorProfile: true }
  });

  // 3. Create Patients
  const patientsData = [
    { email: 'maria.jones@example.com', first: 'Maria', last: 'Jones', dob: '1990-05-15', gender: 'Female', blood: 'O+' },
    { email: 'robert.chen@example.com', first: 'Robert', last: 'Chen', dob: '1985-11-22', gender: 'Male', blood: 'A-' },
    { email: 'sarah.j@example.com', first: 'Sarah', last: 'Jenkins', dob: '1978-02-10', gender: 'Female', blood: 'B+' },
    { email: 'm.thompson@example.com', first: 'Marcus', last: 'Thompson', dob: '1995-09-30', gender: 'Male', blood: 'AB+' },
  ];

  const createdPatients = [];
  for (const p of patientsData) {
    const user = await prisma.user.create({
      data: {
        email: p.email,
        passwordHash,
        role: UserRole.PATIENT,
        firstName: p.first,
        lastName: p.last,
        patientProfile: {
          create: {
            dateOfBirth: new Date(p.dob),
            gender: p.gender,
            bloodType: p.blood,
          }
        }
      },
      include: { patientProfile: true }
    });
    createdPatients.push(user.patientProfile);
  }

  // 4. Create Appointments
  for (let i = 0; i < 5; i++) {
    await prisma.appointment.create({
      data: {
        patientId: createdPatients[i % createdPatients.length].id,
        doctorId: doc1.doctorProfile.id,
        scheduledAt: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
        status: AppointmentStatus.SCHEDULED,
        notes: `Follow-up visit ${i + 1}`,
      }
    });
  }

  // 5. Create some Audit Logs
  await prisma.auditLog.create({
    data: {
      userId: doc1.id,
      action: 'LOGIN',
      resource: 'AUTH',
      ipAddress: '127.0.0.1',
      metadata: { browser: 'Chrome', os: 'MacOS' }
    }
  });

  // 6. Create FHIR Observations
  const observations = [
    { type: 'Blood Pressure', value: '120/80 mmHg', date: '2026-05-01' },
    { type: 'Heart Rate', value: '72 bpm', date: '2026-05-02' },
    { type: 'Glucose', value: '95 mg/dL', date: '2026-05-03' },
    { type: 'Weight', value: '70 kg', date: '2026-05-04' },
  ];

  for (const obs of observations) {
    await prisma.fhirResource.create({
      data: {
        resourceType: 'Observation',
        fhirId: `obs-${Math.random().toString(36).substr(2, 9)}`,
        patientFhirId: createdPatients[0].fhirPatientId || 'patient-1',
        data: {
          resourceType: 'Observation',
          status: 'final',
          code: { text: obs.type },
          valueQuantity: { value: obs.value },
          effectiveDateTime: new Date(obs.date).toISOString(),
        }
      }
    });
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
