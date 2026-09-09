export type UserRole = 'Admin' | 'User' | 'ADMIN' | 'USER';

export interface UserPermissions {
  dashboard?: boolean;
  createInvoice: boolean;
  createQuotation: boolean;
  misDocuments?: boolean;
  viewMIS?: boolean;
  excelExport: boolean;
  printDocument: boolean;
  downloadPdf?: boolean;
  sharePdf: boolean;
  reprintDocument?: boolean;
  customerMaster?: boolean;
  productMaster?: boolean;
  manageCustomers?: boolean;
  manageProducts?: boolean;
  editOwnDocuments: boolean;
  editAllDocuments: boolean;
  cancelDocument: boolean;
  settings?: boolean;
  manageSettings?: boolean;
  userManagement?: boolean;
  manageUsers?: boolean;
  backupRestore?: boolean;
}

export interface UserAccount {
  id: string;
  fullName?: string;
  displayName: string;
  username: string;
  password?: string;
  passwordHash?: string; // SHA-256 hashed
  role: UserRole;
  active?: boolean;
  status?: 'Active' | 'Inactive';
  permissions: UserPermissions;
  createdDate: string;
  lastLoginDate?: string;
}

export interface SyncQueueItem {
  id: string;
  documentId: string;
  documentNumber: string;
  action: 'CREATE' | 'UPDATE' | 'CANCEL';
  payload: any;
  retryCount: number;
  lastAttempt?: string;
  error?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'FAILED' | 'COMPLETED';
}

export interface Customer {
  id: string;
  customerName: string;
  address: string;
  city?: string;
  pinCode: string;
  gstin: string;
  contactNumber: string;
  email: string;
  state: string;
  stateCode: string;
  active: boolean;
  createdDate: string;
  lastUpdatedDate: string;
}

export type TransportMode = '1' | '2' | '3' | '4'; // 1: Road, 2: Rail, 3: Air, 4: Ship
export type VehicleType = 'R' | 'O'; // R: Regular, O: Over Dimensional Cargo

export interface TransportDetails {
  transMode: TransportMode;
  transporterName: string;
  transporterId: string; // 15-character Transporter ID (GSTIN or TRANSIN)
  distanceKm: number | string;
  vehicleNo: string;
  vehicleType: VehicleType;
  transDocNo?: string;
  transDocDate?: string; // YYYY-MM-DD or DD/MM/YYYY
}

export interface TransporterEntry {
  id?: string;
  transporterName: string;
  transporterId: string;
  defaultMode?: TransportMode;
  lastUsedDate?: string;
}

export interface Product {
  id: string;
  productName: string;
  productDescription: string;
  hsnSac: string;
  unit?: string;
  defaultGstRate: number; // e.g. 18 for 18%
  defaultBasePrice: number;
  active: boolean;
  createdDate: string;
  lastUpdatedDate: string;
}

export interface CustomerPriceHistoryEntry {
  docNumber: string;
  docDate: string;
  price: number;
  quantity: number;
}

export interface CustomerProductPriceHistory {
  id: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  lastPrice: number;
  previousPrice?: number;
  lastDocNumber: string;
  lastDocDate: string;
  history: CustomerPriceHistoryEntry[];
}

export interface DocumentItem {
  id: string;
  srNo: number;
  productId?: string;
  productName: string;
  productDescription: string;
  hsnSac: string;
  unit?: string;
  gstRate: number; // %
  quantity: number;
  rate: number;
  amount: number; // qty * rate
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalWithTax: number;
}

export type DocumentType = 'INVOICE' | 'QUOTATION' | 'PO';
export type DocumentStatus = 'GENERATED' | 'DRAFT' | 'CANCELLED' | 'CONVERTED';

