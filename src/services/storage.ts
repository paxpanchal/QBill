import {
  UserAccount,
  Customer,
  Product,
  BusinessDocument,
  DocumentType,
  CustomerProductPriceHistory,
  AuditLog,
  AppSettings,
  BackupData,
  BackupStatus,
  DocumentExportData,
  ImportPreviewResult,
  ImportConflictItem,
  MISRecord,
  SyncQueueItem,
  UserPermissions
} from '../types';

// SHA-256 Password Hashing Utility
export async function hashPassword(plainText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(plainText: string, hash?: string, plainStored?: string): Promise<boolean> {
  if (plainStored && plainText === plainStored) return true;
  if (!hash) return false;
  const computed = await hashPassword(plainText);
  return computed === hash;
}

const DB_NAME = 'PramukrajEnterprisesDB';
const DB_VERSION = 1;

const STORES = {
  USERS: 'users',
  CUSTOMERS: 'customers',
  PRODUCTS: 'products',
  DOCUMENTS: 'documents',
  PRICE_HISTORY: 'price_history',
  AUDIT_LOGS: 'audit_logs',
  SETTINGS: 'settings',
  SYNC_QUEUE: 'sync_queue',
} as const;

export const DEFAULT_ADMIN_PERMISSIONS: UserPermissions = {
  dashboard: true,
  createInvoice: true,
  createQuotation: true,
  misDocuments: true,
  viewMIS: true,
  excelExport: true,
  printDocument: true,
  downloadPdf: true,
  sharePdf: true,
  reprintDocument: true,
  customerMaster: true,
  productMaster: true,
  manageCustomers: true,
  manageProducts: true,
  editOwnDocuments: true,
  editAllDocuments: true,
  cancelDocument: true,
  settings: true,
  manageSettings: true,
  userManagement: true,
  manageUsers: true,
  backupRestore: true,
};

// All users have full admin access in the current version
export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  ...DEFAULT_ADMIN_PERMISSIONS,
};

export const DEFAULT_SETTINGS: AppSettings = {
  business: {
    businessName: '',
    legalBusinessName: '',
    address: '',
    city: '',
    state: '',
    stateCode: '',
    pinCode: '',
    country: 'India',
    gstin: '',
    pan: '',
    email: '',
    primaryContact: '',
    secondaryContact: '',
    website: '',
  },
  bank: {
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    ifsc: '',
    branch: '',
    upiId: '',
    showOnInvoice: true,
    showOnQuotation: true,
  },
  branding: {
    logoUrl: '',
    signatureUrl: '',
    stampUrl: '',
    showLogo: true,
    showSignature: true,
    showStamp: true,
  },
  tax: {
    availableGstRates: [0, 5, 12, 18, 28],
    defaultGstRate: 18,
    defaultFreightGstRate: 18,
    sellerState: '',
    sellerStateCode: '',
    allowManualGstOverride: true,
  },
  numbering: {
    invoice: {
      prefix: 'INV/',
      suffix: '',
      financialYear: '26-27/',
      startingNumber: 1,
      nextNumber: 1,
      numberPadding: 4,
    },
    quotation: {
      prefix: 'QTN/',
      suffix: '',
      financialYear: '26-27/',
      startingNumber: 1,
      nextNumber: 1,
      numberPadding: 4,
    },
    purchaseOrder: {
      prefix: 'PO/',
      suffix: '',
      financialYear: '26-27/',
      startingNumber: 1,
      nextNumber: 1,
      numberPadding: 4,
    },
  },
  terms: {
    invoiceTerms: [
      'Goods once sold will not be taken back or exchanged.',
      'Interest @ 18% p.a. will be charged if the bill is not paid within the due date.',
      'Our responsibility ceases as soon as the goods leave our premises/godown.',
      'Subject to local jurisdiction only.',
    ],
    quotationTerms: [
      'Quotation prices are valid for 30 days from the date of issue.',
      'Payment terms: 50% advance along with confirmed PO, balance against delivery.',
      'Delivery timeline: 7 to 10 working days after order confirmation.',
      'GST and Freight extra as applicable.',
    ],
    paymentTerms: '30 Days Net',
    declaration:
      'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
  },
  automation: {
    autoAddNewCustomers: true,
    autoAddNewProducts: true,
    priceUpdateRule: 'ASK',
  },
  documentEdit: {
    allowUsersToEdit: true,
    requireEditReason: true,
    requireAdminApproval: false,
  },
  print: {
    paperSize: 'A4',
    showLogo: true,
    showBankDetails: true,
    showSignature: true,
    showStamp: true,
    showTerms: true,
    showDeclaration: true,
    showUpiQr: true,
  },
  appInfo: {
    applicationName: 'QuickBill PRP',
    versionNumber: '1.0.0',
    releaseDate: '01-Sep-2026',
    lastUpdatedDate: '01-Sep-2026',
    developerName: 'Paras Panchal',
    developerLinkedInUrl: 'https://in.linkedin.com/in/paras-panchal12',
  },
  googleSync: {
    enableSync: false,
    sheetUrl: '',
    sheetId: '',
    googleAppsScriptUrl: '',
    autoSync: false,
    syncStatus: 'IDLE',
    pendingRecords: 0,
    failedRecords: 0,
  },
};

