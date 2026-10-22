import { computeFileStats, isHoldFile } from './fileStats';

const STORAGE_KEY = 'autoaxis_demo_files';
const SEED_VERSION_KEY = 'autoaxis_demo_files_seed_version';
const SEED_VERSION = 2;

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

const today = () => new Date().toISOString().split('T')[0];

const daysAgoIso = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

function saveAll(files) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

function buildSeedFiles() {
  return [
    {
      id: 'f1',
      fileNumber: 'AA-100001',
      date: today(),
      status: 'pending',
      dealerName: 'CAR DEKHO',
      workType: 'TO',
      vehicleNo: 'MH12AB1234',
      vehicleModel: 'SWIFT',
      chassisNo: '12345',
      engineNo: '67890',
      oldOwnerName: 'RAJESH KUMAR',
      ownerName: '',
      oldOwnerMob: '9876543210',
      newOwnerMob: '9876543211',
      dealerMob: '',
      rtoName: 'PUNE (MH-12)',
      remarks: '',
      totalBill: 0,
      createdBy: 'demo-admin-1',
      createdAt: daysAgoIso(0),
    },
    {
      id: 'f2',
      fileNumber: 'AA-100002',
      date: daysAgo(65),
      status: 'pending',
      dealerName: 'BADA Finance',
      workType: 'HPT',
      vehicleNo: 'MH14CD5678',
      vehicleModel: 'BALENO',
      chassisNo: 'ABCDE',
      engineNo: 'FGHIJ',
      oldOwnerName: 'PRIYA SHARMA',
      ownerName: '',
      oldOwnerMob: '9123456780',
      newOwnerMob: '9123456781',
      dealerMob: '9123456700',
      rtoName: 'MUMBAI (MH-01)',
      remarks: 'HOLD CASE',
      totalBill: 2500,
      expenses: { challan: 500, adjustment: 0, puc: 800, hsrp: 600, insurance: 600, setDeal: 0 },
      createdBy: 'demo-staff-1',
      createdAt: daysAgoIso(65),
    },
    {
      id: 'f3',
      fileNumber: 'AA-100003',
      date: daysAgo(5),
      status: 'in_progress',
      dealerName: 'SAI finance',
      workType: 'TO+HPT',
      vehicleNo: 'MH20EF9012',
      vehicleModel: 'CRETA',
      chassisNo: 'XY12Z',
      engineNo: 'AB34C',
      oldOwnerName: 'AMIT PATEL',
      ownerName: 'NEHA PATEL',
      oldOwnerMob: '9988776655',
      newOwnerMob: '9988776656',
      dealerMob: '',
      rtoName: 'NASHIK (MH-15)',
      remarks: '',
      totalBill: 4200,
      expenses: { challan: 1200, adjustment: 200, puc: 900, hsrp: 1100, insurance: 800, setDeal: 0 },
      createdBy: 'demo-admin-1',
      createdAt: daysAgoIso(5),
    },
    {
      id: 'f4',
      fileNumber: 'AA-100004',
      date: daysAgo(2),
      status: 'completed',
      dealerName: 'R K finance',
      workType: 'DRC',
      vehicleNo: 'MH01GH3456',
      vehicleModel: 'WAGON R',
      chassisNo: '11111',
      engineNo: '22222',
      oldOwnerName: 'SURESH VERMA',
      ownerName: '',
      oldOwnerMob: '9000011111',
      newOwnerMob: '9000011112',
      dealerMob: '',
      rtoName: 'THANE (MH-04)',
      remarks: '',
      totalBill: 1800,
      createdBy: 'demo-admin-1',
      createdAt: daysAgoIso(2),
    },
    {
      id: 'f5',
      fileNumber: 'AA-100005',
      date: daysAgo(14),
      status: 'objection',
      dealerName: 's i adcon',
      workType: 'NOC',
      vehicleNo: 'MH15IJ7890',
      vehicleModel: 'I20',
      chassisNo: '33333',
      engineNo: '44444',
      oldOwnerName: 'KAVITA SINGH',
      ownerName: '',
      oldOwnerMob: '9111122222',
      newOwnerMob: '9111122223',
      dealerMob: '',
      rtoName: 'AURANGABAD (MH-20)',
      remarks: 'RTO OBJECTION - ADDRESS PROOF',
      totalBill: 3200,
      createdBy: 'demo-staff-1',
      createdAt: daysAgoIso(14),
    },
    {
      id: 'f6',
      fileNumber: 'AA-100006',
      date: daysAgo(1),
      status: 'pending',
      dealerName: 'CAR DEKHO',
      workType: 'TO+HPT+HPA',
      vehicleNo: 'MH12KL4567',
      vehicleModel: 'INNOVA',
      chassisNo: '55667',
      engineNo: '88990',
      oldOwnerName: 'VIKAS MEHTA',
      ownerName: 'ANITA MEHTA',
      oldOwnerMob: '9812345678',
      newOwnerMob: '9812345679',
      dealerMob: '',
      rtoName: 'PUNE (MH-12)',
      remarks: '',
      totalBill: 5500,
      createdBy: 'demo-admin-1',
      createdAt: daysAgoIso(1),
    },
    {
      id: 'f7',
      fileNumber: 'AA-100007',
      date: daysAgo(8),
      status: 'in_progress',
      dealerName: 'BADA Finance',
      workType: 'CA',
      vehicleNo: 'MH04MN8901',
      vehicleModel: 'CITY',
      chassisNo: 'AA111',
      engineNo: 'BB222',
      oldOwnerName: 'DEEPAK JOSHI',
      ownerName: '',
      oldOwnerMob: '9822012345',
      newOwnerMob: '9822012346',
      dealerMob: '9822012300',
      rtoName: 'THANE (MH-04)',
      remarks: '',
      totalBill: 2100,
      createdBy: 'demo-staff-1',
      createdAt: daysAgoIso(8),
    },
    {
      id: 'f8',
      fileNumber: 'AA-100008',
      date: daysAgo(72),
      status: 'pending',
      dealerName: 'R K finance',
      workType: 'FITNESS',
      vehicleNo: 'MH31OP2345',
      vehicleModel: 'EICHER',
      chassisNo: 'CC333',
      engineNo: 'DD444',
      oldOwnerName: 'GANESH TRANSPORT',
      ownerName: '',
      oldOwnerMob: '9823011111',
      newOwnerMob: '9823011112',
      dealerMob: '',
      rtoName: 'NAGPUR (MH-31)',
      remarks: 'OVERDUE HOLD',
      totalBill: 3800,
      createdBy: 'demo-admin-1',
      createdAt: daysAgoIso(72),
    },
    {
      id: 'f9',
      fileNumber: 'AA-100009',
      date: daysAgo(3),
      status: 'paper_return',
      dealerName: 'SAI finance',
      workType: 'DRC+HPT+HPA',
      vehicleNo: 'MH15QR6789',
      vehicleModel: 'FORTUNER',
      chassisNo: 'EE555',
      engineNo: 'FF666',
      oldOwnerName: 'ROHIT DESAI',
      ownerName: '',
      oldOwnerMob: '9833012345',
      newOwnerMob: '9833012346',
      dealerMob: '',
      rtoName: 'NASHIK (MH-15)',
      remarks: 'PAPERS RETURNED BY RTO',
      totalBill: 6100,
      createdBy: 'demo-staff-1',
      createdAt: daysAgoIso(3),
    },
    {
      id: 'f10',
      fileNumber: 'AA-100010',
      date: daysAgo(10),
      status: 'on_hold',
      dealerName: 's i adcon',
      workType: 'RRC',
      vehicleNo: 'MH20ST0123',
      vehicleModel: 'SCORPIO',
      chassisNo: 'GG777',
      engineNo: 'HH888',
      oldOwnerName: 'MANOJ KULKARNI',
      ownerName: '',
      oldOwnerMob: '9844012345',
      newOwnerMob: '9844012346',
      dealerMob: '',
      rtoName: 'AURANGABAD (MH-20)',
      remarks: 'WAITING FOR NOC',
      totalBill: 2900,
      createdBy: 'demo-admin-1',
      createdAt: daysAgoIso(10),
    },
    {
      id: 'f11',
      fileNumber: 'AA-100011',
      date: daysAgo(7),
      status: 'completed',
      dealerName: 'CAR DEKHO',
      workType: 'HPT',
      vehicleNo: 'MH12UV3456',
      vehicleModel: 'ALTO',
      chassisNo: 'II999',
      engineNo: 'JJ000',
      oldOwnerName: 'SUNITA RAO',
      ownerName: '',
      oldOwnerMob: '9855012345',
      newOwnerMob: '9855012346',
      dealerMob: '',
      rtoName: 'PUNE (MH-12)',
      remarks: '',
      totalBill: 1500,
      createdBy: 'demo-staff-1',
      createdAt: daysAgoIso(7),
    },
    {
      id: 'f12',
      fileNumber: 'AA-100012',
      date: daysAgo(4),
      status: 'in_progress',
      dealerName: 'BADA Finance',
      workType: 'TO',
      vehicleNo: 'MH01WX7890',
      vehicleModel: 'VERNA',
      chassisNo: 'KK111',
      engineNo: 'LL222',
      oldOwnerName: 'ARUN NAIR',
      ownerName: 'PRIYA NAIR',
      oldOwnerMob: '9866012345',
      newOwnerMob: '9866012346',
      dealerMob: '9866012300',
      rtoName: 'MUMBAI (MH-01)',
      remarks: '',
      totalBill: 4800,
      createdBy: 'demo-admin-1',
      createdAt: daysAgoIso(4),
    },
    {
      id: 'f13',
      fileNumber: 'AA-100013',
      date: daysAgo(20),
      status: 'objection',
      dealerName: 'R K finance',
      workType: 'DEATH',
      vehicleNo: 'MH04YZ1234',
      vehicleModel: 'DZIRE',
      chassisNo: 'MM333',
      engineNo: 'NN444',
      oldOwnerName: 'LATE RAMESH SHETTY',
      ownerName: 'SURESH SHETTY',
      oldOwnerMob: '9877012345',
      newOwnerMob: '9877012346',
      dealerMob: '',
      rtoName: 'THANE (MH-04)',
      remarks: 'LEGAL HEIR DOCS PENDING',
      totalBill: 7200,
      createdBy: 'demo-staff-1',
      createdAt: daysAgoIso(20),
    },
    {
      id: 'f14',
      fileNumber: 'AA-100014',
      date: daysAgo(6),
      status: 'pending',
      dealerName: 'SAI finance',
      workType: 'NEW_REG',
      vehicleNo: 'MH15AB5678',
      vehicleModel: 'NEXON',
      chassisNo: 'OO555',
      engineNo: 'PP666',
      oldOwnerName: 'TATA MOTORS DEALER',
      ownerName: 'RAHUL GUPTA',
      oldOwnerMob: '9888012345',
      newOwnerMob: '9888012346',
      dealerMob: '',
      rtoName: 'NASHIK (MH-15)',
      remarks: '',
      totalBill: 0,
      createdBy: 'demo-admin-1',
      createdAt: daysAgoIso(6),
    },
    {
      id: 'f15',
      fileNumber: 'AA-100015',
      date: daysAgo(12),
      status: 'completed',
      dealerName: 's i adcon',
      workType: 'DRC+HPA+CA',
      vehicleNo: 'MH20CD9012',
      vehicleModel: 'XUV700',
      chassisNo: 'QQ777',
      engineNo: 'RR888',
      oldOwnerName: 'NILESH PAWAR',
      ownerName: '',
      oldOwnerMob: '9899012345',
      newOwnerMob: '9899012346',
      dealerMob: '',
      rtoName: 'AURANGABAD (MH-20)',
      remarks: '',
      totalBill: 3400,
      createdBy: 'demo-staff-1',
      createdAt: daysAgoIso(12),
    },
    {
      id: 'f16',
      fileNumber: 'AA-100016',
      date: daysAgo(9),
      status: 'paper_return',
      dealerName: 'CAR DEKHO',
      workType: 'RMA',
      vehicleNo: 'MH12EF3456',
      vehicleModel: 'PUNCH',
      chassisNo: 'SS999',
      engineNo: 'TT000',
      oldOwnerName: 'KIRAN BHOSALE',
      ownerName: '',
      oldOwnerMob: '9900112345',
      newOwnerMob: '9900112346',
      dealerMob: '',
      rtoName: 'PUNE (MH-12)',
      remarks: 'SIGNATURE MISMATCH',
      totalBill: 1900,
      createdBy: 'demo-admin-1',
      createdAt: daysAgoIso(9),
    },
    {
      id: 'f17',
      fileNumber: 'AA-100017',
      date: daysAgo(11),
      status: 'pending',
      dealerName: 'BADA Finance',
      workType: 'TO+HPT',
      vehicleNo: 'MH01GH7890',
      vehicleModel: 'TIAGO',
      chassisNo: 'UU111',
      engineNo: 'VV222',
      oldOwnerName: 'SANJAY MISHRA',
      ownerName: 'POOJA MISHRA',
      oldOwnerMob: '9911212345',
      newOwnerMob: '9911212346',
      dealerMob: '9911212300',
      rtoName: 'MUMBAI (MH-01)',
      remarks: '',
      totalBill: 4100,
      createdBy: 'demo-staff-1',
      createdAt: daysAgoIso(11),
    },
    {
      id: 'f18',
      fileNumber: 'AA-100018',
      date: daysAgo(18),
      status: 'completed',
      dealerName: 'R K finance',
      workType: 'CA',
      vehicleNo: 'MH31IJ1234',
      vehicleModel: 'AMAZE',
      chassisNo: 'WW333',
      engineNo: 'XX444',
      oldOwnerName: 'HARISH CHOUDHARY',
      ownerName: '',
      oldOwnerMob: '9922312345',
      newOwnerMob: '9922312346',
      dealerMob: '',
      rtoName: 'NAGPUR (MH-31)',
      remarks: '',
      totalBill: 2200,
      createdBy: 'demo-admin-1',
      createdAt: daysAgoIso(18),
    },
    {
      id: 'f19',
      fileNumber: 'AA-100019',
      date: daysAgo(55),
      status: 'pending',
      dealerName: 'SAI finance',
      workType: 'HPT',
      vehicleNo: 'MH15KL5678',
      vehicleModel: 'EON',
      chassisNo: 'YY555',
      engineNo: 'ZZ666',
      oldOwnerName: 'ASHOK REDDY',
      ownerName: '',
      oldOwnerMob: '9933412345',
      newOwnerMob: '9933412346',
      dealerMob: '',
      rtoName: 'NASHIK (MH-15)',
      remarks: '60+ DAYS PENDING',
      totalBill: 1600,
      createdBy: 'demo-staff-1',
      createdAt: daysAgoIso(55),
    },
    {
      id: 'f20',
      fileNumber: 'AA-100020',
      date: daysAgo(15),
      status: 'on_hold',
      dealerName: 'CAR DEKHO',
      workType: 'TO',
      vehicleNo: 'MH12MN9012',
      vehicleModel: 'SANTRO',
      chassisNo: 'AB123',
      engineNo: 'CD456',
      oldOwnerName: 'VIJAY SHINDE',
      ownerName: 'MEERA SHINDE',
      oldOwnerMob: '9944512345',
      newOwnerMob: '9944512346',
      dealerMob: '',
      rtoName: 'PUNE (MH-12)',
      remarks: 'BANK NOC PENDING',
      totalBill: 3700,
      createdBy: 'demo-admin-1',
      createdAt: daysAgoIso(15),
    },
  ];
}

