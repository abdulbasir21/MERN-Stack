/**
 * SafeCity Complaint Portal — Seed Script
 * Run: npm run seed
 *
 * Creates:
 *  - 1 admin, 4 officers, 1 citizen (all password: Demo@123)
 *  - 25 sample complaints across categories, areas, and statuses
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Complaint = require('./models/Complaint');

const AREAS = ['Sector 5', 'Greenview', 'North District', 'Riverside', 'Old Town', 'Eastgate'];

const DEMO_PASSWORD = 'Demo@123';

// ─── Seed users ───────────────────────────────────────────────────────────────
const seedUsers = [
  { name: 'Admin User',      email: 'admin@safecity.demo',    role: 'admin' },
  { name: 'Officer Reyes',   email: 'officer1@safecity.demo', role: 'officer' },
  { name: 'Officer Khan',    email: 'officer2@safecity.demo', role: 'officer' },
  { name: 'Officer Patel',   email: 'officer3@safecity.demo', role: 'officer' },
  { name: 'Officer Nguyen',  email: 'officer4@safecity.demo', role: 'officer' },
  { name: 'Demo Citizen',    email: 'citizen@safecity.demo',  role: 'citizen' },
];

// ─── Helper: days ago ─────────────────────────────────────────────────────────
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅  Connected to MongoDB\n');

    // Clear existing data
    await User.deleteMany({});
    await Complaint.deleteMany({});
    console.log('🗑️   Cleared existing Users and Complaints\n');

    // Create users with hashed passwords
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, salt);

    const createdUsers = await User.insertMany(
      seedUsers.map((u) => ({ ...u, password: hashedPassword }))
    );

    const admin    = createdUsers.find((u) => u.role === 'admin');
    const officers = createdUsers.filter((u) => u.role === 'officer');
    const citizen  = createdUsers.find((u) => u.role === 'citizen');

    console.log('👤  Users created:');
    createdUsers.forEach((u) => console.log(`    [${u.role.padEnd(7)}] ${u.email}`));
    console.log();

    // ─── 25 Sample Complaints ────────────────────────────────────────────────
    const complaints = [
      // ── RESOLVED (10) — with realistic time gaps + some feedback ────────────
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'theft', title: 'Motorcycle stolen from parking lot',
        description: 'My motorcycle was stolen overnight from the public parking lot.',
        area: 'Sector 5', status: 'resolved', priority: 'normal',
        assignedOfficer: officers[0]._id,
        createdAt: daysAgo(30), updatedAt: daysAgo(22),
        feedback: { rating: 4, comment: 'Officer Reyes was very helpful.' },
      },
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'harassment', title: 'Verbal harassment at bus stop',
        description: 'A group of individuals harassed me and other commuters at the bus stop.',
        area: 'Greenview', status: 'resolved', priority: 'normal',
        assignedOfficer: officers[1]._id,
        createdAt: daysAgo(28), updatedAt: daysAgo(21),
        feedback: { rating: 5, comment: 'Quick resolution, thank you!' },
      },
      {
        citizen: citizen._id, isAnonymous: true,
        category: 'fraud', title: 'Online scam targeting elderly residents',
        description: 'Fraudsters are calling elderly people pretending to be from the bank.',
        area: 'North District', status: 'resolved', priority: 'high',
        assignedOfficer: officers[2]._id,
        createdAt: daysAgo(25), updatedAt: daysAgo(18),
        feedback: { rating: 3, comment: 'Took a bit long but resolved.' },
      },
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'missing_person', title: 'Missing child reported — found safe',
        description: 'A child went missing from the school. Urgent alert. Child is 7 years old.',
        area: 'Riverside', status: 'resolved', priority: 'urgent',
        assignedOfficer: officers[0]._id,
        createdAt: daysAgo(20), updatedAt: daysAgo(19),
        feedback: { rating: 5, comment: 'Officers responded within hours. Incredible work.' },
        notes: [{ officer: officers[0]._id, note: 'Child located at neighbors house, returned safely.', date: daysAgo(19) }],
      },
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'theft', title: 'Shop break-in overnight',
        description: 'My electronics shop was broken into and stock worth 50,000 was stolen.',
        area: 'Old Town', status: 'resolved', priority: 'high',
        assignedOfficer: officers[3]._id,
        createdAt: daysAgo(18), updatedAt: daysAgo(10),
      },
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'harassment', title: 'Stalking complaint near apartment',
        description: 'Someone has been following me home for the past week. I am afraid.',
        area: 'Eastgate', status: 'resolved', priority: 'high',
        assignedOfficer: officers[1]._id,
        createdAt: daysAgo(16), updatedAt: daysAgo(9),
        feedback: { rating: 4, comment: 'Issue addressed professionally.' },
      },
      {
        citizen: citizen._id, isAnonymous: true,
        category: 'fraud', title: 'Fake charity collection in the area',
        description: 'People are going door to door collecting money for a fake charity.',
        area: 'Greenview', status: 'resolved', priority: 'normal',
        assignedOfficer: officers[2]._id,
        createdAt: daysAgo(14), updatedAt: daysAgo(7),
      },
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'other', title: 'Illegal dumping near school',
        description: 'Construction waste is being dumped illegally near the primary school.',
        area: 'Sector 5', status: 'resolved', priority: 'normal',
        assignedOfficer: officers[3]._id,
        createdAt: daysAgo(12), updatedAt: daysAgo(5),
        feedback: { rating: 2, comment: 'Took too long to act but eventually resolved.' },
      },
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'theft', title: 'Purse snatching on main road',
        description: 'My purse was snatched by a man on a bicycle on the main road.',
        area: 'North District', status: 'closed', priority: 'normal',
        assignedOfficer: officers[0]._id,
        createdAt: daysAgo(10), updatedAt: daysAgo(4),
      },
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'missing_person', title: 'Missing elderly man — returned home',
        description: 'My father with dementia wandered off. Missing elderly person, armed with a walking stick.',
        area: 'Riverside', status: 'closed', priority: 'urgent',
        assignedOfficer: officers[1]._id,
        createdAt: daysAgo(8), updatedAt: daysAgo(7),
        notes: [{ officer: officers[1]._id, note: 'Elderly man found at local mosque, returned safely.', date: daysAgo(7) }],
      },

      // ── INVESTIGATING (4) ────────────────────────────────────────────────────
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'theft', title: 'Car vandalized outside home',
        description: 'Tires slashed and windshield broken on my car parked outside.',
        area: 'Old Town', status: 'investigating', priority: 'normal',
        assignedOfficer: officers[2]._id,
        createdAt: daysAgo(6), updatedAt: daysAgo(3),
        notes: [{ officer: officers[2]._id, note: 'CCTV footage being reviewed.', date: daysAgo(3) }],
      },
      {
        citizen: citizen._id, isAnonymous: true,
        category: 'fraud', title: 'Counterfeit currency circulating',
        description: 'Several shopkeepers in the area have received fake currency notes.',
        area: 'Eastgate', status: 'investigating', priority: 'high',
        assignedOfficer: officers[3]._id,
        createdAt: daysAgo(5), updatedAt: daysAgo(2),
      },
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'harassment', title: 'Online threats from unknown account',
        description: 'I have been receiving death threats via social media.',
        area: 'Greenview', status: 'investigating', priority: 'high',
        assignedOfficer: officers[0]._id,
        createdAt: daysAgo(4), updatedAt: daysAgo(1),
      },
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'other', title: 'Suspicious gathering at abandoned warehouse',
        description: 'Large group of unknown people meeting late nights at the old warehouse on Canal Road.',
        area: 'North District', status: 'investigating', priority: 'high',
        assignedOfficer: officers[1]._id,
        createdAt: daysAgo(3), updatedAt: daysAgo(1),
        notes: [{ officer: officers[1]._id, note: 'Surveillance set up. Awaiting confirmation.', date: daysAgo(1) }],
      },

      // ── ASSIGNED (4) ─────────────────────────────────────────────────────────
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'theft', title: 'Laptop stolen from office',
        description: 'My work laptop was stolen from the office while I stepped out for lunch.',
        area: 'Sector 5', status: 'assigned', priority: 'normal',
        assignedOfficer: officers[2]._id,
        createdAt: daysAgo(3), updatedAt: daysAgo(2),
      },
      {
        citizen: citizen._id, isAnonymous: true,
        category: 'fraud', title: 'Property fraud in residential complex',
        description: 'Someone is posing as a property agent and collecting deposits for flats that do not exist.',
        area: 'Riverside', status: 'assigned', priority: 'high',
        assignedOfficer: officers[3]._id,
        createdAt: daysAgo(2), updatedAt: daysAgo(1),
      },
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'missing_person', title: 'Missing teenage girl',
        description: 'My 16-year-old daughter has not returned home from school. Missing child since yesterday.',
        area: 'Old Town', status: 'assigned', priority: 'urgent',
        assignedOfficer: officers[0]._id,
        createdAt: daysAgo(2), updatedAt: daysAgo(1),
      },
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'harassment', title: 'Workplace harassment by manager',
        description: 'My manager has been verbally abusing me and creating a hostile work environment.',
        area: 'Eastgate', status: 'assigned', priority: 'normal',
        assignedOfficer: officers[1]._id,
        createdAt: daysAgo(1), updatedAt: daysAgo(1),
      },

      // ── UNDER REVIEW (3) ──────────────────────────────────────────────────────
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'other', title: 'Street lights not working for weeks',
        description: 'The entire stretch of lights on Park Avenue has been non-functional for 3 weeks, causing danger.',
        area: 'Greenview', status: 'under_review', priority: 'normal',
        createdAt: daysAgo(4), updatedAt: daysAgo(3),
      },
      {
        citizen: citizen._id, isAnonymous: true,
        category: 'theft', title: 'Repeated theft from community garden',
        description: 'Someone has been stealing produce from the community garden repeatedly.',
        area: 'Riverside', status: 'under_review', priority: 'normal',
        createdAt: daysAgo(3), updatedAt: daysAgo(2),
      },
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'fraud', title: 'Fake job offers targeting youth',
        description: 'A fake company is collecting registration fees from young job seekers and disappearing.',
        area: 'Sector 5', status: 'under_review', priority: 'high',
        createdAt: daysAgo(2), updatedAt: daysAgo(1),
      },

      // ── SUBMITTED (4) ─────────────────────────────────────────────────────────
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'harassment', title: 'Rowdy neighbors disturbing peace at night',
        description: 'Neighbors play loud music and cause disturbance after midnight every weekend.',
        area: 'North District', status: 'submitted', priority: 'normal',
        createdAt: daysAgo(1), updatedAt: daysAgo(1),
      },
      {
        citizen: citizen._id, isAnonymous: true,
        category: 'other', title: 'Stray dogs attacking pedestrians',
        description: 'A pack of aggressive stray dogs near the market has bitten two people this week.',
        area: 'Old Town', status: 'submitted', priority: 'high',
        createdAt: daysAgo(1), updatedAt: daysAgo(1),
      },
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'theft', title: 'Wallet stolen at market',
        description: 'My wallet was pickpocketed at the weekly bazaar.',
        area: 'Eastgate', status: 'submitted', priority: 'normal',
        createdAt: daysAgo(0), updatedAt: daysAgo(0),
      },
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'missing_person', title: 'Missing person — young adult',
        description: 'My 22-year-old son has not been in contact for 48 hours. Weapon injuries reported in area.',
        area: 'Greenview', status: 'submitted', priority: 'urgent',
        createdAt: daysAgo(0), updatedAt: daysAgo(0),
      },
      {
        citizen: citizen._id, isAnonymous: false,
        category: 'fraud', title: 'Fake bank SMS phishing attempt',
        description: 'Received suspicious SMS asking me to verify bank account details via a fake link.',
        area: 'Sector 5', status: 'submitted', priority: 'normal',
        createdAt: daysAgo(0), updatedAt: daysAgo(0),
      },
    ];

    // Insert complaints with manually set timestamps
    for (const c of complaints) {
      const doc = new Complaint(c);
      // Bypass mongoose timestamp auto-generation for seed data
      await Complaint.collection.insertOne({
        ...doc.toObject(),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      });
    }

    console.log(`✅  ${complaints.length} complaints seeded across all categories and statuses.\n`);

    // ─── Summary ──────────────────────────────────────────────────────────────
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  SAFECITY DEMO CREDENTIALS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Role     Email                        Password');
    console.log('  ───────  ───────────────────────────  ─────────');
    console.log('  Admin    admin@safecity.demo          Demo@123');
    console.log('  Officer  officer1@safecity.demo       Demo@123');
    console.log('  Officer  officer2@safecity.demo       Demo@123');
    console.log('  Officer  officer3@safecity.demo       Demo@123');
    console.log('  Officer  officer4@safecity.demo       Demo@123');
    console.log('  Citizen  citizen@safecity.demo        Demo@123');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n  Or use: POST /api/auth/demo-login  { "role": "admin" }');
    console.log('                                     { "role": "officer" }');
    console.log('                                     { "role": "citizen" }');
    console.log('\n✅  Seed complete!\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌  Seed failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