// Database helper
class IndexedDBService {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORES.USERS)) {
          db.createObjectStore(STORES.USERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
          db.createObjectStore(STORES.CUSTOMERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
          db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.PRICE_HISTORY)) {
          db.createObjectStore(STORES.PRICE_HISTORY, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.AUDIT_LOGS)) {
          db.createObjectStore(STORES.AUDIT_LOGS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', event);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  private async getAllFromStore<T>(storeName: string): Promise<T[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async putInStore<T>(storeName: string, item: T): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromStore(storeName: string, key: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clearStore(storeName: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Ensure the 4 primary Admin users exist with their exact credentials and full access
  public async ensureRequiredUsersExist(): Promise<void> {
    const requiredUsers = [
      {
        id: 'USR-001',
        fullName: 'Paras Panchal',
        displayName: 'Paras',
        username: 'Paras',
        password: 'Pax@12071997',
      },
      {
        id: 'USR-002',
        fullName: 'Raj',
        displayName: 'Raj',
        username: 'Raj',
        password: 'raj@2026',
      },
      {
        id: 'USR-003',
        fullName: 'Jayesh',
        displayName: 'Jayesh',
        username: 'Jayesh',
        password: 'jayesh@2026',
      },
      {
        id: 'USR-004',
        fullName: 'Akila',
        displayName: 'Akila',
        username: 'Akila',
        password: 'akila@2026',
      },
    ];

    const existingUsers = await this.getAllFromStore<UserAccount>(STORES.USERS);

    for (const req of requiredUsers) {
      const existing = existingUsers.find(
        u => u.username.trim().toLowerCase() === req.username.toLowerCase()
      );
      const expectedHash = await hashPassword(req.password);

      if (!existing) {
        const newUser: UserAccount = {
          id: req.id,
          fullName: req.fullName,
          displayName: req.displayName,
          username: req.username,
          password: req.password,
          passwordHash: expectedHash,
          role: 'Admin',
          status: 'Active',
          active: true,
          permissions: DEFAULT_ADMIN_PERMISSIONS,
          createdDate: new Date().toISOString(),
        };
        await this.putInStore(STORES.USERS, newUser);
      } else {
        let needsUpdate = false;
        if (existing.passwordHash !== expectedHash) {
          existing.passwordHash = expectedHash;
          existing.password = req.password;
          needsUpdate = true;
        }
        if (existing.role !== 'Admin') {
          existing.role = 'Admin';
          needsUpdate = true;
        }
        if (existing.status !== 'Active' || existing.active !== true) {
          existing.status = 'Active';
          existing.active = true;
          needsUpdate = true;
        }
        if (!existing.permissions || !existing.permissions.userManagement || !existing.permissions.settings) {
          existing.permissions = DEFAULT_ADMIN_PERMISSIONS;
          needsUpdate = true;
        }
        if (needsUpdate) {
          await this.putInStore(STORES.USERS, existing);
        }
      }
    }
  }

  // Initialization & Seeding
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await this.openDB();

    const users = await this.getAllFromStore<UserAccount>(STORES.USERS);
    if (users.length === 0) {
      await this.seedInitialData();
    }
    // Always ensure the 4 required Admin users exist and have their exact credentials and permissions
    await this.ensureRequiredUsersExist();
    this.isInitialized = true;
  }

  private async seedInitialData(): Promise<void> {
    // Initial Admin Users: Paras, Raj, Jayesh, Akila
    const initialAdminUsers = [
      {
        id: 'USR-001',
        fullName: 'Paras Panchal',
        displayName: 'Paras',
        username: 'Paras',
        password: 'Pax@12071997',
      },
      {
        id: 'USR-002',
        fullName: 'Raj',
        displayName: 'Raj',
        username: 'Raj',
        password: 'raj@2026',
      },
      {
        id: 'USR-003',
        fullName: 'Jayesh',
        displayName: 'Jayesh',
        username: 'Jayesh',
        password: 'jayesh@2026',
      },
      {
        id: 'USR-004',
        fullName: 'Akila',
        displayName: 'Akila',
        username: 'Akila',
        password: 'akila@2026',
      },
    ];

    for (const u of initialAdminUsers) {
      const pHash = await hashPassword(u.password);
      const userAcc: UserAccount = {
        id: u.id,
        fullName: u.fullName,
        displayName: u.displayName,
        username: u.username,
        password: u.password,
        passwordHash: pHash,
        role: 'Admin',
        status: 'Active',
        active: true,
        permissions: DEFAULT_ADMIN_PERMISSIONS,
        createdDate: new Date().toISOString(),
      };
      await this.putInStore(STORES.USERS, userAcc);
    }

    // Initialize clean default settings
    await this.putInStore(STORES.SETTINGS, { id: 'settings', ...DEFAULT_SETTINGS });

    // Initial clean installation audit log
    const cleanLog = {
      id: 'LOG-001',
      timestamp: new Date().toISOString(),
      userId: 'USR-001',
      userName: 'Paras',
      action: 'SYSTEM_INITIALIZED',
      recordType: 'SETTINGS',
      details: 'QuickBill PRP initialized as a clean production installation.',
    };
    await this.putInStore(STORES.AUDIT_LOGS, cleanLog);
  }

  /**
   * Factory Reset: Clears all customer, product, document, price history and transactional records.
   * Strictly preserves all 4 required User accounts (USR-001 to USR-004) and re-initializes clean settings.
   */
  public async resetAllBusinessData(): Promise<void> {
    await this.openDB();
    await this.clearStore(STORES.CUSTOMERS);
    await this.clearStore(STORES.PRODUCTS);
    await this.clearStore(STORES.DOCUMENTS);
    await this.clearStore(STORES.PRICE_HISTORY);
    await this.clearStore(STORES.AUDIT_LOGS);

    // Reset settings to clean default
    await this.putInStore(STORES.SETTINGS, { id: 'settings', ...DEFAULT_SETTINGS });

    // Re-verify the 4 required users exist and are untouched
    await this.ensureRequiredUsersExist();

    // Log the reset event
    const resetLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: 'USR-001',
      userName: 'Paras',
      action: 'FACTORY_RESET_COMPLETED',
      recordType: 'SYSTEM',
      details: 'Factory Reset executed: All customer, product, and document business data cleared. User accounts preserved.',
    };
    await this.putInStore(STORES.AUDIT_LOGS, resetLog);
  }

