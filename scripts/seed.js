// ============================================================
// Database Seed Script
// Run: node scripts/seed.js
// ============================================================
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

// ── Inline models for seed script ────────────────────────────
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: String, email: { type: String, unique: true }, password: String,
  role: { type: String, default: 'student' },
  profile: { type: Object, default: {} },
  savedScholarships: [{ type: mongoose.Schema.Types.ObjectId }],
  appliedScholarships: [{ type: Object }],
  eligibilityHistory: [{ type: Object }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const scholarshipSchema = new mongoose.Schema({
  name: String, category: [String], gender: { type: String, default: 'All' },
  amount: Number, amountDescription: String, eligibility: String,
  eligibilityCriteria: { minClass: Number, maxClass: Number, minPercentage: Number, maxFamilyIncome: Number },
  incomeLimit: Number, state: [String], documents: [String],
  deadline: Date, officialLink: String, description: String, benefits: String,
  applicationProcess: String, isActive: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: true }, isFeatured: Boolean,
  views: { type: Number, default: 0 }, applicants: { type: Number, default: 0 }
}, { timestamps: true });

const notificationSchema = new mongoose.Schema({
  title: String, message: String, type: String, priority: String,
  isActive: { type: Boolean, default: true }, link: String, date: { type: Date, default: Date.now }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Scholarship = mongoose.model('Scholarship', scholarshipSchema);
const Notification = mongoose.model('Notification', notificationSchema);

// ── Sample Scholarship Data ──────────────────────────────────
const scholarships = [
  {
    name: 'Pre-Matric Scholarship for SC Students',
    category: ['SC'],
    gender: 'All',
    amount: 3500,
    amountDescription: '₹3,500 per annum',
    eligibility: 'SC students studying in Class 9-10 with family income below ₹2.5 lakh',
    eligibilityCriteria: { minClass: 9, maxClass: 10, minPercentage: 50, maxFamilyIncome: 250000 },
    incomeLimit: 250000,
    state: ['All India'],
    documents: ['Aadhaar Card', 'Income Certificate', 'Caste Certificate', 'Study Certificate', 'Bank Passbook'],
    deadline: new Date('2026-11-30'),
    officialLink: 'https://scholarships.gov.in',
    description: 'The Pre-Matric Scholarship for SC Students is a Government of India initiative to support students from Scheduled Caste communities pursuing Class 9 and 10 education.',
    benefits: 'Annual scholarship amount of ₹3,500 for day scholars and ₹7,000 for hostellers, plus maintenance allowance.',
    applicationProcess: '1. Visit scholarships.gov.in\n2. Register with Aadhaar\n3. Fill application form\n4. Upload documents\n5. Submit before deadline',
    isFeatured: true,
    views: 1250
  },
  {
    name: 'Post-Matric Scholarship for ST Students',
    category: ['ST'],
    gender: 'All',
    amount: 10000,
    amountDescription: 'Up to ₹10,000 per annum',
    eligibility: 'ST students pursuing Class 11-12 or higher education, family income below ₹2.5 lakh',
    eligibilityCriteria: { minClass: 11, maxClass: 12, minPercentage: 55, maxFamilyIncome: 250000 },
    incomeLimit: 250000,
    state: ['All India'],
    documents: ['Aadhaar Card', 'Income Certificate', 'Tribe Certificate', 'Study Certificate', 'Bank Passbook', 'Marks Card'],
    deadline: new Date('2026-12-15'),
    officialLink: 'https://scholarships.gov.in',
    description: 'Post-Matric Scholarship for Scheduled Tribe students to encourage them to pursue higher education by providing financial assistance.',
    benefits: 'Maintenance allowance, study tour charges, thesis typing/printing charges, book allowance',
    applicationProcess: '1. Register on National Scholarship Portal\n2. Complete profile\n3. Fill scholarship application\n4. Upload required documents',
    isFeatured: true,
    views: 980
  },
  {
    name: 'OBC Pre-Matric Scholarship',
    category: ['OBC', 'BC'],
    gender: 'All',
    amount: 5000,
    amountDescription: '₹5,000 per annum',
    eligibility: 'OBC/BC students in Class 9-10, family income not exceeding ₹1 lakh per annum',
    eligibilityCriteria: { minClass: 9, maxClass: 10, minPercentage: 45, maxFamilyIncome: 100000 },
    incomeLimit: 100000,
    state: ['All India'],
    documents: ['Aadhaar Card', 'Income Certificate', 'OBC Certificate', 'Study Certificate', 'Bank Passbook'],
    deadline: new Date('2026-10-31'),
    officialLink: 'https://scholarships.gov.in',
    description: 'Financial assistance to OBC students in Class 9 and 10 to prevent dropouts and encourage pursuit of education.',
    benefits: 'Annual scholarship of ₹5,000 plus book allowance',
    applicationProcess: '1. Apply on NSP portal\n2. Verify with Aadhaar OTP\n3. Fill and submit form with documents',
    isFeatured: false,
    views: 750
  },
  {
    name: 'Minority Pre-Matric Scholarship',
    category: ['Minority'],
    gender: 'All',
    amount: 8500,
    amountDescription: '₹8,500 per annum',
    eligibility: 'Students from minority communities (Muslim, Christian, Sikh, Buddhist, Jain, Parsi) in Class 1-10, family income below ₹1 lakh',
    eligibilityCriteria: { minClass: 1, maxClass: 10, minPercentage: 50, maxFamilyIncome: 100000 },
    incomeLimit: 100000,
    state: ['All India'],
    documents: ['Aadhaar Card', 'Income Certificate', 'Minority Community Certificate', 'Study Certificate', 'Bank Passbook', 'Passport Photo'],
    deadline: new Date('2026-11-15'),
    officialLink: 'https://minorityaffairs.gov.in',
    description: 'Scholarship for students belonging to minority communities to protect them from educational stagnation.',
    benefits: 'Admission fee, tuition fee, and maintenance allowance',
    applicationProcess: '1. Apply on NSP\n2. Attach minority community declaration\n3. Submit through school',
    isFeatured: true,
    views: 1100
  },
  {
    name: 'EWS National Scholarship Scheme',
    category: ['EWS', 'General'],
    gender: 'All',
    amount: 12000,
    amountDescription: '₹12,000 per annum',
    eligibility: 'General category EWS students in Class 9-12, family income below ₹8 lakh',
    eligibilityCriteria: { minClass: 9, maxClass: 12, minPercentage: 60, maxFamilyIncome: 800000 },
    incomeLimit: 800000,
    state: ['All India'],
    documents: ['Aadhaar Card', 'EWS Certificate', 'Income Certificate', 'Study Certificate', 'Bank Passbook'],
    deadline: new Date('2026-12-01'),
    officialLink: 'https://scholarships.gov.in',
    description: 'Scholarship for Economically Weaker Section students from General category who do not fall under SC/ST/OBC.',
    benefits: '₹12,000 annual scholarship for Class 9-10 and ₹14,000 for Class 11-12',
    applicationProcess: '1. Obtain EWS certificate from concerned authority\n2. Apply on NSP portal\n3. Submit verified by school principal',
    isFeatured: false,
    views: 890
  },
  {
    name: 'National Merit Scholarship for Girls',
    category: ['Merit', 'Girls'],
    gender: 'Female',
    amount: 20000,
    amountDescription: '₹20,000 per annum',
    eligibility: 'Girl students from government schools with above 75% marks, family income below ₹6 lakh',
    eligibilityCriteria: { minClass: 9, maxClass: 12, minPercentage: 75, maxFamilyIncome: 600000 },
    incomeLimit: 600000,
    state: ['All India'],
    documents: ['Aadhaar Card', 'Income Certificate', 'Previous Year Marks Card', 'Bonafide Certificate', 'Bank Passbook', 'Passport Photo'],
    deadline: new Date('2026-09-30'),
    officialLink: 'https://scholarships.gov.in',
    description: 'Encouraging meritorious girl students from government schools to pursue secondary and higher secondary education.',
    benefits: '₹20,000 per annum scholarship with renewal based on academic performance',
    applicationProcess: '1. Apply on NSP\n2. School verification required\n3. State level selection',
    isFeatured: true,
    views: 2100
  },
  {
    name: 'NMMS - National Means-cum-Merit Scholarship',
    category: ['SC', 'ST', 'OBC', 'BC', 'EWS', 'General'],
    gender: 'All',
    amount: 12000,
    amountDescription: '₹12,000 per annum (₹1,000 per month)',
    eligibility: 'Class 8 students with min 55% marks, studying in government school, family income below ₹3.5 lakh',
    eligibilityCriteria: { minClass: 8, maxClass: 8, minPercentage: 55, maxFamilyIncome: 350000 },
    incomeLimit: 350000,
    state: ['All India'],
    documents: ['Aadhaar Card', 'Income Certificate', 'Study Certificate', 'Bank Passbook', 'NMMS Exam Scorecard'],
    deadline: new Date('2026-08-31'),
    officialLink: 'https://dsel.education.gov.in/nmms',
    description: 'NMMS is awarded to meritorious students of economically weaker section to arrest their dropout at Class 8 level.',
    benefits: '₹12,000 per annum from Class 9 to Class 12 (4 years)',
    applicationProcess: '1. Appear for NMMS exam\n2. Clear MAT and SAT\n3. Apply state-wise',
    isFeatured: true,
    views: 3200
  },
  {
    name: 'Andhra Pradesh SC Corporation Scholarship',
    category: ['SC'],
    gender: 'All',
    amount: 15000,
    amountDescription: 'Up to ₹15,000 per annum',
    eligibility: 'SC students from Andhra Pradesh in Class 9-12, family income below ₹2 lakh',
    eligibilityCriteria: { minClass: 9, maxClass: 12, minPercentage: 50, maxFamilyIncome: 200000 },
    incomeLimit: 200000,
    state: ['Andhra Pradesh'],
    documents: ['Aadhaar Card', 'Caste Certificate', 'Income Certificate', 'Study Certificate', 'AP Domicile Certificate'],
    deadline: new Date('2026-10-15'),
    officialLink: 'https://apeamcet.nic.in',
    description: 'State-level scholarship for SC students in Andhra Pradesh to support their secondary education.',
    benefits: 'Tuition fee reimbursement plus ₹15,000 maintenance allowance',
    applicationProcess: '1. Apply on AP State Scholarship Portal\n2. MeeSeva certificate verification\n3. Submit through school',
    isFeatured: false,
    views: 650
  },
  {
    name: 'Telangana BC Welfare Scholarship',
    category: ['BC', 'OBC'],
    gender: 'All',
    amount: 8000,
    amountDescription: '₹8,000 per annum',
    eligibility: 'BC students from Telangana in Class 9-12, family income below ₹2 lakh',
    eligibilityCriteria: { minClass: 9, maxClass: 12, minPercentage: 45, maxFamilyIncome: 200000 },
    incomeLimit: 200000,
    state: ['Telangana'],
    documents: ['Aadhaar Card', 'BC Certificate', 'Income Certificate', 'Study Certificate', 'Telangana Domicile'],
    deadline: new Date('2026-11-30'),
    officialLink: 'https://telanganaepass.cgg.gov.in',
    description: 'Telangana government scholarship for BC students to ensure quality education access.',
    benefits: 'Annual maintenance allowance and tuition fee support',
    applicationProcess: '1. Register on TS ePASS portal\n2. Submit documents\n3. School verification',
    isFeatured: false,
    views: 820
  },
  {
    name: 'Inspire Scholarship for Higher Education',
    category: ['Merit', 'SC', 'ST', 'BC', 'OBC', 'General'],
    gender: 'All',
    amount: 80000,
    amountDescription: '₹80,000 per annum',
    eligibility: 'Students in top 1% in Class 10 board exams, pursuing science courses, family income below ₹4.5 lakh',
    eligibilityCriteria: { minClass: 11, maxClass: 12, minPercentage: 85, maxFamilyIncome: 450000 },
    incomeLimit: 450000,
    state: ['All India'],
    documents: ['Aadhaar Card', 'Class 10 Marks Card', 'Income Certificate', 'Admission Letter', 'Bank Passbook'],
    deadline: new Date('2026-10-31'),
    officialLink: 'https://online-inspire.gov.in',
    description: 'DST-INSPIRE scholarship to attract top talent for study and research in natural and basic sciences.',
    benefits: '₹80,000 per annum for 5 years for science graduates',
    applicationProcess: '1. Eligible based on board results\n2. Apply on INSPIRE portal\n3. Institution verification',
    isFeatured: true,
    views: 4500
  },
  {
    name: 'Pragati Scholarship for Girls (AICTE)',
    category: ['General', 'SC', 'ST', 'BC', 'OBC'],
    gender: 'Female',
    amount: 50000,
    amountDescription: '₹50,000 per annum',
    eligibility: 'Girl students admitted to 1st year of Diploma/Degree technical programs, family income below ₹8 lakh',
    eligibilityCriteria: { minClass: 12, maxClass: 12, minPercentage: 60, maxFamilyIncome: 800000 },
    incomeLimit: 800000,
    state: ['All India'],
    documents: ['Aadhaar Card', 'Income Certificate', 'Admission Letter', 'Marks Sheet', 'Bank Passbook'],
    deadline: new Date('2026-12-31'),
    officialLink: 'https://www.aicte-pragati-saksham-gov.in',
    description: 'AICTE Pragati Scholarship to empower girl students for pursuing technical education.',
    benefits: '₹50,000 per annum including tuition fee and incidental charges',
    applicationProcess: '1. Apply on AICTE portal\n2. Upload required documents\n3. Institution verification',
    isFeatured: true,
    views: 1850
  },
  {
    name: 'Central Sector Scheme for College Students',
    category: ['Merit', 'General', 'OBC'],
    gender: 'All',
    amount: 20000,
    amountDescription: '₹20,000 per annum (₹10,000 p.a. for 3 years + ₹20,000 p.a. for higher studies)',
    eligibility: 'Students who are above 80th percentile in Class 12, pursuing regular college education, family income below ₹8 lakh',
    eligibilityCriteria: { minClass: 12, maxClass: 12, minPercentage: 80, maxFamilyIncome: 800000 },
    incomeLimit: 800000,
    state: ['All India'],
    documents: ['Aadhaar Card', 'Class 12 Marks Card', 'Income Certificate', 'College Admission Proof', 'Bank Passbook'],
    deadline: new Date('2026-11-30'),
    officialLink: 'https://scholarships.gov.in',
    description: 'Merit-based scholarship for students pursuing under-graduate and post-graduate courses.',
    benefits: 'Up to ₹20,000 per annum with renewal condition of 60% marks',
    applicationProcess: '1. Apply on NSP portal\n2. Verify 80th percentile rank\n3. College endorsement required',
    isFeatured: false,
    views: 2300
  }
];

// ── Sample Notifications ──────────────────────────────────────
const notifications = [
  {
    title: '🆕 NMMS Scholarship Applications Open',
    message: 'National Means-cum-Merit Scholarship applications are now open. Last date: August 31, 2025',
    type: 'new_scholarship',
    priority: 'high'
  },
  {
    title: '⚠️ Deadline Alert: OBC Pre-Matric Scholarship',
    message: 'OBC Pre-Matric Scholarship deadline is approaching - October 31, 2025. Apply now!',
    type: 'deadline',
    priority: 'urgent'
  },
  {
    title: '📢 New Scholarship Portal Update',
    message: 'ScholarConnect has added 5 new state-level scholarships. Check the scholarship section!',
    type: 'announcement',
    priority: 'medium'
  },
  {
    title: '👧 Pragati Scholarship for Girls Open',
    message: 'AICTE Pragati Scholarship for girl students in technical education is now accepting applications.',
    type: 'new_scholarship',
    priority: 'high'
  },
  {
    title: '📋 Documents Checklist Updated',
    message: 'The required documents checklist has been updated for the 2025-26 academic year.',
    type: 'update',
    priority: 'low'
  }
];

// ── Seed Function ─────────────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Scholarship.deleteMany({});
    await Notification.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create Admin
    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@scholarconnect.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });
    console.log(`👤 Admin created: ${admin.email}`);

    // Create demo student
    const studentPassword = await bcrypt.hash('Student@123', 12);
    await User.create({
      name: 'Demo Student',
      email: 'student@scholarconnect.com',
      password: studentPassword,
      role: 'student',
      profile: {
        class: '10',
        category: 'SC',
        gender: 'Male',
        state: 'Andhra Pradesh',
        familyIncome: 150000,
        percentage: 72,
        school: 'Government High School, Example City'
      },
      isActive: true
    });
    console.log('👤 Demo student created: student@scholarconnect.com');

    // Insert scholarships
    await Scholarship.insertMany(scholarships);
    console.log(`🎓 ${scholarships.length} scholarships seeded`);

    // Insert notifications
    await Notification.insertMany(notifications);
    console.log(`🔔 ${notifications.length} notifications seeded`);

    console.log('\n✅ Database seeded successfully!');
    console.log('─────────────────────────────────────');
    console.log('Admin    → admin@scholarconnect.com / Admin@123');
    console.log('Student  → student@scholarconnect.com / Student@123');
    console.log('─────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seed();
console.log("SEED DB URI:", MONGODB_URI);