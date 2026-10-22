/** Indian compact units. Leading number stays under 1,000 so cards never overflow. */

const THOUSAND = 1_000;
const LAKH = 1_00_000;
const CRORE = 1_00_00_000;
const LAKH_CRORE = LAKH * CRORE; // 10^12
const K_LAKH_CRORE = THOUSAND * LAKH_CRORE; // 10^15
const L_LAKH_CRORE = LAKH * LAKH_CRORE; // 10^17
const CR_LAKH_CRORE = CRORE * LAKH_CRORE; // 10^19

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function trimDecimals(value) {
  return value.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Cards compact only from 1 Lakh. K is for chart axis ticks only.
 * 16,800 → 16,800
 * 1,20,000 → 1.2 L
 */
function compactParts(abs, kThreshold = Infinity) {
  if (abs >= CR_LAKH_CRORE) {
    return { scaled: abs / CR_LAKH_CRORE, unit: 'Cr Lakh Cr', axis: 'CrLC' };
  }
  if (abs >= L_LAKH_CRORE) {
    return { scaled: abs / L_LAKH_CRORE, unit: 'L Lakh Cr', axis: 'LLC' };
  }
  if (abs >= K_LAKH_CRORE) {
    return { scaled: abs / K_LAKH_CRORE, unit: 'K Lakh Cr', axis: 'KLC' };
  }
  if (abs >= LAKH_CRORE) {
    return { scaled: abs / LAKH_CRORE, unit: 'Lakh Cr', axis: 'LC' };
  }
  if (abs >= CRORE) {
    return { scaled: abs / CRORE, unit: 'Cr', axis: 'Cr' };
  }
  if (abs >= LAKH) {
    return { scaled: abs / LAKH, unit: 'L', axis: 'L' };
  }
  if (abs >= kThreshold) {
    return { scaled: abs / THOUSAND, unit: 'K', axis: 'K' };
  }
  return null;
}

export function formatCompactCount(value) {
  const n = toNumber(value);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const parts = compactParts(abs);
  if (!parts) return `${sign}${abs.toLocaleString('en-IN')}`;
  return `${sign}${trimDecimals(parts.scaled)} ${parts.unit}`;
}

export function formatFullCount(value) {
  return toNumber(value).toLocaleString('en-IN');
}

export function formatCompactRupee(value) {
  const n = toNumber(value);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const parts = compactParts(abs);
  if (!parts) return `${sign}₹ ${abs.toLocaleString('en-IN')}`;
  return `${sign}₹ ${trimDecimals(parts.scaled)} ${parts.unit}`;
}

export function formatFullRupee(value) {
  return `₹ ${toNumber(value).toLocaleString('en-IN')}`;
}

/** Short Y-axis ticks so large billing scales stay readable. */
export function formatRupeeAxisTick(value) {
  const n = toNumber(value);
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  const parts = compactParts(abs, THOUSAND);
  if (!parts) return `${sign}₹${abs.toLocaleString('en-IN')}`;
  return `${sign}₹${trimDecimals(parts.scaled)}${parts.axis}`;
}