function mergeSeedRecords(existing) {
  const seeded = buildSeedFiles();
  const existingIds = new Set(existing.map((f) => f.id));
  const toAdd = seeded.filter((f) => !existingIds.has(f.id));
  if (!toAdd.length) return existing;
  return [...existing, ...toAdd];
}

function loadAll() {
  try {
    const version = localStorage.getItem(SEED_VERSION_KEY);
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const files = JSON.parse(raw);
      if (version !== String(SEED_VERSION)) {
        const merged = mergeSeedRecords(files);
        saveAll(merged);
        localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
        return merged;
      }
      return files;
    }
  } catch {
    /* empty */
  }
  return seedFiles();
}

function seedFiles() {
  const files = buildSeedFiles();
  saveAll(files);
  localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
  return files;
}

function userFilter(files, userId, isAdmin, filterUserId = null) {
  if (isAdmin) {
    if (filterUserId) {
      const fid = String(filterUserId);
      return files.filter((f) => String(f.createdBy) === fid);
    }
    return files;
  }
  const uid = String(userId);
  return files.filter((f) => String(f.createdBy) === uid);
}

function matchesView(f, type) {
  switch (type) {
    case 'all':
      return ['pending', 'in_progress'].includes(f.status);
    case 'hold':
      return isHoldFile(f);
    case 'return_paper':
      return f.status === 'paper_return';
    case 'objection':
      return f.status === 'objection';
    case 'pending':
      return f.status === 'pending';
    case 'in_progress':
      return f.status === 'in_progress';
    case 'completed':
      return ['completed', 'done'].includes(f.status);
    case 'all_records':
      return true;
    default:
      return true;
  }
}

function compactSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s\-_/. ,()]+/g, '');
}

function matchesSearch(f, search) {
  const needle = compactSearchText(search);
  if (!needle) return true;
  const fields = [
    f.fileNumber,
    f.date,
    f.dealerName,
    f.workType,
    f.vehicleNo,
    f.vehicleModel,
    f.chassisNo,
    f.engineNo,
    f.oldOwnerName,
    f.ownerName,
    f.oldOwnerMob,
    f.newOwnerMob,
    f.dealerMob,
    f.rtoName,
    f.remarks,
    ...(Array.isArray(f.documents) ? f.documents : []),
  ];
  return fields.some((value) => compactSearchText(value).includes(needle));
}

export function getAllDemoFilesForUser(userId, isAdmin, filterUserId = null) {
  return userFilter(loadAll(), userId, isAdmin, filterUserId);
}

export function getDemoStats(userId, isAdmin, filterUserId = null) {
  const files = userFilter(loadAll(), userId, isAdmin, filterUserId);
  return computeFileStats(files);
}

export function getDemoFiles({ userId, isAdmin, search = '', type = 'all', filterUserId = null }) {
  let files = userFilter(loadAll(), userId, isAdmin, filterUserId);
  files = files.filter((f) => matchesView(f, type) && matchesSearch(f, search));
  files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return files;
}

