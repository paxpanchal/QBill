import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { Dashboard } from './components/dashboard/Dashboard';
import { CreateDocument } from './components/document/CreateDocument';
import { DocumentPreview } from './components/document/DocumentPreview';
import { DocumentHistoryModal } from './components/document/DocumentHistoryModal';
import { CancelDocumentModal } from './components/document/CancelDocumentModal';
import { UnifiedMIS } from './components/mis/UnifiedMIS';
import { CustomerMaster } from './components/masters/CustomerMaster';
import { ProductMaster } from './components/masters/ProductMaster';
import { SettingsPage } from './components/settings/SettingsPage';
import { HomePage } from './components/home/HomePage';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { BackupReminderModal } from './components/backup/BackupReminderModal';
import { DocumentExportModal } from './components/backup/DocumentExportModal';
import { DocumentImportModal } from './components/backup/DocumentImportModal';
import { RecoveryKitModal } from './components/backup/RecoveryKitModal';
import { EwayBillExportModal } from './components/document/EwayBillExportModal';
import { BusinessDocument, DocumentType } from './types';
import { dbService } from './services/storage';

export type AppView =
  | 'HOME'
  | 'DASHBOARD'
  | 'CREATE_INVOICE'
  | 'CREATE_QUOTATION'
  | 'DOCUMENT_PREVIEW'
  | 'UNIFIED_MIS'
  | 'CUSTOMERS'
  | 'PRODUCTS'
  | 'SETTINGS';

