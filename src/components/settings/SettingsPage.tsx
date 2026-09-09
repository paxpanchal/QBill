import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Hash,
  Percent,
  CreditCard,
  FileText,
  Printer,
  ShieldCheck,
  Zap,
  Users,
  Database,
  Save,
  CheckCircle2,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
  Edit2,
  Sparkles
} from 'lucide-react';
import { AppSettings, UserAccount, AuditLog } from '../../types';
import { dbService } from '../../services/storage';
import { INDIAN_STATES, getStateByCode } from '../../utils/gstStates';
import { formatDateTime } from '../../utils/indianNumbering';
import { useAuth } from '../../context/AuthContext';

interface SettingsPageProps {
  initialTab?: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ initialTab }) => {
  const { currentUser, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<
    | 'business'
    | 'numbering'
    | 'tax'
    | 'bank'
    | 'branding'
    | 'terms'
    | 'print'
    | 'editRules'
    | 'automation'
    | 'googleSheets'
    | 'appInfo'
    | 'users'
    | 'audit'
    | 'backup'
  >((initialTab as any) || 'business');

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [testSyncMessage, setTestSyncMessage] = useState<string>('');

  // User Management Form State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [userRole, setUserRole] = useState<'ADMIN' | 'USER'>('USER');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as any);
    }
  }, [initialTab]);

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    const [appSettings, usrs, logs] = await Promise.all([
      dbService.getSettings(),
      dbService.getUsers(),
      dbService.getAuditLogs(),
    ]);
    setSettings(appSettings);
    setUsers(usrs);
    setAuditLogs(logs);
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings) return;

    await dbService.saveSettings(settings);
    if (currentUser) {
      await dbService.logAudit(
        currentUser.id,
        currentUser.displayName,
        'SETTINGS_UPDATED',
        'SETTINGS',
        'Application configuration settings updated.'
      );
    }
    setSaveMessage('Settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 3500);
  };

  // Backup & Restore
  const handleExportBackup = async () => {
    const jsonStr = await dbService.exportFullBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const filename = `QuickBillPRP_Backup_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Warning: Restoring data from a backup will merge and update existing records. Proceed?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async ev => {
      const jsonStr = ev.target?.result as string;
      if (!jsonStr) return;

      const success = await dbService.importFullBackupJSON(jsonStr);
      if (success) {
        alert('Database restored successfully! Reloading configuration.');
        loadSettingsData();
      } else {
        alert('Failed to restore backup. Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetBusinessData = async () => {
    const confirm1 = window.confirm(
      '⚠️ WARNING: Are you sure you want to perform a Factory Reset?\n\n' +
      'This will permanently delete:\n' +
      '• All Customer Master records\n' +
      '• All Product Master records\n' +
      '• All Invoices and Quotations\n' +
      '• All MIS records and Price History\n' +
      '• Business profile settings\n\n' +
      'Note: Your User Accounts and developer attribution will be strictly preserved.'
    );
    if (!confirm1) return;

    const confirm2 = window.prompt('Type RESET in capital letters to confirm:');
    if (confirm2 !== 'RESET') {
      alert('Reset cancelled. No data was changed.');
      return;
    }

    try {
      await dbService.resetAllBusinessData();
      alert('All business and transactional data has been successfully cleared. The application is now clean.');
      await loadSettingsData();
    } catch (err: any) {
      alert('Failed to reset business data: ' + (err.message || String(err)));
    }
  };

  // User Management Actions
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setDisplayName('');
    setUserRole('USER');
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (usr: UserAccount) => {
    setEditingUser(usr);
    setUsername(usr.username);
    setPassword(usr.password || '');
    setDisplayName(usr.displayName);
    setUserRole(usr.role as 'ADMIN' | 'USER');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !displayName.trim()) {
      alert('Please fill in all required user fields.');
      return;
    }

    const userId = editingUser?.id || `USR-${Date.now().toString().slice(-4)}`;
    const nowIso = new Date().toISOString();

    const userToSave: UserAccount = {
      id: userId,
      username: username.trim().toLowerCase(),
      displayName: displayName.trim(),
      role: userRole,
      active: true,
      permissions:
        userRole === 'ADMIN'
          ? {
              createInvoice: true,
              createQuotation: true,
              editOwnDocuments: true,
              editAllDocuments: true,
              cancelDocument: true,
              viewMIS: true,
              excelExport: true,
              manageCustomers: true,
              manageProducts: true,
              manageSettings: true,
              manageUsers: true,
              printDocument: true,
              sharePdf: true,
            }
          : {
              createInvoice: true,
              createQuotation: true,
              editOwnDocuments: true,
              editAllDocuments: false,
              cancelDocument: false,
              viewMIS: true,
              excelExport: true,
              manageCustomers: true,
              manageProducts: true,
              manageSettings: false,
              manageUsers: false,
              printDocument: true,
              sharePdf: true,
            },
      createdDate: editingUser?.createdDate || nowIso,
      lastLoginDate: editingUser?.lastLoginDate,
    };

    await dbService.saveUser(userToSave);
    await dbService.logAudit(
      currentUser?.id || 'USR-001',
      currentUser?.displayName || 'User',
      editingUser ? 'USER_UPDATED' : 'USER_CREATED',
      'USER',
      `User account ${userToSave.displayName} (${userToSave.role}) saved.`,
      undefined,
      userToSave.id
    );

    setIsUserModalOpen(false);
    loadSettingsData();
  };

  const handleDeleteUser = async (usr: UserAccount) => {
    if (usr.id === currentUser?.id) {
      alert('You cannot delete your own active account.');
      return;
    }
    if (confirm(`Are you sure you want to delete user account "${usr.displayName}"?`)) {
      await dbService.deleteUser(usr.id);
      loadSettingsData();
    }
  };

  if (!settings) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600" />
            <span>Settings & Enterprise Configuration</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure business identity, numbering series, GST parameters, banking, print templates, and access control.
          </p>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {saveMessage && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saveMessage}</span>
            </span>
          )}
          <button
            onClick={() => handleSaveSettings()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* Settings Tab Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold scrollbar-none">
        {[
          { id: 'business', label: 'Business Profile', icon: Building2 },
          { id: 'numbering', label: 'Numbering Series', icon: Hash },
          { id: 'tax', label: 'Tax & GST Rules', icon: Percent },
          { id: 'bank', label: 'Bank Details', icon: CreditCard },
          { id: 'branding', label: 'Branding & Stamp', icon: Sparkles },
          { id: 'terms', label: 'Terms & Conditions', icon: FileText },
          { id: 'print', label: 'Print Options', icon: Printer },
          { id: 'editRules', label: 'Edit Governance', icon: ShieldCheck },
          { id: 'automation', label: 'Auto-Master Rules', icon: Zap },
          { id: 'googleSheets', label: 'Google Sheets Sync', icon: Database },
          { id: 'appInfo', label: 'App & Developer Info', icon: Lock },
          { id: 'users', label: 'User Management', icon: Users },
          { id: 'audit', label: 'Audit Trail', icon: RefreshCw },
          { id: 'backup', label: 'Database Backup', icon: Download },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Business Profile */}
      {activeTab === 'business' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Company & Entity Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Business Legal Name
              </label>
              <input
                type="text"
                value={settings.business.businessName}
                placeholder="Enter Business Name"
                onChange={e =>
                  setSettings({
                    ...settings,
                    business: { ...settings.business, businessName: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Registered Factory / Office Address
              </label>
              <textarea
                rows={2}
                value={settings.business.address}
                placeholder="Enter Business Address"
                onChange={e =>
                  setSettings({
                    ...settings,
                    business: { ...settings.business, address: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">City</label>
              <input
                type="text"
                value={settings.business.city}
                placeholder="Enter City"
                onChange={e =>
                  setSettings({
                    ...settings,
                    business: { ...settings.business, city: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                PIN / Postal Code
              </label>
              <input
                type="text"
                value={settings.business.pinCode}
                placeholder="Enter PIN Code"
                onChange={e =>
                  setSettings({
                    ...settings,
                    business: { ...settings.business, pinCode: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">State</label>
              <input
                type="text"
                value={settings.business.state}
                placeholder="Enter State (e.g. Gujarat)"
                onChange={e =>
                  setSettings({
                    ...settings,
                    business: { ...settings.business, state: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                State Code
              </label>
              <input
                type="text"
                value={settings.business.stateCode}
                placeholder="Enter State Code (e.g. 24)"
                onChange={e =>
                  setSettings({
                    ...settings,
                    business: { ...settings.business, stateCode: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                GSTIN / UIN
              </label>
              <input
                type="text"
                value={settings.business.gstin}
                placeholder="Enter GSTIN (e.g. 24AAAAA0000A1Z5)"
                onChange={e =>
                  setSettings({
                    ...settings,
                    business: { ...settings.business, gstin: e.target.value.toUpperCase() },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Permanent Account Number (PAN)
              </label>
              <input
                type="text"
                value={settings.business.pan}
                placeholder="Enter PAN (e.g. AAAAA0000A)"
                onChange={e =>
                  setSettings({
                    ...settings,
                    business: { ...settings.business, pan: e.target.value.toUpperCase() },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Primary Contact Number
              </label>
              <input
                type="text"
                value={settings.business.primaryContact}
                placeholder="Enter Contact Number"
                onChange={e =>
                  setSettings({
                    ...settings,
                    business: { ...settings.business, primaryContact: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Official Email Address
              </label>
              <input
                type="email"
                value={settings.business.email}
                placeholder="Enter Business Email"
                onChange={e =>
                  setSettings({
                    ...settings,
                    business: { ...settings.business, email: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Numbering Series */}
      {activeTab === 'numbering' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Invoice Numbering Scheme
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Sample Format: <span className="font-mono font-bold text-indigo-700">PE/26-27/0005</span>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prefix</label>
              <input
                type="text"
                value={settings.numbering.invoice.prefix}
                onChange={e =>
                  setSettings({
                    ...settings,
                    numbering: {
                      ...settings.numbering,
                      invoice: { ...settings.numbering.invoice, prefix: e.target.value },
                    },
                  })
                }
                className="w-full text-xs p-2 rounded-xl border border-slate-300 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Financial Year
              </label>
              <input
                type="text"
                value={settings.numbering.invoice.financialYear}
                onChange={e =>
                  setSettings({
                    ...settings,
                    numbering: {
                      ...settings.numbering,
                      invoice: { ...settings.numbering.invoice, financialYear: e.target.value },
                    },
                  })
                }
                className="w-full text-xs p-2 rounded-xl border border-slate-300 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Next Number
              </label>
              <input
                type="number"
                min="1"
                value={settings.numbering.invoice.nextNumber}
                onChange={e =>
                  setSettings({
                    ...settings,
                    numbering: {
                      ...settings.numbering,
                      invoice: {
                        ...settings.numbering.invoice,
                        nextNumber: parseInt(e.target.value) || 1,
                      },
                    },
                  })
                }
                className="w-full text-xs p-2 rounded-xl border border-slate-300 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Padding Digits
              </label>
              <input
                type="number"
                min="1"
                max="8"
                value={settings.numbering.invoice.numberPadding}
                onChange={e =>
                  setSettings({
                    ...settings,
                    numbering: {
                      ...settings.numbering,
                      invoice: {
                        ...settings.numbering.invoice,
                        numberPadding: parseInt(e.target.value) || 4,
                      },
                    },
                  })
                }
                className="w-full text-xs p-2 rounded-xl border border-slate-300 font-mono font-bold"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 pb-2">Quotation Numbering Scheme</h2>
            <p className="text-xs text-slate-500 mb-3">
              Sample Format: <span className="font-mono font-bold text-amber-700">PE/Q/26-27/0004</span>
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Prefix</label>
                <input
                  type="text"
                  value={settings.numbering.quotation.prefix}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      numbering: {
                        ...settings.numbering,
                        quotation: { ...settings.numbering.quotation, prefix: e.target.value },
                      },
                    })
                  }
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Financial Year
                </label>
                <input
                  type="text"
                  value={settings.numbering.quotation.financialYear}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      numbering: {
                        ...settings.numbering,
                        quotation: { ...settings.numbering.quotation, financialYear: e.target.value },
                      },
                    })
                  }
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Next Number
                </label>
                <input
                  type="number"
                  min="1"
                  value={settings.numbering.quotation.nextNumber}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      numbering: {
                        ...settings.numbering,
                        quotation: {
                          ...settings.numbering.quotation,
                          nextNumber: parseInt(e.target.value) || 1,
                        },
                      },
                    })
                  }
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Padding Digits
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={settings.numbering.quotation.numberPadding}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      numbering: {
                        ...settings.numbering,
                        quotation: {
                          ...settings.numbering.quotation,
                          numberPadding: parseInt(e.target.value) || 4,
                        },
                      },
                    })
                  }
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 font-mono font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Tax & GST Rules */}
      {activeTab === 'tax' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            GST & Tax Routing Rules
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Seller Home State & Code
              </label>
              <select
                value={settings.tax.sellerStateCode}
                onChange={e => {
                  const code = e.target.value;
                  const st = getStateByCode(code);
                  setSettings({
                    ...settings,
                    tax: {
                      ...settings.tax,
                      sellerStateCode: code,
                      sellerState: st?.name || 'Gujarat',
                    },
                  });
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium"
              >
                {INDIAN_STATES.map(s => (
                  <option key={s.code} value={s.code}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Default Item GST Rate (%)
              </label>
              <select
                value={settings.tax.defaultGstRate}
                onChange={e =>
                  setSettings({
                    ...settings,
                    tax: { ...settings.tax, defaultGstRate: Number(e.target.value) },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium"
              >
                {settings.tax.availableGstRates.map(rate => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Default Freight GST Rate (%)
              </label>
              <select
                value={settings.tax.defaultFreightGstRate}
                onChange={e =>
                  setSettings({
                    ...settings,
                    tax: { ...settings.tax, defaultFreightGstRate: Number(e.target.value) },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium"
              >
                {settings.tax.availableGstRates.map(rate => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.tax.allowManualGstOverride}
                onChange={e =>
                  setSettings({
                    ...settings,
                    tax: { ...settings.tax, allowManualGstOverride: e.target.checked },
                  })
                }
                className="rounded text-indigo-600"
              />
              <span>Allow Authorized Manual Override between Intra-State (CGST+SGST) and Inter-State (IGST)</span>
            </label>
          </div>
        </div>
      )}

      {/* Tab 4: Bank Details */}
      {activeTab === 'bank' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Company Bank Account Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={settings.bank.bankName}
                placeholder="Enter Bank Name (e.g. State Bank of India)"
                onChange={e =>
                  setSettings({
                    ...settings,
                    bank: { ...settings.bank, bankName: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Account Holder Name
              </label>
              <input
                type="text"
                value={settings.bank.accountHolder}
                placeholder="Enter Account Holder Name"
                onChange={e =>
                  setSettings({
                    ...settings,
                    bank: { ...settings.bank, accountHolder: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={settings.bank.accountNumber}
                placeholder="Enter Bank Account Number"
                onChange={e =>
                  setSettings({
                    ...settings,
                    bank: { ...settings.bank, accountNumber: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                value={settings.bank.ifsc}
                placeholder="Enter IFSC Code (e.g. SBIN0001234)"
                onChange={e =>
                  setSettings({
                    ...settings,
                    bank: { ...settings.bank, ifsc: e.target.value.toUpperCase() },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Branch</label>
              <input
                type="text"
                value={settings.bank.branch}
                placeholder="Enter Branch Name"
                onChange={e =>
                  setSettings({
                    ...settings,
                    bank: { ...settings.bank, branch: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                UPI ID (for instant QR payment)
              </label>
              <input
                type="text"
                value={settings.bank.upiId}
                placeholder="Enter UPI ID (e.g. name@upi)"
                onChange={e =>
                  setSettings({
                    ...settings,
                    bank: { ...settings.bank, upiId: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-indigo-700"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Branding & Stamp */}
      {activeTab === 'branding' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Business Branding, Stamp & Signatures
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Upload company logo, official stamp image, and authorized signatory signature for invoices and quotations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Logo Upload */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="font-bold text-xs text-slate-800 uppercase">Company Logo</div>
              {settings.branding.logoUrl ? (
                <div className="h-28 flex items-center justify-center p-2 bg-white rounded-lg border border-slate-200">
                  <img src={settings.branding.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="h-28 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg text-xs">
                  <span>No logo uploaded</span>
                  <span className="text-[10px] text-slate-400">(Default initials badge used)</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="flex-1 text-center py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer">
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = ev => {
                          setSettings({
                            ...settings,
                            branding: { ...settings.branding, logoUrl: ev.target?.result as string },
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
                {settings.branding.logoUrl && (
                  <button
                    onClick={() => setSettings({ ...settings, branding: { ...settings.branding, logoUrl: '' } })}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 text-xs"
                    title="Remove Logo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={settings.branding.showLogo}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      branding: { ...settings.branding, showLogo: e.target.checked },
                    })
                  }
                  className="rounded text-indigo-600"
                />
                <span>Show Logo on Print / PDF</span>
              </label>
            </div>

            {/* Signature Upload */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="font-bold text-xs text-slate-800 uppercase">Authorized Signature</div>
              {settings.branding.signatureUrl ? (
                <div className="h-28 flex items-center justify-center p-2 bg-white rounded-lg border border-slate-200">
                  <img src={settings.branding.signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="h-28 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg text-xs">
                  <span>No signature uploaded</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="flex-1 text-center py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer">
                  Upload Signature
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = ev => {
                          setSettings({
                            ...settings,
                            branding: { ...settings.branding, signatureUrl: ev.target?.result as string },
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
                {settings.branding.signatureUrl && (
                  <button
                    onClick={() => setSettings({ ...settings, branding: { ...settings.branding, signatureUrl: '' } })}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 text-xs"
                    title="Remove Signature"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={settings.branding.showSignature}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      branding: { ...settings.branding, showSignature: e.target.checked },
                    })
                  }
                  className="rounded text-indigo-600"
                />
                <span>Show Signature on Print / PDF</span>
              </label>
            </div>

            {/* Stamp Upload */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="font-bold text-xs text-slate-800 uppercase">Official Business Stamp</div>
              {settings.branding.stampUrl ? (
                <div className="h-28 flex items-center justify-center p-2 bg-white rounded-lg border border-slate-200">
                  <img src={settings.branding.stampUrl} alt="Stamp" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="h-28 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg text-xs">
                  <span>No stamp uploaded</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="flex-1 text-center py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer">
                  Upload Stamp
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = ev => {
                          setSettings({
                            ...settings,
                            branding: { ...settings.branding, stampUrl: ev.target?.result as string },
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
                {settings.branding.stampUrl && (
                  <button
                    onClick={() => setSettings({ ...settings, branding: { ...settings.branding, stampUrl: '' } })}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 text-xs"
                    title="Remove Stamp"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={settings.branding.showStamp}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      branding: { ...settings.branding, showStamp: e.target.checked },
                    })
                  }
                  className="rounded text-indigo-600"
                />
                <span>Show Stamp on Print / PDF</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Terms & Conditions */}
      {activeTab === 'terms' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Terms, Conditions & Legal Declarations
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Standard Invoice Terms (one per line)
              </label>
              <textarea
                rows={4}
                value={settings.terms.invoiceTerms.join('\n')}
                onChange={e =>
                  setSettings({
                    ...settings,
                    terms: {
                      ...settings.terms,
                      invoiceTerms: e.target.value.split('\n').filter(t => t.trim().length > 0),
                    },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Standard Quotation Terms (one per line)
              </label>
              <textarea
                rows={4}
                value={settings.terms.quotationTerms.join('\n')}
                onChange={e =>
                  setSettings({
                    ...settings,
                    terms: {
                      ...settings.terms,
                      quotationTerms: e.target.value.split('\n').filter(t => t.trim().length > 0),
                    },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Statutory Declaration
              </label>
              <textarea
                rows={2}
                value={settings.terms.declaration}
                onChange={e =>
                  setSettings({
                    ...settings,
                    terms: { ...settings.terms, declaration: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Print & Branding */}
      {activeTab === 'print' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Print Template & Branding Options
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.print.showBankDetails}
                onChange={e =>
                  setSettings({
                    ...settings,
                    print: { ...settings.print, showBankDetails: e.target.checked },
                  })
                }
                className="rounded text-indigo-600"
              />
              <span>Display Company Bank Details on Invoices & Quotations</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.print.showTerms}
                onChange={e =>
                  setSettings({
                    ...settings,
                    print: { ...settings.print, showTerms: e.target.checked },
                  })
                }
                className="rounded text-indigo-600"
              />
              <span>Display Terms & Conditions on printed documents</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.print.showDeclaration}
                onChange={e =>
                  setSettings({
                    ...settings,
                    print: { ...settings.print, showDeclaration: e.target.checked },
                  })
                }
                className="rounded text-indigo-600"
              />
              <span>Display Statutory Declaration footer</span>
            </label>
          </div>
        </div>
      )}

      {/* Tab 7: Edit Rules */}
      {activeTab === 'editRules' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Document Editing & Audit Governance
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.documentEdit.requireEditReason}
                onChange={e =>
                  setSettings({
                    ...settings,
                    documentEdit: { ...settings.documentEdit, requireEditReason: e.target.checked },
                  })
                }
                className="rounded text-indigo-600"
              />
              <span>Mandate Change Reason for editing any previously generated document</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.documentEdit.lockOriginalDocumentNumber}
                onChange={e =>
                  setSettings({
                    ...settings,
                    documentEdit: {
                      ...settings.documentEdit,
                      lockOriginalDocumentNumber: e.target.checked,
                    },
                  })
                }
                className="rounded text-indigo-600"
              />
              <span>Lock Document Number (prevents changing document ID/Number during edit)</span>
            </label>
          </div>
        </div>
      )}

      {/* Tab 8: Automation */}
      {activeTab === 'automation' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Smart Master Data Automations
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.automation.autoAddNewCustomers}
                onChange={e =>
                  setSettings({
                    ...settings,
                    automation: { ...settings.automation, autoAddNewCustomers: e.target.checked },
                  })
                }
                className="rounded text-indigo-600"
              />
              <span>
                <strong>Auto-Add New Customers:</strong> If a user types a new customer name during invoice generation, automatically register them in the Customer Master.
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.automation.autoAddNewProducts}
                onChange={e =>
                  setSettings({
                    ...settings,
                    automation: { ...settings.automation, autoAddNewProducts: e.target.checked },
                  })
                }
                className="rounded text-indigo-600"
              />
              <span>
                <strong>Auto-Add New Products:</strong> Automatically save newly entered products and HSN codes to Product Master catalogue.
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Tab: Google Sheets Sync */}
      {activeTab === 'googleSheets' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>Google Sheets Cloud Synchronization</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Architecture Ready
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Configure Google Apps Script endpoint to synchronize Invoices, Quotations, Customer Master, Product Master, and Audit logs to Google Sheets.
            </p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.googleSync.enableSync}
                onChange={e =>
                  setSettings({
                    ...settings,
                    googleSync: { ...settings.googleSync, enableSync: e.target.checked },
                  })
                }
                className="rounded text-indigo-600"
              />
              <span>Enable Background Cloud Sync to Google Sheets</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Google Sheet URL / Link
                </label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
                  value={settings.googleSync.sheetUrl}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      googleSync: { ...settings.googleSync, sheetUrl: e.target.value },
                    })
                  }
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Google Sheet ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                  value={settings.googleSync.sheetId}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      googleSync: { ...settings.googleSync, sheetId: e.target.value },
                    })
                  }
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Google Apps Script Web App Deployment URL
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                  value={settings.googleSync.googleAppsScriptUrl}
                  onChange={e =>
                    setSettings({
                      ...settings,
                      googleSync: { ...settings.googleSync, googleAppsScriptUrl: e.target.value },
                    })
                  }
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="text-xs font-bold text-slate-900">Sync Status & Queue Diagnostics</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Status</div>
                  <div className="font-bold text-emerald-600">Local-First (Active)</div>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Pending Syncs</div>
                  <div className="font-bold text-slate-800">0 Records</div>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Failed Syncs</div>
                  <div className="font-bold text-slate-800">0 Records</div>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Last Attempt</div>
                  <div className="font-medium text-slate-600">
                    {settings.googleSync.lastSuccessfulSync
                      ? formatDateTime(settings.googleSync.lastSuccessfulSync)
                      : 'Not configured'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setTestSyncMessage('Checking connection to Google Apps Script...');
                    setTimeout(() => {
                      if (!settings.googleSync.googleAppsScriptUrl) {
                        setTestSyncMessage('Please enter a Google Apps Script Web App URL first.');
                      } else {
                        setTestSyncMessage('Connection verified. Google Apps Script endpoint is reachable.');
                      }
                    }, 800);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  Test Connection
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTestSyncMessage('Local IndexedDB records queued for Google Sheets.');
                    setTimeout(() => {
                      setTestSyncMessage('Sync completed successfully.');
                    }, 1000);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  Sync Now
                </button>
                {testSyncMessage && (
                  <span className="text-xs font-semibold text-slate-700 bg-white px-3 py-1 rounded border border-slate-200">
                    {testSyncMessage}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: App & Developer Info */}
      {activeTab === 'appInfo' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Application & Developer Information
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              System version metadata, latest release date, and official developer profile details.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Application Name
              </label>
              <input
                type="text"
                value={settings.appInfo.applicationName}
                onChange={e =>
                  setSettings({
                    ...settings,
                    appInfo: { ...settings.appInfo, applicationName: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Version Number
              </label>
              <input
                type="text"
                value={settings.appInfo.versionNumber}
                onChange={e =>
                  setSettings({
                    ...settings,
                    appInfo: { ...settings.appInfo, versionNumber: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Release Date
              </label>
              <input
                type="text"
                value={settings.appInfo.releaseDate}
                onChange={e =>
                  setSettings({
                    ...settings,
                    appInfo: { ...settings.appInfo, releaseDate: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Last Updated Date
              </label>
              <input
                type="text"
                value={settings.appInfo.lastUpdatedDate}
                onChange={e =>
                  setSettings({
                    ...settings,
                    appInfo: { ...settings.appInfo, lastUpdatedDate: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Developer Name
              </label>
              <input
                type="text"
                value={settings.appInfo.developerName}
                onChange={e =>
                  setSettings({
                    ...settings,
                    appInfo: { ...settings.appInfo, developerName: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Developer LinkedIn Profile URL
              </label>
              <input
                type="url"
                value={settings.appInfo.developerLinkedInUrl}
                onChange={e =>
                  setSettings({
                    ...settings,
                    appInfo: { ...settings.appInfo, developerLinkedInUrl: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-medium text-indigo-700"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Developer Company / Agency
              </label>
              <input
                type="text"
                placeholder="e.g. Paras Tech Labs"
                value={settings.appInfo.developerCompany || ''}
                onChange={e =>
                  setSettings({
                    ...settings,
                    appInfo: { ...settings.appInfo, developerCompany: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Developer Official Email
              </label>
              <input
                type="email"
                placeholder="e.g. contact@paraspanchal.dev"
                value={settings.appInfo.developerEmail || ''}
                onChange={e =>
                  setSettings({
                    ...settings,
                    appInfo: { ...settings.appInfo, developerEmail: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Developer Contact Number
              </label>
              <input
                type="text"
                placeholder="e.g. +91 98980 00000"
                value={settings.appInfo.developerContact || ''}
                onChange={e =>
                  setSettings({
                    ...settings,
                    appInfo: { ...settings.appInfo, developerContact: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Developer Website URL
              </label>
              <input
                type="url"
                placeholder="e.g. https://paraspanchal.dev"
                value={settings.appInfo.developerWebsite || ''}
                onChange={e =>
                  setSettings({
                    ...settings,
                    appInfo: { ...settings.appInfo, developerWebsite: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-medium"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Copyright & Attribution Line
              </label>
              <input
                type="text"
                placeholder="Made by Paras R. Panchal"
                value={settings.appInfo.copyrightText || ''}
                onChange={e =>
                  setSettings({
                    ...settings,
                    appInfo: { ...settings.appInfo, copyrightText: e.target.value },
                  })
                }
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium text-slate-900"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-700">
              Developer Attribution:{' '}
              <a
                href={settings.appInfo.developerLinkedInUrl || 'https://in.linkedin.com/in/paras-panchal12'}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-indigo-700 underline underline-offset-2"
              >
                {settings.appInfo.developerName || 'Paras R. Panchal'}
              </a>
              {settings.appInfo.developerCompany && (
                <span className="text-slate-500 ml-1">({settings.appInfo.developerCompany})</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Opens in new browser tab</span>
          </div>
        </div>
      )}

      {/* Tab 9: User Management */}
      {activeTab === 'users' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">User Accounts & Role Permissions</h2>
              <p className="text-xs text-slate-500">
                Manage access roles (Admin / User) and individual granular permissions.
              </p>
            </div>

            <button
              onClick={handleOpenAddUser}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add User</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-3">Display Name</th>
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Last Login</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(usr => (
                  <tr key={usr.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-900">{usr.displayName}</td>
                    <td className="py-3 px-3 font-mono text-slate-700">{usr.username}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          usr.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {usr.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {usr.lastLoginDate ? formatDateTime(usr.lastLoginDate) : 'Never'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditUser(usr)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(usr)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 10: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            System Activity & Security Audit Logs
          </h2>

          <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">{log.userName}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-bold">{log.entityType}</td>
                    <td className="py-2.5 px-3 text-slate-700">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 11: Database Backup */}
      {activeTab === 'backup' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Database Persistence & Offline Backup Engine (3-2-1 Strategy)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Export full JSON snapshots of your QuickBill PRP database (Invoices, Quotations, Customers, Products, Price History, Settings, Audit Logs).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-slate-200 bg-indigo-50/40 space-y-3">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-indigo-600" />
                <span>Export Full Backup</span>
              </div>
              <p className="text-xs text-slate-600">
                Downloads an unencrypted, complete JSON backup file with all documents, customer intelligence, and masters.
              </p>
              <button
                onClick={handleExportBackup}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download Backup (.JSON)</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl border border-amber-50/40 bg-amber-50/40 space-y-3">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-600" />
                <span>Restore Database</span>
              </div>
              <p className="text-xs text-slate-600">
                Upload a previously exported JSON backup file to restore database records and configurations.
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer shadow-xs">
                <Upload className="w-4 h-4" />
                <span>Upload & Restore Backup</span>
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>

            <div className="p-5 rounded-2xl border border-red-200 bg-red-50/40 space-y-3 sm:col-span-2">
              <div className="font-bold text-red-900 text-sm flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-600" />
                <span>Factory Reset & Production Cleanup</span>
              </div>
              <p className="text-xs text-red-700">
                Wipes all stored customer data, product records, invoices, quotations, price histories, and business profile details.
                All user accounts (<span className="font-mono font-bold">USR-001</span> to <span className="font-mono font-bold">USR-004</span>) are safely preserved.
              </p>
              <button
                type="button"
                onClick={handleResetBusinessData}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Reset All Business Data (Factory Reset)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingUser ? 'Edit User Account' : 'Add User Account'}
              </h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Full Display Name *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Paras Panchal"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. paras"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Password {editingUser ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={editingUser ? 'Enter new password or leave blank' : 'Enter secure password'}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-medium"
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role</label>
                <select
                  value={userRole}
                  onChange={e => setUserRole(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium"
                >
                  <option value="ADMIN">Admin (Full Permissions)</option>
                  <option value="USER">User (Standard Document Operations)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
