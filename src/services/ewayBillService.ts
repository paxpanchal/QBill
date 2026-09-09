import { BusinessDocument, AppSettings, Customer, TransportDetails, TransportMode, VehicleType } from '../types';
import { getStateByName, getStateByCode, extractStateCodeFromGSTIN } from '../utils/gstStates';

/**
 * Standard Unit Quantity Code (UQC) mapping for official NIC e-Way Bill system
 */
const UQC_MAP: Record<string, string> = {
  NOS: 'NOS',
  NUMBERS: 'NOS',
  PCS: 'PCS',
  PIECES: 'PCS',
  KGS: 'KGS',
  KG: 'KGS',
  KILOGRAM: 'KGS',
  MTR: 'MTR',
  METERS: 'MTR',
  METER: 'MTR',
  BOX: 'BOX',
  BOXES: 'BOX',
  BAG: 'BAG',
  BAGS: 'BAG',
  SET: 'SET',
  SETS: 'SET',
  LTR: 'LTR',
  LITERS: 'LTR',
  LITRES: 'LTR',
  TON: 'TON',
  TONS: 'TON',
  DOZ: 'DOZ',
  DOZEN: 'DOZ',
  SQM: 'SQM',
  UNT: 'UNT',
  UNITS: 'UNT',
  UNIT: 'UNT',
};

/**
 * Maps arbitrary unit strings to official NIC e-Way Bill UQC code
 */
export function mapToNicUqc(unitStr?: string): string {
  if (!unitStr) return 'NOS';
  const clean = unitStr.trim().toUpperCase();
  return UQC_MAP[clean] || (clean.length <= 3 ? clean : 'NOS');
}

/**
 * Formats YYYY-MM-DD or ISO string to NIC required DD/MM/YYYY format
 */
export function formatToNicDate(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  // If already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [y, m, d] = trimmed.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  // Try Date parsing
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    // ignore
  }
  return trimmed;
}

/**
 * Extracts 6-digit Indian PIN code from address string
 */
export function extractPinCodeFromAddress(address?: string): string {
  if (!address) return '';
  const match = address.match(/\b([1-9][0-9]{5})\b/);
  return match ? match[1] : '';
}

/**
 * Resolve Customer State Code accurately from Document, Master, GSTIN or State Name
 */
export function resolveCustomerStateCode(doc: BusinessDocument, customer?: Customer | null): string {
  // 1. Direct stateCode on doc
  if (doc.customerStateCode && /^\d{1,2}$/.test(doc.customerStateCode.trim())) {
    return doc.customerStateCode.trim().padStart(2, '0');
  }
  // 2. State code on customer master
  if (customer?.stateCode && /^\d{1,2}$/.test(customer.stateCode.trim())) {
    return customer.stateCode.trim().padStart(2, '0');
  }
  // 3. Extract from GSTIN
  const gstinToUse = doc.customerGstin || customer?.gstin || '';
  if (gstinToUse && gstinToUse.trim() !== 'URP') {
    const fromGst = extractStateCodeFromGSTIN(gstinToUse);
    if (fromGst) return fromGst;
  }
  // 4. Look up by state name
  const stateNameToUse = doc.customerState || customer?.state || '';
  if (stateNameToUse) {
    const st = getStateByName(stateNameToUse);
    if (st) return st.code;
  }
  return '';
}

/**
 * Resolve Customer PIN Code accurately from Document, Master, Customer Address or Doc Address
 */
export function resolveCustomerPinCode(doc: BusinessDocument, customer?: Customer | null): string {
  // 1. Explicit customerPinCode on Document
  if (doc.customerPinCode && /^\d{6}$/.test(doc.customerPinCode.trim())) {
    return doc.customerPinCode.trim();
  }
  // 2. Explicit pinCode in Customer Master
  if (customer?.pinCode && /^\d{6}$/.test(customer.pinCode.trim())) {
    return customer.pinCode.trim();
  }
  // 3. Search in document's customerAddress
  const fromDocAddr = extractPinCodeFromAddress(doc.customerAddress);
  if (fromDocAddr) return fromDocAddr;
  // 4. Search in customer master address
  const fromCustAddr = extractPinCodeFromAddress(customer?.address);
  if (fromCustAddr) return fromCustAddr;
  return '';
}