export interface DocumentChangeLog {
  timestamp: string;
  editedBy: string;
  editedByName: string;
  reason: string;
  summary: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

export interface BusinessDocument {
  id: string;
  docType: DocumentType;
  docNumber: string;
  docDate: string; // YYYY-MM-DD
  docTime: string; // HH:mm:ss
  financialYear: string; // e.g., '26-27'
  
  // Customer Details
  customerId?: string;
  customerName: string;
  customerAddress: string;
  customerPinCode?: string;
  customerGstin: string;
  customerContact: string;
  customerEmail: string;
  customerState: string;
  customerStateCode: string;
  placeOfSupply: string;
  
  // Transport & Orders
  buyerOrderNo?: string;
  buyerOrderDate?: string;
  dispatchDocNo?: string;
  dispatchedThrough?: string;
  destination?: string;
  paymentTerms?: string;
  termsOfDelivery?: string;
  
  // Line Items
  items: DocumentItem[];
  
  // Financial Totals
  productTotal: number; // sum of item amounts
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  discountAmount: number;
  taxableValue: number;
  
  freightCharges: number;
  freightGstRate: number;
  freightGstAmount: number;
  otherCharges: number;
  
  isInterState: boolean; // true for IGST, false for CGST+SGST
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  roundingOff: number;
  grandTotal: number;
  amountInWords: string;
  
  // Workflow & Audit
  status: DocumentStatus;
  isDraft: boolean;
  generatedBy: string; // user id
  generatedByName: string; // display name
  generatedAt: string; // ISO datetime
  lastEditedBy?: string;
  lastEditedByName?: string;
  lastEditedAt?: string;
  cancellationReason?: string;
  changeHistory: DocumentChangeLog[];
  
  // Conversions
  originalQuotationId?: string;
  originalQuotationNumber?: string;
  convertedInvoiceId?: string;
  convertedInvoiceNumber?: string;
  
  // Print & Copy type
  copyType?: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE';
  notes?: string;
  