  // --- Users Operations ---
  public async getUsers(): Promise<UserAccount[]> {
    await this.initialize();
    return this.getAllFromStore<UserAccount>(STORES.USERS);
  }

  public async getUserById(id: string): Promise<UserAccount | undefined> {
    const users = await this.getUsers();
    return users.find(u => u.id === id);
  }

  public async getUserByUsername(username: string): Promise<UserAccount | undefined> {
    const users = await this.getUsers();
    return users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  }

  public async saveUser(user: UserAccount): Promise<void> {
    await this.putInStore(STORES.USERS, user);
  }

  public async deleteUser(id: string): Promise<void> {
    await this.deleteFromStore(STORES.USERS, id);
  }

  // --- Customers Operations ---
  public async getCustomers(): Promise<Customer[]> {
    await this.initialize();
    return this.getAllFromStore<Customer>(STORES.CUSTOMERS);
  }

  public async saveCustomer(customer: Customer): Promise<void> {
    await this.putInStore(STORES.CUSTOMERS, customer);
  }

  public async deleteCustomer(id: string): Promise<void> {
    await this.deleteFromStore(STORES.CUSTOMERS, id);
  }

  // --- Products Operations ---
  public async getProducts(): Promise<Product[]> {
    await this.initialize();
    return this.getAllFromStore<Product>(STORES.PRODUCTS);
  }

  public async saveProduct(product: Product): Promise<void> {
    await this.putInStore(STORES.PRODUCTS, product);
  }

  public async deleteProduct(id: string): Promise<void> {
    await this.deleteFromStore(STORES.PRODUCTS, id);
  }

  // --- Price History Operations ---
  public async getPriceHistories(): Promise<CustomerProductPriceHistory[]> {
    await this.initialize();
    return this.getAllFromStore<CustomerProductPriceHistory>(STORES.PRICE_HISTORY);
  }

  public async getPriceHistoryForCustomerProduct(customerId: string, productId: string): Promise<CustomerProductPriceHistory | undefined> {
    const histories = await this.getPriceHistories();
    return histories.find(h => h.customerId === customerId && h.productId === productId);
  }