/**
 * Resolve Customer Place / City
 */
export function resolveCustomerPlace(doc: BusinessDocument, customer?: Customer | null): string {
  if (customer?.city && customer.city.trim().length >= 3) {
    return customer.city.trim();
  }
  if (doc.placeOfSupply && doc.placeOfSupply.trim().length >= 3) {
    // Might be "Gujarat (24)" or "Ahmedabad"
    const cleaned = doc.placeOfSupply.replace(/\s*\(\d+\)/, '').trim();
    if (cleaned.length >= 3) return cleaned;
  }
  if (doc.customerState && doc.customerState.trim().length >= 3) {
    return doc.customerState.trim();
  }
  if (customer?.state && customer.state.trim().length >= 3) {
    return customer.state.trim();
  }
  return 'City';
}

/**
 * Validate that the Invoice and Settings have all required fields for E-Way Bill JSON
 */
export function validateEwayBillPrerequisites(
  doc: BusinessDocument,
  settings: AppSettings | null,
  customer?: Customer | null
): string[] {
  const errors: string[] = [];

  // Check document type
  if (doc.docType !== 'INVOICE') {
    errors.push('E-Way Bill preparation is available for Invoices only.');
    return errors;
  }

  // Check Business Details
  if (!settings?.business?.gstin || !settings.business.gstin.trim()) {
    errors.push('Business GSTIN is missing. Please update Business Settings.');
  }

  const bizStateCode = settings?.business?.stateCode?.trim();
  if (!bizStateCode || !/^\d{1,2}$/.test(bizStateCode)) {
    errors.push('Business State Code is missing. Please update Business Settings.');
  }

  const bizPin = settings?.business?.pinCode ? settings.business.pinCode.replace(/\D/g, '') : '';
  if (!bizPin || bizPin.length !== 6) {
    errors.push('Business PIN Code is required for e-Way Bill JSON generation. Please update Business Settings.');
  }

  // Check Customer Details
  const custStateCode = resolveCustomerStateCode(doc, customer);
  if (!custStateCode) {
    errors.push('State code is missing for the customer. Please update Customer Master before generating the e-Way Bill JSON.');
  }

  const custPin = resolveCustomerPinCode(doc, customer);
  if (!custPin || custPin.length !== 6) {
    errors.push('Customer PIN Code is required for e-Way Bill JSON generation. Please update the Customer Master.');
  }

  // Check Product Items and HSN Codes
  if (!doc.items || doc.items.length === 0) {
    errors.push('Invoice does not contain any product items.');
  } else {
    for (const item of doc.items) {
      const hsn = item.hsnSac ? item.hsnSac.trim() : '';
      if (!hsn) {
        errors.push(`HSN Code is missing for "${item.productName || 'Unnamed Product'}". Please update the Product Master.`);
      }
    }
  }

  return errors;
}

/**
 * Validate Transport Details entered by the user
 */
