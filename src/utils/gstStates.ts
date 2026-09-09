export interface GSTState {
  name: string;
  code: string;
}

export const INDIAN_STATES: GSTState[] = [
  { name: 'Jammu & Kashmir', code: '01' },
  { name: 'Himachal Pradesh', code: '02' },
  { name: 'Punjab', code: '03' },
  { name: 'Chandigarh', code: '04' },
  { name: 'Uttarakhand', code: '05' },
  { name: 'Haryana', code: '06' },
  { name: 'Delhi', code: '07' },
  { name: 'Rajasthan', code: '08' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'Bihar', code: '10' },
  { name: 'Sikkim', code: '11' },
  { name: 'Arunachal Pradesh', code: '12' },
  { name: 'Nagaland', code: '13' },
  { name: 'Manipur', code: '14' },
  { name: 'Mizoram', code: '15' },
  { name: 'Tripura', code: '16' },
  { name: 'Meghalaya', code: '17' },
  { name: 'Assam', code: '18' },
  { name: 'West Bengal', code: '19' },
  { name: 'Jharkhand', code: '20' },
  { name: 'Odisha', code: '21' },
  { name: 'Chhattisgarh', code: '22' },
  { name: 'Madhya Pradesh', code: '23' },
  { name: 'Gujarat', code: '24' },
  { name: 'Daman and Diu', code: '25' },
  { name: 'Dadra and Nagar Haveli', code: '26' },
  { name: 'Maharashtra', code: '27' },
  { name: 'Andhra Pradesh (Old)', code: '28' },
  { name: 'Karnataka', code: '29' },
  { name: 'Goa', code: '30' },
  { name: 'Lakshadweep', code: '31' },
  { name: 'Kerala', code: '32' },
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Puducherry', code: '34' },
  { name: 'Andaman & Nicobar Islands', code: '35' },
  { name: 'Telangana', code: '36' },
  { name: 'Andhra Pradesh (New)', code: '37' },
  { name: 'Ladakh', code: '38' },
  { name: 'Other Territory', code: '97' },
];

export function getStateByCode(code: string): GSTState | undefined {
  const cleanCode = code.trim().padStart(2, '0');
  return INDIAN_STATES.find(s => s.code === cleanCode);
}

export function getStateByName(name: string): GSTState | undefined {
  const cleanName = name.trim().toLowerCase();
  return INDIAN_STATES.find(s => s.name.toLowerCase() === cleanName);
}

export function extractStateCodeFromGSTIN(gstin: string): string {
  const cleanGstin = gstin.trim().toUpperCase();
  if (cleanGstin.length >= 2 && /^\d{2}/.test(cleanGstin)) {
    return cleanGstin.substring(0, 2);
  }
  return '';
}

export function validateGSTIN(gstin: string): boolean {
  if (!gstin) return false;
  // GSTIN format: 2 digits state code + 10 alphanumeric PAN + 1 digit entity number + 1 'Z' + 1 checksum char
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin.trim().toUpperCase());
}
