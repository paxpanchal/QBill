/**
 * Indian Currency and Number Formatting Utilities
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertTwoDigits(num: number): string {
  if (num === 0) return '';
  if (num < 20) return ONES[num];
  const ten = Math.floor(num / 10);
  const one = num % 10;
  return TENS[ten] + (one ? ' ' + ONES[one] : '');
}

function convertThreeDigits(num: number): string {
  if (num === 0) return '';
  const hundred = Math.floor(num / 100);
  const rest = num % 100;
  let str = '';
  if (hundred > 0) {
    str += ONES[hundred] + ' Hundred';
    if (rest > 0) str += ' and ';
  }
  if (rest > 0) {
    str += convertTwoDigits(rest);
  }
  return str;
}

export function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Rupees Zero Only';

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  let words = '';

  if (rupees === 0) {
    words = 'Zero';
  } else {
    // Break into Crores, Lakhs, Thousands, Hundreds/Tens
    // Crores (>= 1,00,00,000)
    const crores = Math.floor(rupees / 10000000);
    const afterCrores = rupees % 10000000;

    // Lakhs (>= 1,00,000)
    const lakhs = Math.floor(afterCrores / 100000);
    const afterLakhs = afterCrores % 100000;

    // Thousands (>= 1,000)
    const thousands = Math.floor(afterLakhs / 1000);
    const remainder = afterLakhs % 1000;

    const parts: string[] = [];

    if (crores > 0) {
      parts.push(`${convertTwoDigits(crores)} Crore`);
    }
    if (lakhs > 0) {
      parts.push(`${convertTwoDigits(lakhs)} Lakh`);
    }
    if (thousands > 0) {
      parts.push(`${convertTwoDigits(thousands)} Thousand`);
    }
    if (remainder > 0) {
      parts.push(convertThreeDigits(remainder));
    }

    words = parts.join(' ');
  }

  let result = `Rupees ${words}`;
  if (paise > 0) {
    result += ` and ${convertTwoDigits(paise)} Paise`;
  }
  result += ' Only';

  return isNegative ? `Minus ${result}` : result;
}

export function formatIndianCurrency(amount: number, showSymbol = true): string {
  if (isNaN(amount)) return showSymbol ? '₹ 0.00' : '0.00';
  
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const parts = absAmount.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian format: last 3 digits, then groups of 2 digits
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  const formatted = `${formattedInteger}.${decimalPart}`;

  return `${isNegative ? '-' : ''}${showSymbol ? '₹ ' : ''}${formatted}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

export function formatDateFull(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateString;
  }
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
  } catch {
    return isoString;
  }
}