export function validateTransportDetails(transport: TransportDetails): string[] {
  const errors: string[] = [];

  // 1. Distance validation
  const distNum = Number(transport.distanceKm);
  if (isNaN(distNum) || distNum <= 0) {
    errors.push('Transport Distance is required (must be greater than 0 KM).');
  }

  // 2. Transporter ID format validation (if provided)
  const transId = transport.transporterId ? transport.transporterId.trim().toUpperCase() : '';
  if (transId) {
    // Must be 15 alphanumeric characters (GSTIN or TRANSIN)
    if (!/^[0-9A-Z]{15}$/.test(transId)) {
      errors.push('Transporter ID must be a valid 15-character GSTIN or TRANSIN.');
    }
  }

  // 3. Mode-specific smart validation
  const mode = transport.transMode;
  const vehicleNoClean = transport.vehicleNo ? transport.vehicleNo.replace(/[\s-]/g, '').toUpperCase() : '';

  if (mode === '1') {
    // ROAD: Requires either Vehicle Number OR Transporter ID
    if (!vehicleNoClean && !transId) {
      errors.push('Either Vehicle Number or Transporter ID is required for Road transport.');
    }

    if (vehicleNoClean) {
      if (vehicleNoClean.length < 4 || vehicleNoClean.length > 15) {
        errors.push('Vehicle Number must be between 4 and 15 alphanumeric characters.');
      }
      if (!transport.vehicleType || (transport.vehicleType !== 'R' && transport.vehicleType !== 'O')) {
        errors.push('Vehicle Type (Regular or Over Dimension Cargo) is required when Vehicle Number is provided.');
      }
    }
  } else {
    // RAIL ('2'), AIR ('3'), SHIP ('4')
    const modeName = mode === '2' ? 'Rail' : mode === '3' ? 'Air' : 'Ship';
    const docLabel = mode === '2' ? 'Railway Receipt (RR)' : mode === '3' ? 'Airway Bill' : 'Bill of Lading';

    if (!transport.transDocNo || !transport.transDocNo.trim()) {
      errors.push(`Transport Document Number (${docLabel}) is required for ${modeName} transport.`);
    }

    if (!transport.transDocDate || !transport.transDocDate.trim()) {
      errors.push(`Transport Document Date is required for ${modeName} transport.`);
    }
  }

  return errors;
}

/**
 * Generate official NIC E-Way Bill JSON structure matching official schema version 1.0.0421
 */
export function buildEwayBillJsonObject(
  doc: BusinessDocument,
  settings: AppSettings,
  transport: TransportDetails,
  customer?: Customer | null
) {
  const fromGstin = settings.business.gstin.trim().toUpperCase();
  const fromTrdName = settings.business.legalBusinessName?.trim() || settings.business.businessName.trim();
  const fromAddr1 = (settings.business.address || '').slice(0, 120).trim() || 'Unit Address';
  const fromPlace = (settings.business.city || 'Ahmedabad').trim();
  const fromPincode = Number(settings.business.pinCode.replace(/\D/g, ''));
  const fromStateCode = Number(settings.business.stateCode.trim());

  const custGstin = doc.customerGstin && doc.customerGstin.trim() && doc.customerGstin.trim() !== 'URP'
    ? doc.customerGstin.trim().toUpperCase()
    : 'URP';
  const toTrdName = doc.customerName.trim();
  const toAddr1 = (doc.customerAddress || customer?.address || '').slice(0, 120).trim() || 'Customer Address';
  const toPlace = resolveCustomerPlace(doc, customer);
  const toPincode = Number(resolveCustomerPinCode(doc, customer));
  const toStateCode = Number(resolveCustomerStateCode(doc, customer));

  const cleanVehicleNo = transport.vehicleNo ? transport.vehicleNo.replace(/[\s-]/g, '').toUpperCase() : '';
  const cleanTransId = transport.transporterId ? transport.transporterId.trim().toUpperCase() : '';

  // Calculate other value (freight + other charges - discount)
  const freight = Number((doc.freightCharges || 0).toFixed(2));
  const otherCharges = Number((doc.otherCharges || 0).toFixed(2));
  const discount = Number((doc.discountAmount || 0).toFixed(2));
  const otherValue = Number((freight + otherCharges - discount).toFixed(2));

  // NIC E-Way Bill Item List
  const itemList = doc.items.map((item, idx) => {
    const rawHsn = item.hsnSac ? item.hsnSac.replace(/\D/g, '') : '';
    const hsnCode = rawHsn ? Number(rawHsn) : 0;
    const gstRate = Number(item.gstRate || 0);

    const cgstRate = doc.isInterState ? 0 : Number((gstRate / 2).toFixed(2));
    const sgstRate = doc.isInterState ? 0 : Number((gstRate / 2).toFixed(2));
    const igstRate = doc.isInterState ? gstRate : 0;

    return {
      itemNo: idx + 1,
      productName: item.productName.trim(),
      productDesc: (item.productDescription || item.productName).trim(),
      hsnCode: hsnCode,
      quantity: Number(item.quantity) || 1,
      qtyUnit: mapToNicUqc(item.unit || item.productDescription || 'NOS'),
      cgstRate: cgstRate,
      sgstRate: sgstRate,
      igstRate: igstRate,
      cessRate: 0,
      cessNonAdvol: 0,
      taxableAmount: Number(item.amount.toFixed(2)),
    };
  });

  const billPayload = {
    userGstin: fromGstin,
    supplyType: 'O', // Outward Supply
    subSupplyType: '1', // Supply
    subSupplyDesc: '',
    docType: 'INV', // Tax Invoice
    docNo: doc.docNumber,
    docDate: formatToNicDate(doc.docDate),
    transType: 1, // Regular Transaction
    fromGstin: fromGstin,
    fromTrdName: fromTrdName,
    fromAddr1: fromAddr1,
    fromAddr2: '',
    fromPlace: fromPlace,
    fromPincode: fromPincode,
    actFromStateCode: fromStateCode,
    fromStateCode: fromStateCode,
    toGstin: custGstin,
    toTrdName: toTrdName,
    toAddr1: toAddr1,
    toAddr2: '',
    toPlace: toPlace,
    toPincode: toPincode,
    actToStateCode: toStateCode,
    toStateCode: toStateCode,
    transactionType: 1,
    otherValue: otherValue,
    totalValue: Number(doc.taxableValue.toFixed(2)),
    cgstValue: Number((doc.cgst || 0).toFixed(2)),
    sgstValue: Number((doc.sgst || 0).toFixed(2)),
    igstValue: Number((doc.igst || 0).toFixed(2)),
    cessValue: 0,
    cessNonAdvolValue: 0,
    totInvValue: Number(doc.grandTotal.toFixed(2)),
    transMode: transport.transMode,
    transDistance: String(transport.distanceKm).trim(),
    transporterName: transport.transporterName ? transport.transporterName.trim() : '',
    transporterId: cleanTransId,
    transDocNo: transport.transDocNo ? transport.transDocNo.trim() : '',
    transDocDate: transport.transDocDate ? formatToNicDate(transport.transDocDate) : '',
    vehicleNo: cleanVehicleNo,
    vehicleType: cleanVehicleNo ? (transport.vehicleType || 'R') : '',
    itemList: itemList,
  };

  const ewayBillJson = {
    version: '1.0.0421',
    billLists: [billPayload],
  };

  return ewayBillJson;
}