  public async updatePriceHistory(
    customerId: string,
    customerName: string,
    productId: string,
    productName: string,
    price: number,
    quantity: number,
    docNumber: string,
    docDate: string
  ): Promise<void> {
    const existing = await this.getPriceHistoryForCustomerProduct(customerId, productId);
    if (existing) {
      const updated: CustomerProductPriceHistory = {
        ...existing,
        customerName,
        productName,
        previousPrice: existing.lastPrice !== price ? existing.lastPrice : existing.previousPrice,
        lastPrice: price,
        lastDocNumber: docNumber,
        lastDocDate: docDate,
        history: [
          { docNumber, docDate, price, quantity },
          ...existing.history.slice(0, 9), // keep last 10 entries
        ],
      };
      await this.putInStore(STORES.PRICE_HISTORY, updated);
    } else {
      const newHistory: CustomerProductPriceHistory = {
        id: `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        customerId,
        customerName,
        productId,
        productName,
        lastPrice: price,
        lastDocNumber: docNumber,
        lastDocDate: docDate,
        history: [{ docNumber, docDate, price, quantity }],
      };
      await this.putInStore(STORES.PRICE_HISTORY, newHistory);
    }
  }

  // --- Documents Operations ---
  public async getDocuments(): Promise<BusinessDocument[]> {
    await this.initialize();
    return this.getAllFromStore<BusinessDocument>(STORES.DOCUMENTS);
  }

  public async getDocumentById(id: string): Promise<BusinessDocument | undefined> {
    const docs = await this.getDocuments();
    return docs.find(d => d.id === id);
  }

  public async getDocumentByNumber(docNumber: string): Promise<BusinessDocument | undefined> {
    const docs = await this.getDocuments();
    return docs.find(d => d.docNumber.toLowerCase() === docNumber.trim().toLowerCase());
  }

  public async saveDocument(doc: BusinessDocument): Promise<void> {
    await this.putInStore(STORES.DOCUMENTS, doc);
  }

  public async deleteDocument(id: string): Promise<void> {
    await this.deleteFromStore(STORES.DOCUMENTS, id);
  }

  // --- Next Document Number Generator ---
  public async generateNextDocumentNumber(docType: 'INVOICE' | 'QUOTATION' | 'PO'): Promise<string> {
    const settings = await this.getSettings();
    const config =
      docType === 'INVOICE'
        ? settings.numbering.invoice
        : docType === 'QUOTATION'
        ? settings.numbering.quotation
        : settings.numbering.purchaseOrder;

    const numStr = String(config.nextNumber).padStart(config.numberPadding, '0');
    const docNumber = `${config.prefix}${config.financialYear}${numStr}${config.suffix}`;

    // Increment and save settings
    if (docType === 'INVOICE') {
      settings.numbering.invoice.nextNumber += 1;
    } else if (docType === 'QUOTATION') {
      settings.numbering.quotation.nextNumber += 1;
    } else {
      settings.numbering.purchaseOrder.nextNumber += 1;
    }
    await this.saveSettings(settings);

    return docNumber;
  }

  // --- MIS Records Conversion ---
  public async getMISRecords(): Promise<MISRecord[]> {
    const docs = await this.getDocuments();
    return docs.map(doc => {
      // Format item details cleanly in one cell: "1. [Item] (Qty: X, Rate: ₹Y) | 2. ..."
      const productDetailsDisplay = (doc.items || [])
        .map((item, idx) => `${idx + 1}. ${item.productName || 'Item'} [Qty: ${item.quantity || 0}, Rate: ₹${Number(item.rate || 0).toLocaleString('en-IN')}]`)
        .join('\n');

      return {
        id: doc.id,
        documentType: doc.docType,
        documentNumber: doc.docNumber,
        documentDate: doc.docDate,
        documentTime: doc.docTime,
        customerName: doc.customerName,
        productDetailsDisplay: productDetailsDisplay || 'No Items',
        taxableValue: doc.taxableValue,
        cgst: doc.cgst,
        sgst: doc.sgst,
        igst: doc.igst,
        totalTax: doc.totalTax,
        freight: doc.freightCharges,
        otherCharges: doc.otherCharges,
        discount: doc.discountAmount,
        roundingOff: doc.roundingOff,
        grandTotal: doc.grandTotal,
        status: doc.status,
        generatedBy: doc.generatedByName,
        createdAt: doc.generatedAt,
        lastEditedBy: doc.lastEditedByName,
        lastEditedAt: doc.lastEditedAt,
        syncStatus: doc.syncStatus,
      };
    });
  }

  // --- Settings Operations ---
  public async getSettings(): Promise<AppSettings> {
    await this.initialize();
    const list = await this.getAllFromStore<any>(STORES.SETTINGS);
    if (list.length > 0) {
      const { id, ...settings } = list[0];
      const merged: AppSettings = { ...DEFAULT_SETTINGS, ...settings };
      // Sanitize any residual demo business data if present
      if (merged.business?.businessName === 'PRAMUKRAJ ENTERPRISES') {
        merged.business = { ...DEFAULT_SETTINGS.business };
        merged.bank = { ...DEFAULT_SETTINGS.bank };
        merged.numbering = { ...DEFAULT_SETTINGS.numbering };
        await this.saveSettings(merged);
      }
      return merged;
    }
    return DEFAULT_SETTINGS;
  }

  public async saveSettings(settings: AppSettings): Promise<void> {
    await this.putInStore(STORES.SETTINGS, { id: 'primary', ...settings });
  }

  // --- Audit Logs ---
  public async getAuditLogs(): Promise<AuditLog[]> {
    await this.initialize();
    const logs = await this.getAllFromStore<AuditLog>(STORES.AUDIT_LOGS);
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public async logAudit(
    userId: string,
    userName: string,
    action: string,
    recordType: 'DOCUMENT' | 'CUSTOMER' | 'PRODUCT' | 'USER' | 'SETTINGS' | 'BACKUP' | 'SYNC',
    details: string,
    docNumber?: string,
    recordId?: string
  ): Promise<void> {
    const log: AuditLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      action,
      recordType,
      recordId,
      docNumber,
      details,
    };
    await this.putInStore(STORES.AUDIT_LOGS, log);
  }

  // --- Backup & Restore ---
  public async createBackup(): Promise<BackupData> {
    const users = await this.getUsers();
    // Strip password hashes for safety
    const sanitizedUsers = users.map(({ passwordHash, ...safeUser }) => safeUser);
    const customers = await this.getCustomers();
    const products = await this.getProducts();
    const documents = await this.getDocuments();
    const priceHistories = await this.getPriceHistories();
    const auditLogs = await this.getAuditLogs();
    const settings = await this.getSettings();

    const now = new Date();
    const backup: BackupData = {
      applicationName: settings.appInfo.applicationName,
      backupVersion: '1.0',
      backupDateTime: now.toISOString(),
      applicationVersion: settings.appInfo.versionNumber,
      counts: {
        users: sanitizedUsers.length,
        customers: customers.length,
        products: products.length,
        documents: documents.length,
        priceHistories: priceHistories.length,
        auditLogs: auditLogs.length,
      },
      users: sanitizedUsers as any,
      customers,
      products,
      documents,
      priceHistories,
      auditLogs,
      settings,
    };

    return backup;
  }

  public async restoreBackup(backup: BackupData, mode: 'REPLACE' | 'MERGE'): Promise<{ success: boolean; message: string; counts: Record<string, number> }> {
    if (!backup || !backup.counts || !backup.settings) {
      throw new Error('Invalid backup file structure.');
    }

    if (mode === 'REPLACE') {
      // Clear existing stores
      await this.clearStore(STORES.CUSTOMERS);
      await this.clearStore(STORES.PRODUCTS);
      await this.clearStore(STORES.DOCUMENTS);
      await this.clearStore(STORES.PRICE_HISTORY);
      await this.clearStore(STORES.AUDIT_LOGS);

      // Preserve existing users with their passwords, only update info if present
      const currentUsers = await this.getUsers();
      const currentPasswordMap = new Map(currentUsers.map(u => [u.id, u.passwordHash]));

      for (const u of backup.users) {
        const existingHash = currentPasswordMap.get(u.id) || (await hashPassword('User@123'));
        await this.putInStore(STORES.USERS, { ...u, passwordHash: existingHash });
      }

      for (const c of backup.customers || []) await this.putInStore(STORES.CUSTOMERS, c);
      for (const p of backup.products || []) await this.putInStore(STORES.PRODUCTS, p);
      for (const d of backup.documents || []) await this.putInStore(STORES.DOCUMENTS, d);
      for (const ph of backup.priceHistories || []) await this.putInStore(STORES.PRICE_HISTORY, ph);
      for (const al of backup.auditLogs || []) await this.putInStore(STORES.AUDIT_LOGS, al);
      if (backup.settings) await this.saveSettings(backup.settings);
    } else {
      // Merge mode
      for (const c of backup.customers || []) await this.putInStore(STORES.CUSTOMERS, c);
      for (const p of backup.products || []) await this.putInStore(STORES.PRODUCTS, p);
      for (const d of backup.documents || []) await this.putInStore(STORES.DOCUMENTS, d);
      for (const ph of backup.priceHistories || []) await this.putInStore(STORES.PRICE_HISTORY, ph);
      for (const al of backup.auditLogs || []) await this.putInStore(STORES.AUDIT_LOGS, al);
    }

    return {
      success: true,
      message: `Data restored successfully (${mode} mode).`,
      counts: backup.counts,
    };
  }

  public async updateDocumentStatus(id: string, status: BusinessDocument['status']): Promise<void> {
    const doc = await this.getDocumentById(id);
    if (doc) {
      doc.status = status;
      await this.saveDocument(doc);
    }
  }

  public async cancelDocument(
    id: string,
    cancellationReason: string,
    userId: string,
    userName: string
  ): Promise<void> {
    const doc = await this.getDocumentById(id);
    if (!doc) throw new Error('Document not found');

    doc.status = 'CANCELLED';
    doc.cancellationReason = cancellationReason;
    doc.lastEditedBy = userId;
    doc.lastEditedByName = userName;
    doc.lastEditedAt = new Date().toISOString();
    doc.changeHistory = [
      ...(doc.changeHistory || []),
      {
        timestamp: new Date().toISOString(),
        editedBy: userId,
        editedByName: userName,
        reason: cancellationReason,
        summary: `Document cancelled: ${cancellationReason}`,
      },
    ];

    await this.saveDocument(doc);
    await this.logAudit(
      userId,
      userName,
      'DOCUMENT_CANCELLED',
      'DOCUMENT',
      `Document ${doc.docNumber} cancelled. Reason: ${cancellationReason}`,
      doc.docNumber,
      doc.id
    );
  }

  public async exportFullBackupJSON(): Promise<string> {
    const backup = await this.createBackup();
    await this.recordBackupCompleted();
    return JSON.stringify(backup, null, 2);
  }

  public async importFullBackupJSON(jsonStr: string): Promise<boolean> {
    try {
      const backup: BackupData = JSON.parse(jsonStr);
      await this.restoreBackup(backup, 'MERGE');
      await this.recordBackupCompleted();
      return true;
    } catch (e) {
      console.error('Failed to import backup:', e);
      return false;
    }
  }

  // --- Backup Status Tracker ---
  public async getBackupStatus(): Promise<BackupStatus> {
    try {
      const raw = localStorage.getItem('quickbill_backup_status');
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          lastBackupDate: parsed.lastBackupDate || null,
          lastBackupTime: parsed.lastBackupTime || null,
          documentsSinceLastBackup: typeof parsed.documentsSinceLastBackup === 'number' ? parsed.documentsSinceLastBackup : 0,
        };
      }
    } catch {
      // ignore
    }
    return {
      lastBackupDate: null,
      lastBackupTime: null,
      documentsSinceLastBackup: 0,
    };
  }

  public async recordBackupCompleted(): Promise<void> {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    const status: BackupStatus = {
      lastBackupDate: dateStr,
      lastBackupTime: timeStr,
      documentsSinceLastBackup: 0,
    };

    localStorage.setItem('quickbill_backup_status', JSON.stringify(status));
  }

  public async incrementDocumentsSinceBackup(): Promise<void> {
    const current = await this.getBackupStatus();
    const updated: BackupStatus = {
      ...current,
      documentsSinceLastBackup: (current.documentsSinceLastBackup || 0) + 1,
    };
    localStorage.setItem('quickbill_backup_status', JSON.stringify(updated));
  }

  // --- Multi-Device Document Export & Portability ---
  public async exportDocumentsData(options?: {
    fromDate?: string;
    toDate?: string;
    docType?: DocumentType | 'ALL';
    documentIds?: string[];
  }): Promise<DocumentExportData> {
    const allDocs = await this.getDocuments();
    const allCustomers = await this.getCustomers();
    const allProducts = await this.getProducts();
    const allPrices = await this.getPriceHistories();
    const settings = await this.getSettings();

    // Filter documents
    let filteredDocs = allDocs;

    if (options?.documentIds && options.documentIds.length > 0) {
      const idSet = new Set(options.documentIds);
      filteredDocs = filteredDocs.filter(d => idSet.has(d.id));
    } else {
      if (options?.docType && options.docType !== 'ALL') {
        filteredDocs = filteredDocs.filter(d => d.docType === options.docType);
      }
      if (options?.fromDate) {
        filteredDocs = filteredDocs.filter(d => d.docDate >= options.fromDate!);
      }
      if (options?.toDate) {
        filteredDocs = filteredDocs.filter(d => d.docDate <= options.toDate!);
      }
    }

    // Collect relevant customers & products
    const referencedCustomerIds = new Set<string>();
    const referencedProductIds = new Set<string>();

    filteredDocs.forEach(d => {
      if (d.customerId) referencedCustomerIds.add(d.customerId);
      d.items.forEach(it => {
        if (it.productId) referencedProductIds.add(it.productId);
      });
    });

    const relevantCustomers = allCustomers.filter(c => referencedCustomerIds.has(c.id));
    const relevantProducts = allProducts.filter(p => referencedProductIds.has(p.id));
    const relevantPrices = allPrices.filter(
      ph => referencedCustomerIds.has(ph.customerId) || referencedProductIds.has(ph.productId)
    );

    const now = new Date();
    return {
      exportType: 'QUICKBILL_DOCUMENT_EXPORT',
      exportVersion: '1.0',
      exportDateTime: now.toISOString(),
      applicationName: settings.appInfo.applicationName || 'QuickBill PRP',
      applicationVersion: settings.appInfo.versionNumber || '1.0.0',
      dateRange: options?.fromDate && options?.toDate ? { from: options.fromDate, to: options.toDate } : undefined,
      filterDocType: options?.docType,
      counts: {
        documents: filteredDocs.length,
        customers: relevantCustomers.length,
        products: relevantProducts.length,
        priceHistories: relevantPrices.length,
      },
      documents: filteredDocs,
      customers: relevantCustomers,
      products: relevantProducts,
      priceHistories: relevantPrices,
    };
  }

  // --- Validate and Preview Document Import ---
  public async validateAndPreviewImport(jsonStr: string): Promise<ImportPreviewResult> {
    try {
      const parsed = JSON.parse(jsonStr);

      // Support either DocumentExportData or Full BackupData
      let incomingDocs: BusinessDocument[] = [];
      let incomingCustomers: Customer[] = [];
      let incomingProducts: Product[] = [];
      let incomingPrices: CustomerProductPriceHistory[] = [];
      let exportDateTime: string | undefined = undefined;

      if (parsed.exportType === 'QUICKBILL_DOCUMENT_EXPORT') {
        incomingDocs = parsed.documents || [];
        incomingCustomers = parsed.customers || [];
        incomingProducts = parsed.products || [];
        incomingPrices = parsed.priceHistories || [];
        exportDateTime = parsed.exportDateTime;
      } else if (parsed.backupVersion && parsed.documents) {
        // Full backup file format
        incomingDocs = parsed.documents || [];
        incomingCustomers = parsed.customers || [];
        incomingProducts = parsed.products || [];
        incomingPrices = parsed.priceHistories || [];
        exportDateTime = parsed.backupDateTime;
      } else {
        return {
          isValid: false,
          errorMessage: 'Unrecognized file format. Expected a QuickBill PRP Export or Backup JSON file.',
          totalDocumentsFound: 0,
          newDocumentsCount: 0,
          potentialDuplicatesCount: 0,
          conflictsCount: 0,
          newCustomersCount: 0,
          newProductsCount: 0,
          details: [],
          customersToAdd: [],
          productsToAdd: [],
          documentsToImport: [],
          priceHistoriesToImport: [],
        };
      }

      const [existingDocs, existingCustomers, existingProducts] = await Promise.all([
        this.getDocuments(),
        this.getCustomers(),
        this.getProducts(),
      ]);

      const existingDocIdMap = new Map(existingDocs.map(d => [d.id, d]));
      const existingDocNumMap = new Map(existingDocs.map(d => [d.docNumber.toLowerCase(), d]));
      const existingCustomerNameMap = new Map(existingCustomers.map(c => [c.customerName.toLowerCase().trim(), c]));
      const existingProductNameMap = new Map(existingProducts.map(p => [p.productName.toLowerCase().trim(), p]));

      const conflictDetails: ImportConflictItem[] = [];
      let newDocsCount = 0;
      let duplicatesCount = 0;
      let conflictsCount = 0;

      for (const doc of incomingDocs) {
        const matchById = existingDocIdMap.get(doc.id);
        const matchByNum = existingDocNumMap.get(doc.docNumber.toLowerCase());

        if (matchById) {
          // Exact ID match
          duplicatesCount++;
          conflictDetails.push({
            type: 'EXACT_MATCH',
            docNumber: doc.docNumber,
            existingDocId: matchById.id,
            importDocId: doc.id,
            existingTotal: matchById.grandTotal,
            importTotal: doc.grandTotal,
            existingCustomer: matchById.customerName,
            importCustomer: doc.customerName,
            existingDate: matchById.docDate,
            importDate: doc.docDate,
            isConflict: false,
          });
        } else if (matchByNum) {
          // Number matches but ID is different: check if values are identical or differing
          const isIdentical =
            Math.abs(matchByNum.grandTotal - doc.grandTotal) < 0.01 &&
            matchByNum.customerName.toLowerCase().trim() === doc.customerName.toLowerCase().trim() &&
            matchByNum.docDate === doc.docDate;

          if (isIdentical) {
            duplicatesCount++;
            conflictDetails.push({
              type: 'EXACT_MATCH',
              docNumber: doc.docNumber,
              existingDocId: matchByNum.id,
              importDocId: doc.id,
              existingTotal: matchByNum.grandTotal,
              importTotal: doc.grandTotal,
              existingCustomer: matchByNum.customerName,
              importCustomer: doc.customerName,
              existingDate: matchByNum.docDate,
              importDate: doc.docDate,
              isConflict: false,
            });
          } else {
            conflictsCount++;
            conflictDetails.push({
              type: 'DOC_NUMBER_CONFLICT',
              docNumber: doc.docNumber,
              existingDocId: matchByNum.id,
              importDocId: doc.id,
              existingTotal: matchByNum.grandTotal,
              importTotal: doc.grandTotal,
              existingCustomer: matchByNum.customerName,
              importCustomer: doc.customerName,
              existingDate: matchByNum.docDate,
              importDate: doc.docDate,
              isConflict: true,
            });
          }
        } else {
          newDocsCount++;
          conflictDetails.push({
            type: 'NEW',
            docNumber: doc.docNumber,
            importDocId: doc.id,
            importTotal: doc.grandTotal,
            importCustomer: doc.customerName,
            importDate: doc.docDate,
            isConflict: false,
          });
        }
      }

      // Determine customers to add
      const customersToAdd = incomingCustomers.filter(
        c => !existingCustomerNameMap.has(c.customerName.toLowerCase().trim())
      );

      // Determine products to add
      const productsToAdd = incomingProducts.filter(
        p => !existingProductNameMap.has(p.productName.toLowerCase().trim())
      );

      return {
        isValid: true,
        exportDateTime,
        totalDocumentsFound: incomingDocs.length,
        newDocumentsCount: newDocsCount,
        potentialDuplicatesCount: duplicatesCount,
        conflictsCount: conflictsCount,
        newCustomersCount: customersToAdd.length,
        newProductsCount: productsToAdd.length,
        details: conflictDetails,
        customersToAdd,
        productsToAdd,
        documentsToImport: incomingDocs,
        priceHistoriesToImport: incomingPrices,
      };
    } catch (e: any) {
      return {
        isValid: false,
        errorMessage: `Failed to parse import file: ${e.message || 'Invalid JSON syntax'}`,
        totalDocumentsFound: 0,
        newDocumentsCount: 0,
        potentialDuplicatesCount: 0,
        conflictsCount: 0,
        newCustomersCount: 0,
        newProductsCount: 0,
        details: [],
        customersToAdd: [],
        productsToAdd: [],
        documentsToImport: [],
        priceHistoriesToImport: [],
      };
    }
  }

  // --- Execute Document Import ---
  public async executeImportDocuments(
    preview: ImportPreviewResult,
    duplicateStrategy: 'SKIP' | 'OVERWRITE' | 'CREATE_NEW',
    userId: string,
    userName: string
  ): Promise<{ importedDocs: number; newCustomers: number; newProducts: number }> {
    if (!preview.isValid || preview.documentsToImport.length === 0) {
      return { importedDocs: 0, newCustomers: 0, newProducts: 0 };
    }

    // 1. Add new Customers
    for (const cust of preview.customersToAdd) {
      await this.saveCustomer(cust);
    }

    // 2. Add new Products
    for (const prod of preview.productsToAdd) {
      await this.saveProduct(prod);
    }

    // 3. Process documents
    const detailMap = new Map(preview.details.map(d => [d.importDocId, d]));
    let importedDocsCount = 0;

    for (const doc of preview.documentsToImport) {
      const detail = detailMap.get(doc.id);
      const isDuplicate = detail?.type === 'EXACT_MATCH';
      const isConflict = detail?.type === 'DOC_NUMBER_CONFLICT';

      if (isDuplicate || isConflict) {
        if (duplicateStrategy === 'SKIP') {
          continue; // Skip
        } else if (duplicateStrategy === 'OVERWRITE') {
          // If conflict or exact match, save/replace
          await this.saveDocument(doc);
          importedDocsCount++;
        } else if (duplicateStrategy === 'CREATE_NEW') {
          // Generate new document number and ID
          const newDocNo = await this.generateNextDocumentNumber(doc.docType === 'INVOICE' ? 'INVOICE' : 'QUOTATION');
          const newDoc: BusinessDocument = {
            ...doc,
            id: `DOC-IMP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            docNumber: newDocNo,
            changeHistory: [
              ...(doc.changeHistory || []),
              {
                timestamp: new Date().toISOString(),
                editedBy: userId,
                editedByName: userName,
                reason: `Imported with re-assigned document number (original was ${doc.docNumber})`,
                summary: `Document imported from external device file. Number updated to ${newDocNo}`,
              },
            ],
          };
          await this.saveDocument(newDoc);
          importedDocsCount++;
        }
      } else {
        // Brand new document
        await this.saveDocument(doc);
        importedDocsCount++;
      }
    }

    // 4. Import Price Histories
    for (const ph of preview.priceHistoriesToImport) {
      const existing = await this.getPriceHistoryForCustomerProduct(ph.customerId, ph.productId);
      if (!existing) {
        await this.putInStore(STORES.PRICE_HISTORY, ph);
      }
    }

    // 5. Log audit
    await this.logAudit(
      userId,
      userName,
      'DOCUMENTS_IMPORTED',
      'DOCUMENT',
      `Imported ${importedDocsCount} documents (${preview.customersToAdd.length} new customers, ${preview.productsToAdd.length} new products). Strategy: ${duplicateStrategy}`
    );

    return {
      importedDocs: importedDocsCount,
      newCustomers: preview.customersToAdd.length,
      newProducts: preview.productsToAdd.length,
    };
  }

  // --- Duplicate Detection Helper ---
  public async checkLikelyDuplicateDocument(
    customerId: string,
    customerName: string,
    docDate: string,
    grandTotal: number,
    itemCount: number
  ): Promise<BusinessDocument | null> {
    const docs = await this.getDocuments();
    const duplicate = docs.find(
      d =>
        d.status !== 'CANCELLED' &&
        d.docDate === docDate &&
        Math.abs(d.grandTotal - grandTotal) < 0.01 &&
        (d.customerId === customerId || d.customerName.toLowerCase() === customerName.trim().toLowerCase()) &&
        d.items.length === itemCount
    );
    return duplicate || null;
  }
}

export const dbService = new IndexedDBService();