export function createDemoFile(data, userId) {
  const files = loadAll();
  const file = {
    id: `f_${Date.now()}`,
    fileNumber: `AA-${Date.now().toString().slice(-6)}`,
    date: today(),
    status: 'pending',
    totalBill: 0,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    ...data,
  };
  files.unshift(file);
  saveAll(files);
  return file;
}

export function updateDemoFileStatus(id, status, userId, isAdmin, remarks) {
  const files = loadAll();
  const idx = files.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error('File not found');
  if (!isAdmin && String(files[idx].createdBy) !== String(userId)) throw new Error('Access denied');
  files[idx].status = status;
  if (remarks !== undefined) files[idx].remarks = remarks;
  saveAll(files);
  return files[idx];
}

function canAccessFile(file, userId, isAdmin) {
  return isAdmin || String(file.createdBy) === String(userId);
}

export function getDemoFileById(id, userId, isAdmin) {
  const file = loadAll().find((f) => f.id === id);
  if (!file) return null;
  if (!canAccessFile(file, userId, isAdmin)) return null;
  return file;
}

export function updateDemoFile(id, data, userId, isAdmin) {
  const files = loadAll();
  const idx = files.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error('File not found');
  if (!canAccessFile(files[idx], userId, isAdmin)) throw new Error('Access denied');
  files[idx] = { ...files[idx], ...data };
  saveAll(files);
  return files[idx];
}

function sumExpenses(expenses = {}) {
  return (
    (expenses.challan || 0) +
    (expenses.adjustment || 0) +
    (expenses.puc || 0) +
    (expenses.hsrp || 0) +
    (expenses.insurance || 0) +
    (expenses.setDeal || 0)
  );
}

export function updateDemoFileExpenses(id, expenses, userId, isAdmin, paymentDone) {
  const files = loadAll();
  const idx = files.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error('File not found');
  if (!canAccessFile(files[idx], userId, isAdmin)) throw new Error('Access denied');
  files[idx].expenses = expenses;
  files[idx].totalBill = sumExpenses(expenses);
  files[idx].paymentDone = Boolean(paymentDone);
  saveAll(files);
  return files[idx];
}

export function deleteDemoFile(id, userId, isAdmin) {
  const files = loadAll();
  const idx = files.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error('File not found');
  if (!canAccessFile(files[idx], userId, isAdmin)) throw new Error('Access denied');
  files.splice(idx, 1);
  saveAll(files);
}