/**
 * Generate safe sanitized filename for download:
 * EWAYBILL_[Invoice Number]_[YYYYMMDD].json
 */
export function generateEwayBillFileName(docNumber: string, docDate?: string): string {
  // Sanitize doc number (replace slashes, spaces, special chars)
  const safeDocNo = docNumber.replace(/[\/\s\\#]/g, '_').toUpperCase();

  let dateStamp = '';
  if (docDate && /^\d{4}-\d{2}-\d{2}/.test(docDate)) {
    dateStamp = docDate.slice(0, 10).replace(/-/g, '');
  } else {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    dateStamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  }

  return `EWAYBILL_${safeDocNo}_${dateStamp}.json`;
}

/**
 * Trigger browser file download of E-Way Bill JSON
 */
export function downloadJsonFile(jsonObject: object, filename: string): void {
  const jsonString = JSON.stringify(jsonObject, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Local cache of recently entered transporters to support instant auto-suggest
 * and ready hookup for a future Transporter Master
 */
const RECENT_TRANSPORTERS_KEY = 'quickbill_recent_transporters';

export function getRecentTransporters(): Array<{ name: string; id: string }> {
  try {
    const data = localStorage.getItem(RECENT_TRANSPORTERS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    // ignore
  }
  return [];
}

export function saveRecentTransporter(name: string, id: string): void {
  try {
    if (!name.trim() && !id.trim()) return;
    const list = getRecentTransporters().filter(
      t => t.id.toLowerCase() !== id.trim().toLowerCase() && t.name.toLowerCase() !== name.trim().toLowerCase()
    );
    list.unshift({ name: name.trim(), id: id.trim().toUpperCase() });
    // Keep max 10
    localStorage.setItem(RECENT_TRANSPORTERS_KEY, JSON.stringify(list.slice(0, 10)));
  } catch (e) {
    // ignore
  }
}
