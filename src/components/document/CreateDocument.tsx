import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Sparkles,
  History,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Building2,
  Percent,
  Calendar,
  Save,
  ArrowLeft,
  Search,
  HelpCircle,
  Clock,
  ChevronDown,
  FileText,
  MapPin,
  Truck,
  Printer,
  Eye,
  Download,
  CreditCard,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  BusinessDocument,
  DocumentItem,
  Customer,
  Product,
  CustomerProductPriceHistory,
  AppSettings,
  DocumentType,
  DocumentStatus
} from '../../types';
import { dbService } from '../../services/storage';
import { INDIAN_STATES, extractStateCodeFromGSTIN, getStateByCode } from '../../utils/gstStates';
import { numberToIndianWords, formatIndianCurrency } from '../../utils/indianNumbering';
import { extractPinCodeFromAddress } from '../../services/ewayBillService';
import { useAuth } from '../../context/AuthContext';
import { DocumentPreview } from './DocumentPreview';
import { CustomerMasterSelectorModal } from './CustomerMasterSelectorModal';

interface CreateDocumentProps {
  initialType?: DocumentType;
  editingDocument?: BusinessDocument | null;
  onDocumentGenerated: (doc: BusinessDocument) => void;
  onCancel: () => void;
}

export const CreateDocument: React.FC<CreateDocumentProps> = ({
  initialType = 'INVOICE',
  editingDocument = null,
  onDocumentGenerated,
  onCancel,
}) => {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [priceHistories, setPriceHistories] = useState<CustomerProductPriceHistory[]>([]);

  // Document Core State
  const [docType, setDocType] = useState<DocumentType>(editingDocument?.docType || initialType);
  const [docNumberPreview, setDocNumberPreview] = useState<string>('');
  const [docDate, setDocDate] = useState<string>(
    editingDocument?.docDate || new Date().toISOString().slice(0, 10)
  );
  const [docTime, setDocTime] = useState<string>(
    editingDocument?.docTime || new Date().toTimeString().slice(0, 8)
  );

  // Customer Fields
  const [customerId, setCustomerId] = useState<string>(editingDocument?.customerId || '');
  const [customerName, setCustomerName] = useState<string>(editingDocument?.customerName || '');
  const [customerAddress, setCustomerAddress] = useState<string>(editingDocument?.customerAddress || '');
  const [customerPinCode, setCustomerPinCode] = useState<string>(
    editingDocument?.customerPinCode || (editingDocument?.customerAddress ? extractPinCodeFromAddress(editingDocument.customerAddress) : '') || ''
  );
  const [customerGstin, setCustomerGstin] = useState<string>(editingDocument?.customerGstin || '');
  const [customerContact, setCustomerContact] = useState<string>(editingDocument?.customerContact || '');
  const [customerEmail, setCustomerEmail] = useState<string>(editingDocument?.customerEmail || '');
  const [customerState, setCustomerState] = useState<string>(editingDocument?.customerState || 'Gujarat');
  const [customerStateCode, setCustomerStateCode] = useState<string>(editingDocument?.customerStateCode || '24');
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(
    editingDocument?.placeOfSupply || 'Gujarat (24)'
  );

  // Customer search autocomplete
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Transport & Delivery Details
  const [buyerOrderNo, setBuyerOrderNo] = useState<string>(editingDocument?.buyerOrderNo || '');
  const [buyerOrderDate, setBuyerOrderDate] = useState<string>(editingDocument?.buyerOrderDate || '');
  const [dispatchDocNo, setDispatchDocNo] = useState<string>(editingDocument?.dispatchDocNo || '');
  const [dispatchedThrough, setDispatchedThrough] = useState<string>(editingDocument?.dispatchedThrough || '');
  const [destination, setDestination] = useState<string>(editingDocument?.destination || '');
  const [paymentTerms, setPaymentTerms] = useState<string>(
    editingDocument?.paymentTerms || '30 Days Net'
  );
  const [termsOfDelivery, setTermsOfDelivery] = useState<string>(
    editingDocument?.termsOfDelivery || 'Door Delivery'
  );

  // Items Table
  const [items, setItems] = useState<DocumentItem[]>(
    editingDocument?.items || [
      {
        id: `item-${Date.now()}-1`,
        srNo: 1,
        productId: '',
        productName: '',
        productDescription: '',
        hsnSac: '',
        gstRate: 18,
        quantity: 1,
        rate: 0,
        amount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTax: 0,
        totalWithTax: 0,
      },
    ]
  );

  // Charges, Discounts & Taxes
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>(
    editingDocument?.discountType || 'FIXED'
  );
  const [discountValue, setDiscountValue] = useState<number>(editingDocument?.discountValue || 0);
  const [freightCharges, setFreightCharges] = useState<number>(editingDocument?.freightCharges || 0);
  const [freightGstRate, setFreightGstRate] = useState<number>(editingDocument?.freightGstRate || 18);
  const [otherCharges, setOtherCharges] = useState<number>(editingDocument?.otherCharges || 0);
  const [manualGstOverride, setManualGstOverride] = useState<boolean>(false);
  const [forcedInterState, setForcedInterState] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>(editingDocument?.notes || '');
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  // Edit Mode Specifics
  const [changeReason, setChangeReason] = useState<string>('');

  // Modals & Warnings
  const [duplicateWarningDoc, setDuplicateWarningDoc] = useState<BusinessDocument | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState<boolean>(false);
  const [priceHistoryModal, setPriceHistoryModal] = useState<{
    isOpen: boolean;
    productName: string;
    customerName: string;
    history: CustomerProductPriceHistory | null;
  }>({ isOpen: false, productName: '', customerName: '', history: null });

  // Price Suggestion Banner
  const [suggestedPricesBanner, setSuggestedPricesBanner] = useState<{
    itemIndex: number;
    productName: string;
    suggestedRate: number;
    previousRate?: number;
    lastDocNo: string;
    lastDocDate: string;
  } | null>(null);

  // Load Settings, Masters & Setup
  useEffect(() => {
    const loadMasters = async () => {
      const [appSettings, custs, prods, phs] = await Promise.all([
        dbService.getSettings(),
        dbService.getCustomers(),
        dbService.getProducts(),
        dbService.getPriceHistories(),
      ]);

      setSettings(appSettings);
      setCustomers(custs);
      setProducts(prods);
      setPriceHistories(phs);

      if (!editingDocument) {
        // Generate document number preview
        const previewNumber = getNumberPreview(docType, appSettings);
        setDocNumberPreview(previewNumber);
        setFreightGstRate(appSettings.tax.defaultFreightGstRate);
        setPaymentTerms(appSettings.terms.paymentTerms);
      }
    };
    loadMasters();
  }, [docType]);

  const getNumberPreview = (type: DocumentType, appSettings: AppSettings) => {
    const config =
      type === 'INVOICE'
        ? appSettings.numbering.invoice
        : type === 'QUOTATION'
        ? appSettings.numbering.quotation
        : appSettings.numbering.purchaseOrder;
    const numStr = String(config.nextNumber).padStart(config.numberPadding, '0');
    return `${config.prefix}${config.financialYear}${numStr}${config.suffix}`;
  };

  // State Code & Inter-state Determination
  const isInterState = useMemo(() => {
    if (manualGstOverride) return forcedInterState;
    if (!settings) return false;
    const sellerStateCode = settings.tax.sellerStateCode || '24';
    return customerStateCode !== sellerStateCode;
  }, [customerStateCode, settings, manualGstOverride, forcedInterState]);

  // Recalculate Item Totals
  const calculatedItems = useMemo(() => {
    return items.map((item, index) => {
      const srNo = index + 1;
      const amount = (item.quantity || 0) * (item.rate || 0);
      const gstPercent = item.gstRate || 0;
      const totalTax = (amount * gstPercent) / 100;

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterState) {
        igst = totalTax;
      } else {
        cgst = totalTax / 2;
        sgst = totalTax / 2;
      }

      return {
        ...item,
        srNo,
        amount,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalTax,
        totalWithTax: amount + totalTax,
      };
    });
  }, [items, isInterState]);

  // Financial Summary Totals
  const calculations = useMemo(() => {
    const productTotal = calculatedItems.reduce((acc, curr) => acc + curr.amount, 0);

    let discountAmount = 0;
    if (discountType === 'PERCENT') {
      discountAmount = (productTotal * (discountValue || 0)) / 100;
    } else {
      discountAmount = discountValue || 0;
    }

    const taxableValue = Math.max(0, productTotal - discountAmount);

    // Freight GST
    const freightGstAmount = ((freightCharges || 0) * (freightGstRate || 0)) / 100;

    // Items Tax
    const itemsCgst = calculatedItems.reduce((acc, curr) => acc + curr.cgstAmount, 0);
    const itemsSgst = calculatedItems.reduce((acc, curr) => acc + curr.sgstAmount, 0);
    const itemsIgst = calculatedItems.reduce((acc, curr) => acc + curr.igstAmount, 0);

    // Apply proportional freight GST
    let totalCgst = itemsCgst;
    let totalSgst = itemsSgst;
    let totalIgst = itemsIgst;

    if (isInterState) {
      totalIgst += freightGstAmount;
    } else {
      totalCgst += freightGstAmount / 2;
      totalSgst += freightGstAmount / 2;
    }

    const totalTax = totalCgst + totalSgst + totalIgst;
    const rawGrandTotal = taxableValue + (freightCharges || 0) + (otherCharges || 0) + totalTax;
    const roundedGrandTotal = Math.round(rawGrandTotal);
    const roundingOff = Number((roundedGrandTotal - rawGrandTotal).toFixed(2));

    const words = numberToIndianWords(roundedGrandTotal);

    return {
      productTotal,
      discountAmount,
      taxableValue,
      freightGstAmount,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      roundingOff,
      grandTotal: roundedGrandTotal,
      amountInWords: words,
    };
  }, [
    calculatedItems,
    discountType,
    discountValue,
    freightCharges,
    freightGstRate,
    otherCharges,
    isInterState,
  ]);

  // Handle Customer Selection
  const handleSelectCustomer = (cust: Customer) => {
    setCustomerId(cust.id);
    setCustomerName(cust.customerName);
    setCustomerAddress(cust.address);
    setCustomerPinCode(cust.pinCode || extractPinCodeFromAddress(cust.address) || '');
    setCustomerGstin(cust.gstin);
    setCustomerContact(cust.contactNumber);
    setCustomerEmail(cust.email);
    setCustomerState(cust.state);
    setCustomerStateCode(cust.stateCode);
    setPlaceOfSupply(`${cust.state} (${cust.stateCode})`);
    setShowCustomerDropdown(false);
    setCustomerSearchQuery('');
  };

  // Handle Customer GSTIN typing (Auto-detect state)
  const handleGstinChange = (val: string) => {
    setCustomerGstin(val);
    const code = extractStateCodeFromGSTIN(val);
    if (code) {
      setCustomerStateCode(code);
      const st = getStateByCode(code);
      if (st) {
        setCustomerState(st.name);
        setPlaceOfSupply(`${st.name} (${st.code})`);
      }
    }
  };

  // Handle Product Selection for a row
  const handleSelectProduct = (index: number, prod: Product) => {
    const updated = [...items];
    let selectedRate = prod.defaultBasePrice;

    // Check if we have customer price history for this customer + product
    if (customerId) {
      const ph = priceHistories.find(
        p => p.customerId === customerId && (p.productId === prod.id || p.productName.toLowerCase() === prod.productName.toLowerCase())
      );

      if (ph && ph.lastPrice) {
        selectedRate = ph.lastPrice;
        // Show price suggestion prompt
        setSuggestedPricesBanner({
          itemIndex: index,
          productName: prod.productName,
          suggestedRate: ph.lastPrice,
          previousRate: ph.previousPrice,
          lastDocNo: ph.lastDocNumber,
          lastDocDate: ph.lastDocDate,
        });
      }
    }

    updated[index] = {
      ...updated[index],
      productId: prod.id,
      productName: prod.productName,
      productDescription: prod.productDescription,
      hsnSac: prod.hsnSac,
      unit: prod.unit || updated[index].unit || 'NOS',
      gstRate: prod.defaultGstRate || 18,
      rate: selectedRate,
    };
    setItems(updated);
  };

  // Row Manipulation
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}-${items.length + 1}`,
        srNo: items.length + 1,
        productId: '',
        productName: '',
        productDescription: '',
        hsnSac: '',
        gstRate: settings?.tax.defaultGstRate || 18,
        quantity: 1,
        rate: 0,
        amount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        totalTax: 0,
        totalWithTax: 0,
      },
    ]);
  };

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) {
      alert('A document must have at least one product row.');
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleDuplicateItem = (index: number) => {
    const target = items[index];
    const duplicated: DocumentItem = {
      ...target,
      id: `item-${Date.now()}-${items.length + 1}`,
      srNo: items.length + 1,
    };
    const updated = [...items];
    updated.splice(index + 1, 0, duplicated);
    setItems(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...items];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setItems(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const updated = [...items];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setItems(updated);
  };

  const handleItemChange = (index: number, field: keyof DocumentItem, value: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setItems(updated);
  };

  // Pre-generation Validation & Duplicate Check
  const handleProceedGeneration = async (isDraftMode = false) => {
    if (!customerName.trim()) {
      alert('Please enter or select a Customer Name.');
      return;
    }

    // Mandatory Customer PIN Code Validation
    const cleanPin = customerPinCode.trim().replace(/\D/g, '');
    if (!cleanPin) {
      alert('Customer PIN Code is required.');
      return;
    }
    if (cleanPin.length !== 6 || !/^[1-9][0-9]{5}$/.test(cleanPin)) {
      alert('Customer PIN Code must be a valid 6-digit Indian PIN code (e.g. 380001).');
      return;
    }

    if (items.some(it => !it.productName.trim() || it.quantity <= 0)) {
      alert('Please ensure all items have a valid Product Name and Quantity > 0.');
      return;
    }

    if (editingDocument && settings?.documentEdit.requireEditReason && !changeReason.trim()) {
      alert('Change Reason is required when updating an existing document.');
      return;
    }

    // Check Duplicate if this is a fresh generation
    if (!editingDocument && !isDraftMode) {
      const duplicate = await dbService.checkLikelyDuplicateDocument(
        customerId,
        customerName,
        docDate,
        calculations.grandTotal,
        items.length
      );

      if (duplicate) {
        setDuplicateWarningDoc(duplicate);
        setShowDuplicateModal(true);
        return;
      }
    }

    executeFinalSave(isDraftMode);
  };

  // Final Execution Flow
  const executeFinalSave = async (isDraftMode = false) => {
    try {
      let finalDocNumber = editingDocument?.docNumber;
      let finalDocId = editingDocument?.id || `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const nowIso = new Date().toISOString();
      const cleanPin = customerPinCode.trim().replace(/\D/g, '');

      if (!editingDocument) {
        if (isDraftMode) {
          finalDocNumber = `DRAFT-${Date.now().toString().slice(-4)}`;
        } else {
          finalDocNumber = await dbService.generateNextDocumentNumber(docType);
        }
      }

      // Check auto-add or update customer setting in Customer Master
      if (customerName.trim()) {
        const existingCust = customers.find(
          c => (customerId && c.id === customerId) || c.customerName.toLowerCase() === customerName.trim().toLowerCase()
        );
        if (!existingCust && settings?.automation.autoAddNewCustomers) {
          const newCust: Customer = {
            id: `CUST-${Date.now()}`,
            customerName: customerName.trim(),
            address: customerAddress,
            city: '',
            pinCode: cleanPin,
            gstin: customerGstin,
            contactNumber: customerContact,
            email: customerEmail,
            state: customerState,
            stateCode: customerStateCode,
            active: true,
            createdDate: nowIso,
            lastUpdatedDate: nowIso,
          };
          await dbService.saveCustomer(newCust);
          await dbService.logAudit(
            currentUser?.id || 'USR-001',
            currentUser?.displayName || 'User',
            'CUSTOMER_AUTO_CREATED',
            'CUSTOMER',
            `Customer ${newCust.customerName} auto-created during ${docType} creation.`,
            finalDocNumber,
            newCust.id
          );
        } else if (existingCust) {
          // Keep Customer Master record updated with latest PIN code
          if (cleanPin && existingCust.pinCode !== cleanPin) {
            existingCust.pinCode = cleanPin;
            existingCust.lastUpdatedDate = nowIso;
            await dbService.saveCustomer(existingCust);
          }
        }
      }

      // Check auto-add product setting
      if (settings?.automation.autoAddNewProducts) {
        for (const it of calculatedItems) {
          if (it.productName.trim() && !it.productId) {
            const existingProd = products.find(
              p => p.productName.toLowerCase() === it.productName.trim().toLowerCase()
            );
            if (!existingProd) {
              const newProd: Product = {
                id: `PROD-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                productName: it.productName.trim(),
                productDescription: it.productDescription || '',
                hsnSac: it.hsnSac || '',
                defaultGstRate: it.gstRate || 18,
                defaultBasePrice: it.rate || 0,
                active: true,
                createdDate: nowIso,
                lastUpdatedDate: nowIso,
              };
              await dbService.saveProduct(newProd);
            }
          }
        }
      }

      // Update customer price history for each product
      if (!isDraftMode) {
        for (const it of calculatedItems) {
          if (customerId || customerName) {
            await dbService.updatePriceHistory(
              customerId || `CUST-AUTO-${customerName.replace(/\s+/g, '')}`,
              customerName,
              it.productId || it.productName,
              it.productName,
              it.rate,
              it.quantity,
              finalDocNumber!,
              docDate
            );
          }
        }
      }

      // Build Document Change History
      const existingHistory = editingDocument?.changeHistory || [];
      let updatedHistory = [...existingHistory];

      if (editingDocument) {
        updatedHistory.push({
          timestamp: nowIso,
          editedBy: currentUser?.id || 'USR-001',
          editedByName: currentUser?.displayName || 'User',
          reason: changeReason.trim() || 'Document updated',
          summary: `Updated totals: ₹${Number(calculations.grandTotal || 0).toLocaleString('en-IN')}`,
          oldValues: {
            grandTotal: editingDocument.grandTotal,
            taxableValue: editingDocument.taxableValue,
            itemCount: editingDocument.items.length,
          },
          newValues: {
            grandTotal: calculations.grandTotal,
            taxableValue: calculations.taxableValue,
            itemCount: calculatedItems.length,
          },
        });
      }

      const documentToSave: BusinessDocument = {
        id: finalDocId,
        docType,
        docNumber: finalDocNumber!,
        docDate,
        docTime,
        financialYear: settings?.numbering.invoice.financialYear || '26-27/',
        customerId,
        customerName: customerName.trim(),
        customerAddress,
        customerPinCode: cleanPin,
        customerGstin,
        customerContact,
        customerEmail,
        customerState,
        customerStateCode,
        placeOfSupply,
        buyerOrderNo,
        buyerOrderDate,
        dispatchDocNo,
        dispatchedThrough,
        destination,
        paymentTerms,
        termsOfDelivery,
        items: calculatedItems,
        productTotal: calculations.productTotal,
        discountType,
        discountValue,
        discountAmount: calculations.discountAmount,
        taxableValue: calculations.taxableValue,
        freightCharges,
        freightGstRate,
        freightGstAmount: calculations.freightGstAmount,
        otherCharges,
        isInterState,
        cgst: calculations.totalCgst,
        sgst: calculations.totalSgst,
        igst: calculations.totalIgst,
        totalTax: calculations.totalTax,
        roundingOff: calculations.roundingOff,
        grandTotal: calculations.grandTotal,
        amountInWords: calculations.amountInWords,
        status: isDraftMode ? 'DRAFT' : 'GENERATED',
        isDraft: isDraftMode,
        generatedBy: editingDocument?.generatedBy || currentUser?.id || 'USR-001',
        generatedByName: editingDocument?.generatedByName || currentUser?.displayName || 'User',
        generatedAt: editingDocument?.generatedAt || nowIso,
        lastEditedBy: editingDocument ? currentUser?.id : undefined,
        lastEditedByName: editingDocument ? currentUser?.displayName : undefined,
        lastEditedAt: editingDocument ? nowIso : undefined,
        changeHistory: updatedHistory,
        syncStatus: 'SYNCED',
        copyType: 'ORIGINAL',
        notes,
      };

      await dbService.saveDocument(documentToSave);

      // Audit Log
      await dbService.logAudit(
        currentUser?.id || 'USR-001',
        currentUser?.displayName || 'User',
        editingDocument ? 'DOCUMENT_EDITED' : isDraftMode ? 'DRAFT_SAVED' : 'DOCUMENT_GENERATED',
        'DOCUMENT',
        `${docType} ${finalDocNumber} ${editingDocument ? 'edited' : 'generated'} for ${customerName} (Total: ₹${Number(calculations.grandTotal || 0).toLocaleString('en-IN')}).`,
        finalDocNumber,
        finalDocId
      );

      // Trigger celebratory confetti if newly generated
      if (!isDraftMode && !editingDocument) {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      onDocumentGenerated(documentToSave);
    } catch (err: any) {
      console.error('Error generating document:', err);
      alert(`Failed to save document: ${err.message}`);
    }
  };

  // Filtered Customer Autocomplete Options
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 8);
    const query = customerSearchQuery.toLowerCase();
    return customers.filter(
      c =>
        c.customerName.toLowerCase().includes(query) ||
        c.gstin.toLowerCase().includes(query) ||
        c.contactNumber.includes(query)
    );
  }, [customers, customerSearchQuery]);

  // Draft document representation for live preview modal
  const previewDraftDoc = useMemo<BusinessDocument>(() => {
    const finalDocNumber = editingDocument?.docNumber || docNumberPreview || `${docType === 'INVOICE' ? 'INV' : 'QT'}-PREVIEW`;
    const finalDocId = editingDocument?.id || `preview-${Date.now()}`;
    const nowIso = new Date().toISOString();

    return {
      id: finalDocId,
      docType,
      docNumber: finalDocNumber,
      docDate,
      docTime,
      customerName: customerName || 'Customer / Business Name',
      customerAddress,
      customerGstin,
      customerContact,
      customerEmail,
      customerState,
      customerStateCode,
      placeOfSupply,
      buyerOrderNo,
      buyerOrderDate,
      dispatchDocNo,
      dispatchedThrough,
      paymentTerms,
      termsOfDelivery,
      items: calculatedItems,
      productTotal: calculations.productTotal,
      discountType,
      discountValue,
      discountAmount: calculations.discountAmount,
      taxableValue: calculations.taxableValue,
      freightCharges,
      freightGstRate,
      freightGstAmount: calculations.freightGstAmount,
      otherCharges,
      isInterState,
      cgst: calculations.totalCgst,
      sgst: calculations.totalSgst,
      igst: calculations.totalIgst,
      totalTax: calculations.totalTax,
      roundingOff: calculations.roundingOff,
      grandTotal: calculations.grandTotal,
      amountInWords: calculations.amountInWords,
      status: 'DRAFT',
      isDraft: true,
      generatedBy: editingDocument?.generatedBy || currentUser?.id || 'USR-001',
      generatedByName: editingDocument?.generatedByName || currentUser?.displayName || 'User',
      generatedAt: editingDocument?.generatedAt || nowIso,
      syncStatus: 'SYNCED',
      copyType: 'ORIGINAL',
      notes,
    };
  }, [
    editingDocument,
    docNumberPreview,
    docType,
    docDate,
    docTime,
    customerName,
    customerAddress,
    customerGstin,
    customerContact,
    customerEmail,
    customerState,
    customerStateCode,
    placeOfSupply,
    buyerOrderNo,
    buyerOrderDate,
    dispatchDocNo,
    dispatchedThrough,
    paymentTerms,
    termsOfDelivery,
    calculatedItems,
    calculations,
    discountType,
    discountValue,
    freightCharges,
    freightGstRate,
    otherCharges,
    isInterState,
    currentUser,
    notes,
  ]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{editingDocument ? 'Edit Document' : 'Create New Document'}</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  docType === 'INVOICE'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {docType}
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              {editingDocument
                ? `Editing ${editingDocument.docNumber}`
                : `Document Series: ${docNumberPreview || 'Loading...'}`}
            </p>
          </div>
        </div>

        {/* Fixed Document Type Indicator (No accidental switching) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div
            className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase flex items-center gap-2 border ${
              docType === 'INVOICE'
                ? 'bg-slate-900 text-white border-slate-950 shadow-xs'
                : 'bg-indigo-950 text-white border-indigo-900 shadow-xs'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{docType === 'INVOICE' ? 'TAX INVOICE' : 'QUOTATION'}</span>
          </div>
        </div>
      </div>

      {/* Suggested Price Notification Alert */}
      {suggestedPricesBanner && (
        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950 animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Customer Last Used Price Detected</div>
              <p className="text-indigo-800 mt-0.5">
                For <strong>{suggestedPricesBanner.productName}</strong>, this customer was previously billed{' '}
                <strong>₹{Number(suggestedPricesBanner.suggestedRate || 0).toLocaleString('en-IN')}</strong> in Doc{' '}
                <span className="font-mono">{suggestedPricesBanner.lastDocNo}</span> on{' '}
                {suggestedPricesBanner.lastDocDate}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                // View history modal
                const ph = priceHistories.find(
                  p => p.customerId === customerId && p.productName === suggestedPricesBanner.productName
                );
                setPriceHistoryModal({
                  isOpen: true,
                  productName: suggestedPricesBanner.productName,
                  customerName,
                  history: ph || null,
                });
              }}
              className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100/50 font-semibold"
            >
              View History
            </button>
            <button
              type="button"
              onClick={() => setSuggestedPricesBanner(null)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-semibold"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Edit Reason Box (If editing existing doc) */}
      {editingDocument && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Change Reason (Mandatory Audit Requirement)</span>
          </div>
          <p className="text-xs text-amber-800">
            Original Generated By:{' '}
            <strong>{editingDocument.generatedByName || 'Admin'}</strong> on{' '}
            {editingDocument.generatedAt.slice(0, 10)}. Please specify why this document is being modified:
          </p>
          <input
            type="text"
            value={changeReason}
            onChange={e => setChangeReason(e.target.value)}
            placeholder="e.g. Quantity corrected, GSTIN updated, Product price revision requested by client"
            className="w-full text-xs p-2.5 rounded-xl border border-amber-300 bg-white font-medium focus:ring-2 focus:ring-amber-200"
            required
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1 – CUSTOMER DETAILS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-md bg-indigo-600 text-white text-xs font-black tracking-wider uppercase">
              STEP 1
            </span>
            <h2 className="text-sm sm:text-base font-black tracking-wide uppercase text-white">
              STEP 1 – CUSTOMER DETAILS
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                isInterState
                  ? 'bg-purple-900/90 text-purple-200 border border-purple-700'
                  : 'bg-emerald-900/90 text-emerald-200 border border-emerald-700'
              }`}
            >
              {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}
            </span>
          </div>
        </div>

        {/* Step 1 Groups Content */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Row / Group 1: Document Metadata */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Group 1: Document Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Document Type
                </label>
                <div className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-black text-slate-900 flex items-center justify-between">
                  <span>{docType === 'INVOICE' ? 'TAX INVOICE' : 'QUOTATION'}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  {docType === 'INVOICE' ? 'Invoice Number' : 'Quotation Number'}
                </label>
                <div className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-slate-100 font-mono font-black text-slate-900">
                  {editingDocument ? editingDocument.docNumber : docNumberPreview || 'Auto-Generating...'}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  {docType === 'INVOICE' ? 'Invoice Date *' : 'Quotation Date *'}
                </label>
                <input
                  type="date"
                  value={docDate}
                  onChange={e => setDocDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Document Time
                </label>
                <input
                  type="time"
                  value={docTime}
                  onChange={e => setDocTime(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Row / Group 2: Customer Identity & Contact */}
          <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Group 2: Customer Identity & Contact</span>
              </div>

              {/* Master Search Autocomplete Trigger & Desktop Dropdown */}
              <div className="relative w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                  className="w-full sm:w-auto text-xs px-3.5 py-2 sm:py-1.5 rounded-xl sm:rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Select from Customer Master</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {/* Desktop Dropdown (ONLY rendered on lg: screen size and above) */}
                {showCustomerDropdown && (
                  <div className="hidden lg:block absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-30 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                        Customer Master
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCustomerDropdown(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search customer by name, GSTIN, city..."
                        value={customerSearchQuery}
                        onChange={e => setCustomerSearchQuery(e.target.value)}
                        className="w-full text-xs pl-8 pr-2.5 py-2 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-100"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-slate-100">
                      {filteredCustomers.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-400">No matching customers found</div>
                      ) : (
                        filteredCustomers.map(cust => (
                          <button
                            key={cust.id}
                            type="button"
                            onClick={() => handleSelectCustomer(cust)}
                            className="w-full text-left p-2.5 rounded-lg hover:bg-indigo-50 text-xs transition-colors cursor-pointer group"
                          >
                            <div className="font-bold text-slate-900 group-hover:text-indigo-700">{cust.customerName}</div>
                            <div className="text-[11px] text-slate-500 flex items-center justify-between mt-0.5">
                              <span className="font-mono">GSTIN: {cust.gstin || 'Unregistered'}</span>
                              <span className="font-semibold text-slate-700">{cust.state}</span>
                            </div>
                            {cust.contactNumber && <div className="text-[10px] text-slate-400 mt-0.5">Phone: {cust.contactNumber}</div>}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile & Tablet Customer Master Portal Modal (Hidden on lg: screens) */}
            <CustomerMasterSelectorModal
              isOpen={showCustomerDropdown}
              onClose={() => setShowCustomerDropdown(false)}
              customers={customers}
              onSelectCustomer={handleSelectCustomer}
              initialQuery={customerSearchQuery}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Apex Industrial Solutions Pvt Ltd"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={customerContact}
                  onChange={e => setCustomerContact(e.target.value)}
                  placeholder="+91 98250 12345"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  placeholder="billing@apexindustrial.com"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Row / Group 3: Customer Address, State, PIN & GST */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>Group 3: Address & GST Details</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                * Customer PIN Code is required for GST & E-Way Bill compliance
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Customer Billing Address
                </label>
                <textarea
                  rows={2}
                  value={customerAddress}
                  onChange={e => {
                    const addr = e.target.value;
                    setCustomerAddress(addr);
                    if (!customerPinCode) {
                      const extracted = extractPinCodeFromAddress(addr);
                      if (extracted) setCustomerPinCode(extracted);
                    }
                  }}
                  placeholder="Plot / Street / GIDC Industrial Area / City"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Customer PIN Code <span className="text-rose-600 font-black">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={customerPinCode}
                  onChange={e => {
                    const numericVal = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCustomerPinCode(numericVal);
                  }}
                  placeholder="6 digits (e.g. 380001)"
                  className={`w-full text-xs p-2.5 rounded-xl border font-mono font-bold transition-colors ${
                    !customerPinCode.trim()
                      ? 'border-rose-300 bg-rose-50/40 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-100'
                      : customerPinCode.trim().length === 6
                      ? 'border-emerald-300 bg-emerald-50/30 text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                      : 'border-amber-300 bg-white text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                  }`}
                />
                {!customerPinCode.trim() ? (
                  <span className="text-[10px] text-rose-600 font-bold block mt-1">
                    Customer PIN Code is required.
                  </span>
                ) : customerPinCode.trim().length !== 6 ? (
                  <span className="text-[10px] text-amber-700 font-semibold block mt-1">
                    6 digits needed ({customerPinCode.trim().length}/6)
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-700 font-semibold block mt-1">
                    ✓ Valid Indian 6-digit PIN
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  State & State Code
                </label>
                <select
                  value={customerStateCode}
                  onChange={e => {
                    const code = e.target.value;
                    setCustomerStateCode(code);
                    const st = getStateByCode(code);
                    if (st) {
                      setCustomerState(st.name);
                      setPlaceOfSupply(`${st.name} (${st.code})`);
                    }
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                >
                  {INDIAN_STATES.map(s => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 font-medium block mt-1 truncate">
                  {customerState}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Customer GSTIN / UIN
                </label>
                <input
                  type="text"
                  value={customerGstin}
                  onChange={e => handleGstinChange(e.target.value)}
                  placeholder="24AABCS1234F1Z1"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-mono uppercase font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                />
                <span className="text-[10px] text-slate-400 font-medium block mt-1">
                  Optional for Unregistered
                </span>
              </div>
            </div>
          </div>

          {/* Row / Group 4: Transport, Dispatch & Terms */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Group 4: Transport, Dispatch & Order Terms</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Transport / Courier Name
                </label>
                <input
                  type="text"
                  value={dispatchedThrough}
                  onChange={e => setDispatchedThrough(e.target.value)}
                  placeholder="e.g. V-Trans / BlueDart / Road Transport"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Vehicle / LR / Tracking No
                </label>
                <input
                  type="text"
                  value={dispatchDocNo}
                  onChange={e => setDispatchDocNo(e.target.value)}
                  placeholder="e.g. GJ-01-AB-1234 / LR-88210"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Place of Supply
                </label>
                <input
                  type="text"
                  value={placeOfSupply}
                  onChange={e => setPlaceOfSupply(e.target.value)}
                  placeholder="e.g. Gujarat (24)"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={e => setPaymentTerms(e.target.value)}
                  placeholder="e.g. 30 Days Net / Advance"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Buyer Order No
                </label>
                <input
                  type="text"
                  value={buyerOrderNo}
                  onChange={e => setBuyerOrderNo(e.target.value)}
                  placeholder="PO-2026/099"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Buyer Order Date
                </label>
                <input
                  type="date"
                  value={buyerOrderDate}
                  onChange={e => setBuyerOrderDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Terms of Delivery
                </label>
                <input
                  type="text"
                  value={termsOfDelivery}
                  onChange={e => setTermsOfDelivery(e.target.value)}
                  placeholder="e.g. Door Delivery / Ex-Factory / Road Transport"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 2 – PRODUCT DETAILS */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden space-y-0">
        <div className="bg-slate-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-md bg-indigo-600 text-white text-xs font-black tracking-wider uppercase">
              STEP 2
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-black tracking-wide uppercase text-white">
                STEP 2 – PRODUCT DETAILS
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-black flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Product</span>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">

        {/* MOBILE CARD VIEW (< md screens) */}
        <div className="block md:hidden space-y-4">
          {calculatedItems.map((item, index) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3 relative"
            >
              {/* Card Header: Item Number & Quick Row Actions */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-black text-xs">
                  Item #{index + 1}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    title="Move Up"
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === items.length - 1}
                    title="Move Down"
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateItem(index)}
                    title="Duplicate Item"
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-indigo-600"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(index)}
                      title="Delete Item"
                      className="p-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Product Name & Master Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Product Name *
                </label>
                <div className="space-y-1.5">
                  <input
                    type="text"
                    placeholder="Enter product or item name..."
                    value={item.productName}
                    onChange={e => handleItemChange(index, 'productName', e.target.value)}
                    className="w-full text-xs font-bold text-slate-900 p-2.5 rounded-xl border border-slate-300 bg-white focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                    required
                  />

                  <select
                    value={item.productId || ''}
                    onChange={e => {
                      const prod = products.find(p => p.id === e.target.value);
                      if (prod) handleSelectProduct(index, prod);
                    }}
                    className="w-full text-[11px] p-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium"
                  >
                    <option value="">-- Or Pick from Product Master --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.productName} ({p.hsnSac || 'HSN -'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Detailed Specification */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">
                  Specifications / Grade (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Dimensions, grade, material specifications..."
                  value={item.productDescription}
                  onChange={e => handleItemChange(index, 'productDescription', e.target.value)}
                  className="w-full text-xs text-slate-600 p-2 rounded-xl border border-slate-200 bg-white focus:border-indigo-400"
                />
              </div>

              {/* 2-Column: HSN & GST % */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    HSN/SAC Code
                  </label>
                  <input
                    type="text"
                    value={item.hsnSac}
                    onChange={e => handleItemChange(index, 'hsnSac', e.target.value)}
                    placeholder="84818030"
                    className="w-full text-center text-xs font-mono p-2 rounded-xl border border-slate-300 bg-white focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    GST Rate %
                  </label>
                  <select
                    value={item.gstRate}
                    onChange={e => handleItemChange(index, 'gstRate', Number(e.target.value))}
                    className="w-full text-center text-xs p-2 rounded-xl border border-slate-300 bg-white font-bold focus:border-indigo-600"
                  >
                    {settings?.tax.availableGstRates.map(rate => (
                      <option key={rate} value={rate}>
                        {rate}% GST
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2-Column: Quantity & Rate (₹) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={item.quantity || ''}
                    onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full text-right text-xs font-black p-2 rounded-xl border border-slate-300 bg-white focus:border-indigo-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Rate (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={item.rate || ''}
                    onChange={e => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                    className="w-full text-right text-xs font-black p-2 rounded-xl border border-slate-300 bg-white focus:border-indigo-600"
                    required
                  />
                </div>
              </div>

              {/* Calculated Amount Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 bg-indigo-50/50 p-2.5 rounded-xl">
                <span className="text-xs font-bold text-slate-600">Product Amount:</span>
                <span className="text-sm font-black text-indigo-900">
                  {formatIndianCurrency(item.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* DESKTOP TABLE VIEW (>= md screens) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-y border-slate-200">
                <th className="py-2.5 px-2 text-center w-10">Sr.</th>
                <th className="py-2.5 px-3 min-w-[260px]">Product Description</th>
                <th className="py-2.5 px-2 w-28 text-center">HSN/SAC</th>
                <th className="py-2.5 px-2 w-20 text-center">GST %</th>
                <th className="py-2.5 px-2 w-24 text-right">Qty</th>
                <th className="py-2.5 px-2 w-28 text-right">Rate (₹)</th>
                <th className="py-2.5 px-3 w-32 text-right">Amount (₹)</th>
                <th className="py-2.5 px-2 w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {calculatedItems.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Sr No */}
                  <td className="py-2.5 px-2 text-center font-bold text-slate-500">
                    {index + 1}
                  </td>

                  {/* Product Autocomplete & Description */}
                  <td className="py-2.5 px-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="Product Name..."
                        value={item.productName}
                        onChange={e => handleItemChange(index, 'productName', e.target.value)}
                        className="w-full text-xs font-bold text-slate-800 p-1.5 rounded-lg border border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-100"
                        required
                      />

                      {/* Quick preset picker */}
                      <select
                        value={item.productId || ''}
                        onChange={e => {
                          const prod = products.find(p => p.id === e.target.value);
                          if (prod) handleSelectProduct(index, prod);
                        }}
                        className="text-[10px] py-1 px-1.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-medium max-w-[110px] truncate"
                        title="Pick from product master"
                      >
                        <option value="">Quick Pick</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.productName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <input
                      type="text"
                      placeholder="Detailed specifications, dimensions, grade..."
                      value={item.productDescription}
                      onChange={e => handleItemChange(index, 'productDescription', e.target.value)}
                      className="w-full text-[11px] text-slate-500 p-1 rounded border border-slate-200 focus:border-indigo-400 bg-white"
                    />
                  </td>

                  {/* HSN/SAC */}
                  <td className="py-2.5 px-2">
                    <input
                      type="text"
                      value={item.hsnSac}
                      onChange={e => handleItemChange(index, 'hsnSac', e.target.value)}
                      placeholder="84818030"
                      className="w-full text-center text-xs font-mono p-1.5 rounded-lg border border-slate-300 focus:border-indigo-600"
                    />
                  </td>

                  {/* GST % */}
                  <td className="py-2.5 px-2">
                    <select
                      value={item.gstRate}
                      onChange={e => handleItemChange(index, 'gstRate', Number(e.target.value))}
                      className="w-full text-center text-xs p-1.5 rounded-lg border border-slate-300 bg-white font-medium focus:border-indigo-600"
                    >
                      {settings?.tax.availableGstRates.map(rate => (
                        <option key={rate} value={rate}>
                          {rate}%
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Qty */}
                  <td className="py-2.5 px-2">
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={item.quantity || ''}
                      onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full text-right text-xs font-bold p-1.5 rounded-lg border border-slate-300 focus:border-indigo-600"
                      required
                    />
                  </td>

                  {/* Rate */}
                  <td className="py-2.5 px-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.rate || ''}
                      onChange={e => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                      className="w-full text-right text-xs font-bold p-1.5 rounded-lg border border-slate-300 focus:border-indigo-600"
                      required
                    />
                  </td>

                  {/* Amount */}
                  <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 text-xs">
                    {formatIndianCurrency(item.amount)}
                  </td>

                  {/* Action Tools */}
                  <td className="py-2.5 px-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        title="Move Up"
                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === items.length - 1}
                        title="Move Down"
                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateItem(index)}
                        title="Duplicate Row"
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(index)}
                        title="Delete Row"
                        className="p-1 rounded text-slate-400 hover:text-red-600 cursor-pointer"
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

        {/* Large Add Another Product Action */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleAddItem}
            className="w-full py-3 rounded-xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-indigo-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ ADD ANOTHER PRODUCT</span>
          </button>
        </div>
      </div>
    </div>

      {/* ========================================================================= */}
      {/* STEP 3 – TOTALS, TAXES & FREIGHT CHARGES */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden space-y-0">
        <div className="bg-slate-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-md bg-indigo-600 text-white text-xs font-black tracking-wider uppercase">
              STEP 3
            </span>
            <h2 className="text-sm sm:text-base font-black tracking-wide uppercase text-white">
              STEP 3 – TOTALS, TAXES & FREIGHT CHARGES
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300 font-medium">Grand Total:</span>
            <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-sm font-black">
              {formatIndianCurrency(calculations.grandTotal)}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (6 cols): Amount in words, Notes / Remarks, Bank Details summary, GST Logic */}
            <div className="lg:col-span-6 space-y-4">
              {/* Total Amount in Words */}
              <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-indigo-400 font-black">
                  Total Amount in Words (Indian Standard)
                </div>
                <div className="text-sm font-bold text-slate-100 leading-relaxed">
                  {calculations.amountInWords}
                </div>
              </div>

              {/* Notes / Remarks Field */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase">
                  Notes / Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Delivery within 7 days, payment through RTGS/NEFT, Goods once sold will not be taken back..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                />
                <p className="text-[10px] text-slate-400">These notes will appear on the printed document and PDF output.</p>
              </div>

              {/* Bank Details Summary Block */}
              {settings?.print.showBankDetails && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Company Bank Details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Bank Name</span>
                      <strong className="text-slate-900">{settings.bank.bankName}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Account Holder</span>
                      <strong className="text-slate-900">{settings.bank.accountHolder}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Account Number</span>
                      <strong className="text-slate-900 font-mono">{settings.bank.accountNumber}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">IFSC Code</span>
                      <strong className="text-slate-900 font-mono">{settings.bank.ifsc}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Branch</span>
                      <span className="text-slate-800">{settings.bank.branch}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">UPI ID</span>
                      <strong className="text-indigo-700 font-mono">{settings.bank.upiId}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* GST Routing Override */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    GST Routing Logic
                  </span>

                  {settings?.tax.allowManualGstOverride && (
                    <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={manualGstOverride}
                        onChange={e => setManualGstOverride(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Manual GST Override</span>
                    </label>
                  )}
                </div>

                {manualGstOverride ? (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs flex items-center justify-between">
                    <span className="text-amber-900 font-semibold">Force Tax Structure:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setForcedInterState(false)}
                        className={`px-2.5 py-1 rounded text-xs font-bold ${
                          !forcedInterState ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border'
                        }`}
                      >
                        CGST + SGST
                      </button>
                      <button
                        type="button"
                        onClick={() => setForcedInterState(true)}
                        className={`px-2.5 py-1 rounded text-xs font-bold ${
                          forcedInterState ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border'
                        }`}
                      >
                        IGST
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">
                    Routing: <strong>{isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}</strong> based on Seller State ({settings?.tax.sellerState || 'Gujarat'}) and Customer State ({customerState}).
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (6 cols): Financial Calculation Summary */}
            <div className="lg:col-span-6 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2">
                Financial Breakdown
              </h3>

              <div className="space-y-3 text-xs text-slate-700">
                {/* Product Total */}
                <div className="flex items-center justify-between py-1 border-b border-slate-100 sm:border-0 pb-1.5 sm:pb-0">
                  <span className="text-slate-600 font-medium">Subtotal / Product Total</span>
                  <span className="font-bold text-slate-900 text-right">
                    {formatIndianCurrency(calculations.productTotal)}
                  </span>
                </div>

                {/* Discount */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1.5 gap-2 border-b border-slate-100 sm:border-0 pb-2 sm:pb-0">
                  <div className="flex items-center justify-between sm:justify-start gap-2">
                    <span className="font-medium text-slate-700">Discount</span>
                    <div className="flex items-center bg-white rounded-md p-0.5 border border-slate-300 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setDiscountType('FIXED')}
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          discountType === 'FIXED' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        ₹
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType('PERCENT')}
                        className={`px-1.5 py-0.5 rounded font-bold ${
                          discountType === 'PERCENT' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        %
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <input
                      type="number"
                      min="0"
                      value={discountValue || ''}
                      onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-20 text-right p-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                    />
                    <span className="font-bold text-red-600 min-w-[80px] text-right">
                      - {formatIndianCurrency(calculations.discountAmount)}
                    </span>
                  </div>
                </div>

                {/* Taxable Value */}
                <div className="flex items-center justify-between py-1.5 border-t border-slate-200 font-semibold">
                  <span className="text-slate-800">Taxable Value</span>
                  <span className="font-bold text-slate-900 text-right">
                    {formatIndianCurrency(calculations.taxableValue)}
                  </span>
                </div>

                {/* Freight & Freight GST */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1.5 gap-2 border-b border-slate-100 sm:border-0 pb-2 sm:pb-0">
                  <span className="text-slate-600 font-medium">Freight / Transport Charges</span>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <input
                      type="number"
                      min="0"
                      value={freightCharges || ''}
                      onChange={e => setFreightCharges(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-20 sm:w-24 text-right p-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                    />
                    <span className="font-bold text-slate-900 min-w-[80px] text-right">
                      {formatIndianCurrency(freightCharges)}
                    </span>
                  </div>
                </div>

                {/* Taxes: CGST + SGST or IGST */}
                {isInterState ? (
                  <div className="flex items-center justify-between py-1.5 text-purple-800 font-semibold bg-purple-50 px-2.5 rounded-lg border border-purple-200">
                    <span>Integrated GST (IGST)</span>
                    <span className="font-bold text-right">{formatIndianCurrency(calculations.totalIgst)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between py-1 text-slate-700">
                      <span>Central GST (CGST)</span>
                      <span className="font-bold text-right">{formatIndianCurrency(calculations.totalCgst)}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 text-slate-700">
                      <span>State GST (SGST)</span>
                      <span className="font-bold text-right">{formatIndianCurrency(calculations.totalSgst)}</span>
                    </div>
                  </>
                )}

                {/* Other Charges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between py-1.5 gap-2 border-b border-slate-100 sm:border-0 pb-2 sm:pb-0">
                  <span className="text-slate-600 font-medium">Other Charges</span>
                  <div className="flex items-center justify-between sm:justify-end gap-2">
                    <input
                      type="number"
                      min="0"
                      value={otherCharges || ''}
                      onChange={e => setOtherCharges(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-20 sm:w-24 text-right p-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold"
                    />
                    <span className="font-bold text-slate-900 min-w-[80px] text-right">
                      {formatIndianCurrency(otherCharges)}
                    </span>
                  </div>
                </div>

                {/* Rounding Off */}
                <div className="flex items-center justify-between py-1 text-slate-500">
                  <span>Rounding Off</span>
                  <span className="text-right">{formatIndianCurrency(calculations.roundingOff)}</span>
                </div>

                {/* Grand Total */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 py-3 border-t-2 border-slate-900 text-base font-black text-slate-900 bg-white p-3 rounded-xl border border-slate-300 shadow-xs">
                  <span className="text-xs uppercase tracking-wider text-slate-600 sm:text-base sm:normal-case sm:tracking-normal sm:text-slate-900">
                    Grand Total (₹)
                  </span>
                  <span className="text-xl text-indigo-900 tracking-tight font-black text-right">
                    {formatIndianCurrency(calculations.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer Bar */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-300 shadow-xl flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>

          {!editingDocument && (
            <button
              type="button"
              onClick={() => handleProceedGeneration(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4 text-slate-600" />
              <span>Save as Draft</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-indigo-600" />
            <span>Preview Document</span>
          </button>
        </div>

        {/* Large Prominent Generate Button */}
        <button
          type="button"
          onClick={() => handleProceedGeneration(false)}
          className={`px-8 py-3 rounded-xl text-sm font-extrabold text-white shadow-lg transition-all flex items-center gap-2 cursor-pointer ${
            docType === 'INVOICE'
              ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-indigo-200'
              : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-200'
          }`}
        >
          <FileCheck2 className="w-5 h-5" />
          <span>
            {editingDocument
              ? `UPDATE ${docType}`
              : `GENERATE ${docType === 'INVOICE' ? 'INVOICE' : 'QUOTATION'}`}
          </span>
        </button>
      </div>

      {/* Duplicate Document Warning Modal */}
      {showDuplicateModal && duplicateWarningDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-slate-900">Possible Duplicate Detected</h3>
              <p className="text-xs text-slate-500 mt-1">
                A generated document already exists with identical customer, date, line count, and grand total:
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Document No:</span>
                <span className="font-bold text-slate-900">{duplicateWarningDoc.docNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-bold text-slate-900">{duplicateWarningDoc.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span>{duplicateWarningDoc.docDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Amount:</span>
                <span className="font-bold text-indigo-700">
                  {formatIndianCurrency(duplicateWarningDoc.grandTotal)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Review / Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  executeFinalSave(false);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Price History Modal */}
      {priceHistoryModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Historical Price Intelligence</h3>
              </div>
              <button
                type="button"
                onClick={() => setPriceHistoryModal({ isOpen: false, productName: '', customerName: '', history: null })}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-1">
              <div>Customer: <strong>{priceHistoryModal.customerName}</strong></div>
              <div>Product: <strong>{priceHistoryModal.productName}</strong></div>
            </div>

            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2">Date</th>
                    <th className="py-2 px-2">Doc Number</th>
                    <th className="py-2 px-2 text-right">Qty</th>
                    <th className="py-2 px-2 text-right">Price (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {priceHistoryModal.history?.history?.map((h, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2 px-2">{h.docDate}</td>
                      <td className="py-2 px-2 font-mono font-bold text-indigo-700">{h.docNumber}</td>
                      <td className="py-2 px-2 text-right">{h.quantity}</td>
                      <td className="py-2 px-2 text-right font-extrabold text-slate-900">
                        {formatIndianCurrency(h.price)}
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400">
                        No previous purchase records found for this combination.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setPriceHistoryModal({ isOpen: false, productName: '', customerName: '', history: null })}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Document Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-slate-100 max-w-5xl w-full max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-300 p-4 sm:p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 bg-white p-3.5 rounded-xl">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Live Document Preview</h3>
                  <p className="text-[11px] text-slate-500">Preview layout, taxes, notes & company branding before finalizing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Close Preview
              </button>
            </div>

            <DocumentPreview
              document={previewDraftDoc}
              onBack={() => setShowPreviewModal(false)}
              onEdit={() => setShowPreviewModal(false)}
              onCancelDoc={() => {}}
              onViewHistory={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
};