  // Sync
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  lastSyncAttempt?: string;
  syncError?: string;
}

export interface MISRecord {
  documentType: DocumentType;
  documentNumber: string;
  documentDate: string;
  documentTime: string;
  customerName: string;
  productDetailsDisplay: string; // formatted single string with items
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  freight: number;
  otherCharges: number;
  discount: number;
  roundingOff: number;
  grandTotal: number;
  status: DocumentStatus;
  generatedBy: string; // display name
  createdAt: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  id: string; // document id
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  recordType: 'DOCUMENT' | 'CUSTOMER' | 'PRODUCT' | 'USER' | 'SETTINGS' | 'BACKUP' | 'SYNC';
  recordId?: string;
  docNumber?: string;
  details: string;
}

export interface BusinessSettings {
  businessName: string;
  legalBusinessName: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pinCode: string;
  country: string;
  gstin: string;
  pan: string;
  email: string;
  primaryContact: string;
  secondaryContact: string;
  website: string;
}

export interface BankSettings {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upiId: string;
  showOnInvoice: boolean;
  showOnQuotation: boolean;
}

export interface BrandingSettings {
  logoUrl?: string;
  signatureUrl?: string;
  stampUrl?: string;
  showLogo: boolean;
  showSignature: boolean;
  showStamp: boolean;
}

export interface TaxSettings {
  availableGstRates: number[];
  defaultGstRate: number;
  defaultFreightGstRate: number;
  sellerState: string;
  sellerStateCode: string;
  allowManualGstOverride: boolean;
}

export interface SeriesNumberingConfig {
  prefix: string;
  suffix: string;
  financialYear: string;
  startingNumber: number;
  nextNumber: number;
  numberPadding: number;
}

export interface NumberingSettings {
  invoice: SeriesNumberingConfig;
  quotation: SeriesNumberingConfig;
  purchaseOrder: SeriesNumberingConfig;
}

export interface TermsSettings {
  invoiceTerms: string[];
  quotationTerms: string[];
  paymentTerms: string;
  declaration: string;
}

export interface AutomationSettings {
  autoAddNewCustomers: boolean;
  autoAddNewProducts: boolean;
  priceUpdateRule: 'NEVER' | 'ASK' | 'ALWAYS';
}

export interface DocumentEditSettings {
  allowUsersToEdit: boolean;
  requireEditReason: boolean;
  requireAdminApproval: boolean;
}

export interface PrintSettings {
  paperSize: 'A4';
  showLogo: boolean;
  showBankDetails: boolean;
  showSignature: boolean;
  showStamp: boolean;
  showTerms: boolean;
  showDeclaration: boolean;
  showUpiQr: boolean;
}

export interface ApplicationInfoSettings {
  applicationName: string;
  versionNumber: string;
  releaseDate: string;
  lastUpdatedDate: string;
  developerName: string;
  developerCompany?: string;
  developerEmail?: string;
  developerContact?: string;
  developerWebsite?: string;
  developerLinkedInUrl: string;
  copyrightText?: string;
}

export interface GoogleSheetsSyncSettings {
  enableSync: boolean;
  sheetUrl: string;
  sheetId: string;
  googleAppsScriptUrl: string;
  autoSync: boolean;
  lastSuccessfulSync?: string;
  syncStatus: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  pendingRecords: number;
  failedRecords: number;
  lastError?: string;
}

export interface AppSettings {
  business: BusinessSettings;
  bank: BankSettings;
  branding: BrandingSettings;
  tax: TaxSettings;
  numbering: NumberingSettings;
  terms: TermsSettings;
  automation: AutomationSettings;
  documentEdit: DocumentEditSettings;
  print: PrintSettings;
  appInfo: ApplicationInfoSettings;
  googleSync: GoogleSheetsSyncSettings;
}

export interface BackupData {
  applicationName: string;
  backupVersion: string;
  backupDateTime: string;
  applicationVersion: string;
  counts: {
    users: number;
    customers: number;
    products: number;
    documents: number;
    priceHistories: number;
    auditLogs: number;
  };
  users: Omit<UserAccount, 'passwordHash'>[]; // Never export password hashes
  customers: Customer[];
  products: Product[];
  documents: BusinessDocument[];
  priceHistories: CustomerProductPriceHistory[];
  auditLogs: AuditLog[];
  settings: AppSettings;
}

export interface BackupStatus {
  lastBackupDate: string | null;
  lastBackupTime: string | null;
  documentsSinceLastBackup: number;
}

export interface DocumentExportData {
  exportType: 'QUICKBILL_DOCUMENT_EXPORT';
  exportVersion: '1.0';
  exportDateTime: string;
  applicationName: string;
  applicationVersion: string;
  dateRange?: {
    from: string;
    to: string;
  };
  filterDocType?: DocumentType | 'ALL';
  counts: {
    documents: number;
    customers: number;
    products: number;
    priceHistories: number;
  };
  documents: BusinessDocument[];
  customers: Customer[];
  products: Product[];
  priceHistories: CustomerProductPriceHistory[];
}

export interface ImportConflictItem {
  type: 'EXACT_MATCH' | 'DOC_NUMBER_CONFLICT' | 'NEW';
  docNumber: string;
  existingDocId?: string;
  importDocId: string;
  existingTotal?: number;
  importTotal: number;
  existingCustomer?: string;
  importCustomer: string;
  existingDate?: string;
  importDate: string;
  isConflict: boolean;
}

export interface ImportPreviewResult {
  isValid: boolean;
  errorMessage?: string;
  exportDateTime?: string;
  totalDocumentsFound: number;
  newDocumentsCount: number;
  potentialDuplicatesCount: number;
  conflictsCount: number;
  newCustomersCount: number;
  newProductsCount: number;
  details: ImportConflictItem[];
  customersToAdd: Customer[];
  productsToAdd: Product[];
  documentsToImport: BusinessDocument[];
  priceHistoriesToImport: CustomerProductPriceHistory[];
}

