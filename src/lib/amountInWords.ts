const BELOW_TWENTY = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return BELOW_TWENTY[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${TENS[t]}${o ? ` ${BELOW_TWENTY[o]}` : ''}`.trim();
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (!h) return twoDigits(rest);
  return `${BELOW_TWENTY[h]} Hundred${rest ? ` ${twoDigits(rest)}` : ''}`;
}

function belowThousand(n: number): string {
  if (n === 0) return '';
  if (n < 100) return twoDigits(n);
  return threeDigits(n);
}

/** Indian numbering: Crore → Lakh → Thousand → rest. Whole rupees only. */
export function amountInWordsInr(amount: number): string {
  let n = Math.round(Math.max(0, amount));
  if (n === 0) return 'Zero Rupees only';

  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;

  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${belowThousand(thousand)} Thousand`);
  if (n) parts.push(belowThousand(n));

  const words = parts.join(' ').replace(/\s+/g, ' ').trim();
  return `${words} Rupees only`;
}
