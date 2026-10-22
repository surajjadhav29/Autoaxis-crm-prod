export const NEW_OWNER_WORK_TYPES = ['TO', 'TO+HPT', 'TO+HPT+HPA'];

export function requiresNewOwner(workType) {
  const normalized = (workType || '').toUpperCase().replace(/\s+/g, '');
  // Exact list, plus any work type that starts with TO (e.g. TO&HPA, TO+HPA)
  if (NEW_OWNER_WORK_TYPES.includes(normalized)) return true;
  return normalized === 'TO' || normalized.startsWith('TO+') || normalized.startsWith('TO&');
}

export function hasNewOwnerDetails(file) {
  const name = (file?.ownerName || '').trim();
  const mob = (file?.newOwnerMob || '').trim();
  return Boolean(name && mob);
}

// The built-in system superadmin account. It is hidden from all user lists
// (users table, dashboard filter, assignee dropdowns) and excluded from the
// user limit.
export const SYSTEM_ACCOUNT_EMAIL = 'superadmin@autoaxis.com';

// Client name shown in tables/cards: the new owner's name when present,
// otherwise fall back to the old owner's name.
export function clientName(file) {
  const newOwner = (file?.ownerName || '').trim();
  return newOwner || (file?.oldOwnerName || '').trim();
}

export const DEALERS = [
  'CAR DEKHO',
  'BADA Finance',
  'R K finance',
  'SAI finance',
  's i adcon',
];

export const SPECIAL_DEALERS = DEALERS;

export const RTOS = [
  'MH01 - CENTRAL',
  'MH02 - MUMBAI WEST',
  'MH03 - MUMBAI EAST',
  'MH04 - THANE',
  'MH05 - KALYAN',
  'MH06 - PEN (RAIGAD)',
  'MH07 - SINDHUDURG',
  'MH08 - RATNAGIRI',
  'MH09 - KOLHAPUR',
  'MH10 - SANGLI',
  'MH11 - SATARA',
  'MH12 - PUNE',
  'MH13 - SOLAPUR',
  'MH14 - PCMC',
  'MH15 - NASHIK',
  'MH16 - AHMEDNAGAR',
  'MH17 - SHRIRAMPUR',
  'MH18 - DHULE',
  'MH19 - JALGAON',
  'MH20 - SAMBHAJI NAGAR',
  'MH21 - JALNA',
  'MH22 - PARBHANI',
  'MH23 - BEED',
  'MH24 - LATUR',
  'MH25 - DHARASHIV',
  'MH26 - NANDED',
  'MH27 - AMRAVATI',
  'MH28 - BULDHANA',
  'MH29 - YAVATMAL',
  'MH30 - AKOLA',
  'MH31 - NAGPUR (URBAN)',
  'MH32 - WARDHA',
  'MH33 - GADCHIROLI',
  'MH34 - CHANDRAPUR',
  'MH35 - GONDIYA',
  'MH36 - BHANDARA',
  'MH37 - WASHIM',
  'MH38 - HINGOLI',
  'MH39 - NANDURBAR',
  'MH40 - NAGPUR (RURAL)',
  'MH41 - MALEGAON',
  'MH42 - BARAMATI',
  'MH43 - VASHI',
  'MH44 - AMBEJOGAI',
  'MH45 - AKLUJ',
  'MH46 - PANVEL',
  'MH47 - BORIVALI',
  'MH48 - VASAI',
  'MH49 - NAGPUR (EAST)',
  'MH50 - KARAD',
  'MH51 - Phaltan',
  'MH52 - Udgir',
];

export const PAPER_LOCATIONS = [
  { value: 'paper_in_office', label: 'Paper in office' },
  { value: 'paper_with_field_agent', label: 'Paper with field agent' },
];

export const DEFAULT_PAPER_LOCATION = 'paper_in_office';

export function paperLocationLabel(value) {
  const key = String(value || '').trim();
  return PAPER_LOCATIONS.find((item) => item.value === key)?.label || PAPER_LOCATIONS[0].label;
}

/** Shorter label for table cells and mobile cards. */
export function paperLocationShortLabel(value) {
  return value === 'paper_with_field_agent' ? 'With field agent' : 'In office';
}

export const FILE_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'in_progress', label: 'In Process', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'objection', label: 'Objection', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'paper_return', label: 'Paper Return', color: 'bg-slate-800 text-white border-slate-800' },
  { value: 'on_hold', label: 'On Hold', color: 'bg-sky-100 text-sky-800 border-sky-300' },
  { value: 'completed', label: 'Done', color: 'bg-green-50 text-green-700 border-green-200' },
];

export const VIEW_TYPES = {
  all: 'Live Dashboard',
  hold: 'Hold',
  return_paper: 'Paper Return',
  objection: 'Return Objection',
  pending: 'Pending Desk',
  in_progress: 'In Process',
  completed: 'Completed',
  all_records: 'All Files',
};