export default function App() {
  const { isAuthenticated, currentUser } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('HOME');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Active Document State for Preview / Edit
  const [activeDocument, setActiveDocument] = useState<BusinessDocument | null>(null);
  const [editingDocument, setEditingDocument] = useState<BusinessDocument | null>(null);

  // MIS Pre-filters
  const [misInitialFilterType, setMisInitialFilterType] = useState<DocumentType | 'ALL'>('ALL');
  const [misInitialCustomer, setMisInitialCustomer] = useState<string>('');
  const [misInitialProduct, setMisInitialProduct] = useState<string>('');

  // Global Modals
  const [historyModalDoc, setHistoryModalDoc] = useState<BusinessDocument | null>(null);
  const [cancelModalDoc, setCancelModalDoc] = useState<BusinessDocument | null>(null);
  const [backupReminderDoc, setBackupReminderDoc] = useState<BusinessDocument | null>(null);
  const [globalEwayBillDoc, setGlobalEwayBillDoc] = useState<BusinessDocument | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRecoveryKitModalOpen, setIsRecoveryKitModalOpen] = useState(false);

  // If not authenticated, render Login screen
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Navigation handlers
  const handleNavigate = (view: AppView, params?: any) => {
    setEditingDocument(null);
    setCurrentView(view);
    setIsMobileSidebarOpen(false);
  };

  const handleCreateDocument = (type: DocumentType) => {
    setEditingDocument(null);
    if (type === 'INVOICE') {
      setCurrentView('CREATE_INVOICE');
    } else {
      setCurrentView('CREATE_QUOTATION');
    }
  };

  const handleEditDocument = (doc: BusinessDocument) => {
    setEditingDocument(doc);
    if (doc.docType === 'INVOICE') {
      setCurrentView('CREATE_INVOICE');
    } else {
      setCurrentView('CREATE_QUOTATION');
    }
  };

  const handleViewDocument = (doc: BusinessDocument) => {
    setActiveDocument(doc);
    setCurrentView('DOCUMENT_PREVIEW');
  };

  const handleDocumentGenerated = async (doc: BusinessDocument) => {
    setEditingDocument(null);
    setActiveDocument(doc);
    setCurrentView('DOCUMENT_PREVIEW');
    
    // Increment unbacked documents count and show reminder modal
    await dbService.incrementDocumentsSinceBackup();
    setBackupReminderDoc(doc);
  };

  const handleConvertQuotation = async (quotationDoc: BusinessDocument) => {
    try {
      const nextInvoiceNo = await dbService.generateNextDocumentNumber('INVOICE');
      const convertedInvoice: BusinessDocument = {
        ...quotationDoc,
        id: `INV-CONV-${Date.now()}`,
        docType: 'INVOICE',
        docNumber: nextInvoiceNo,
        docDate: new Date().toISOString().slice(0, 10),
        status: 'DRAFT',
        generatedBy: currentUser?.id || 'USR-001',
        generatedByName: currentUser?.displayName || 'User',
        generatedAt: new Date().toISOString(),
        changeHistory: [
          ...(quotationDoc.changeHistory || []),
          {
            timestamp: new Date().toISOString(),
            editedBy: currentUser?.id || 'USR-001',
            editedByName: currentUser?.displayName || 'User',
            reason: `Converted from Quotation ${quotationDoc.docNumber}`,
            summary: `Converted from Quotation ${quotationDoc.docNumber} to Invoice ${nextInvoiceNo}`,
          },
        ],
      };

      // Mark original quote as converted
      await dbService.updateDocumentStatus(quotationDoc.id, 'CONVERTED');

      setEditingDocument(convertedInvoice);
      setCurrentView('CREATE_INVOICE');
    } catch (err: any) {
      alert(`Error converting quotation: ${err.message}`);
    }
  };

  const handleConfirmCancelDocument = async (reason: string) => {
    if (!cancelModalDoc) return;
    await dbService.cancelDocument(
      cancelModalDoc.id,
      reason,
      currentUser?.id || 'USR-001',
      currentUser?.displayName || 'User'
    );
    if (activeDocument && activeDocument.id === cancelModalDoc.id) {
      const updated = await dbService.getDocumentById(cancelModalDoc.id);
      if (updated) setActiveDocument(updated);
    }
    setCancelModalDoc(null);
  };

  const handleFilterMIS = (filterType: DocumentType | 'ALL', customer?: string, product?: string) => {
    setMisInitialFilterType(filterType);
    setMisInitialCustomer(customer || '');
    setMisInitialProduct(product || '');
    setCurrentView('UNIFIED_MIS');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Desktop fixed / Mobile sliding drawer) */}
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onOpenExport={() => setIsExportModalOpen(true)}
          onOpenImport={() => setIsImportModalOpen(true)}
          onOpenRecoveryKit={() => setIsRecoveryKitModalOpen(true)}
        />

        {/* Dynamic Center Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {currentView === 'HOME' && (
            <HomePage
              onCreateInvoice={() => handleCreateDocument('INVOICE')}
              onCreateQuotation={() => handleCreateDocument('QUOTATION')}
              onOpenMenu={() => setIsMobileSidebarOpen(true)}
              onNavigate={handleNavigate}
              onOpenExport={() => setIsExportModalOpen(true)}
              onOpenImport={() => setIsImportModalOpen(true)}
              onOpenRecoveryKit={() => setIsRecoveryKitModalOpen(true)}
            />
          )}

          {currentView === 'DASHBOARD' && (
            <Dashboard
              onCreateInvoice={() => handleCreateDocument('INVOICE')}
              onCreateQuotation={() => handleCreateDocument('QUOTATION')}
              onViewMIS={handleFilterMIS}
              onViewDocument={handleViewDocument}
              onNavigateMaster={(master: 'CUSTOMERS' | 'PRODUCTS') => handleNavigate(master)}
            />
          )}

          {(currentView === 'CREATE_INVOICE' || currentView === 'CREATE_QUOTATION') && (
            <CreateDocument
              initialType={currentView === 'CREATE_INVOICE' ? 'INVOICE' : 'QUOTATION'}
              editingDocument={editingDocument}
              onDocumentGenerated={handleDocumentGenerated}
              onCancel={() => handleNavigate('HOME')}
            />
          )}

          {currentView === 'DOCUMENT_PREVIEW' && activeDocument && (
            <DocumentPreview
              document={activeDocument}
              onBack={() => handleNavigate('UNIFIED_MIS')}
              onEdit={handleEditDocument}
              onCancelDoc={(doc) => setCancelModalDoc(doc)}
              onConvertQuotation={handleConvertQuotation}
              onViewHistory={(doc) => setHistoryModalDoc(doc)}
            />
          )}

          {currentView === 'UNIFIED_MIS' && (
            <UnifiedMIS
              initialFilterType={misInitialFilterType}
              initialCustomer={misInitialCustomer}
              initialProduct={misInitialProduct}
              onViewDocument={handleViewDocument}
              onEditDocument={handleEditDocument}
              onCancelDocument={(doc) => setCancelModalDoc(doc)}
              onConvertQuotation={handleConvertQuotation}
              onViewHistory={(doc) => setHistoryModalDoc(doc)}
            />
          )}

          {currentView === 'CUSTOMERS' && <CustomerMaster />}

          {currentView === 'PRODUCTS' && <ProductMaster />}

          {currentView === 'SETTINGS' && <SettingsPage />}
        </main>
      </div>

      {/* Developer Footer */}
      <Footer />

      {/* Offline Status Floating Indicator */}
      <OfflineIndicator />

      {/* Mandatory Backup Reminder Modal after document generation */}
      {backupReminderDoc && (
        <BackupReminderModal
          isOpen={!!backupReminderDoc}
          docNumber={backupReminderDoc.docNumber}
          docType={backupReminderDoc.docType}
          document={backupReminderDoc}
          onClose={() => setBackupReminderDoc(null)}
          onPrepareEwayBill={(doc) => {
            setBackupReminderDoc(null);
            setGlobalEwayBillDoc(doc);
          }}
          onBackupSuccess={() => {
            // Backup succeeded
          }}
        />
      )}

      {/* Multi-Device Document Export Modal */}
      <DocumentExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Multi-Device Document Import Modal */}
      {currentUser && (
        <DocumentImportModal
          isOpen={isImportModalOpen}
          currentUser={currentUser}
          onClose={() => setIsImportModalOpen(false)}
          onImportComplete={() => {
            // Refresh view
            if (currentView === 'UNIFIED_MIS' || currentView === 'DASHBOARD') {
              setCurrentView('HOME');
              setTimeout(() => setCurrentView('UNIFIED_MIS'), 50);
            }
          }}
        />
      )}

      {/* QuickBill PRP Recovery Guide & Documentation */}
      <RecoveryKitModal
        isOpen={isRecoveryKitModalOpen}
        onClose={() => setIsRecoveryKitModalOpen(false)}
      />

      {/* Global Modals */}
      {historyModalDoc && (
        <DocumentHistoryModal
          document={historyModalDoc}
          onClose={() => setHistoryModalDoc(null)}
        />
      )}

      {cancelModalDoc && (
        <CancelDocumentModal
          document={cancelModalDoc}
          onConfirm={handleConfirmCancelDocument}
          onClose={() => setCancelModalDoc(null)}
        />
      )}

      {/* Global E-Way Bill Export Modal */}
      {globalEwayBillDoc && (
        <EwayBillExportModal
          document={globalEwayBillDoc}
          isOpen={!!globalEwayBillDoc}
          onClose={() => setGlobalEwayBillDoc(null)}
        />
      )}
    </div>
  );
}
