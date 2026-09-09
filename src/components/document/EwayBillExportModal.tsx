import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  X,
  Download,
  AlertCircle,
  CheckCircle2,
  FileCode2,
  Building2,
  ArrowRight,
  Info,
  Calendar,
  Layers,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { BusinessDocument, AppSettings, Customer, TransportMode, VehicleType, TransportDetails } from '../../types';
import { dbService } from '../../services/storage';
import { formatIndianCurrency } from '../../utils/indianNumbering';
import {
  validateEwayBillPrerequisites,
  validateTransportDetails,
  buildEwayBillJsonObject,
  generateEwayBillFileName,
  downloadJsonFile,
  getRecentTransporters,
  saveRecentTransporter,
  resolveCustomerStateCode,
  resolveCustomerPinCode,
} from '../../services/ewayBillService';

interface EwayBillExportModalProps {
  document: BusinessDocument;
  isOpen: boolean;
  onClose: () => void;
  settings?: AppSettings | null;
}

export const EwayBillExportModal: React.FC<EwayBillExportModalProps> = ({
  document: doc,
  isOpen,
  onClose,
  settings: propSettings,
}) => {
  const [settings, setSettings] = useState<AppSettings | null>(propSettings || null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Transport details state (the ONLY user inputs)
  const [transMode, setTransMode] = useState<TransportMode>('1'); // Default Road
  const [transporterName, setTransporterName] = useState('');
  const [transporterId, setTransporterId] = useState('');
  const [distanceKm, setDistanceKm] = useState<string>('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('R'); // Default Regular
  const [transDocNo, setTransDocNo] = useState('');
  const [transDocDate, setTransDocDate] = useState(
    doc.docDate || new Date().toISOString().slice(0, 10)
  );

  // Validation & feedback state
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedFileName, setGeneratedFileName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Recent transporters suggestion
  const [recentTransporters, setRecentTransporters] = useState<Array<{ name: string; id: string }>>([]);
  const [showTransporterSuggestions, setShowTransporterSuggestions] = useState(false);

  // Load Settings, Customer Master and Recent Transporters on open
  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
      setValidationErrors([]);
      return;
    }

    let isMounted = true;

    async function loadContext() {
      try {
        setLoading(true);
        const [appSettings, customersList] = await Promise.all([
          propSettings ? Promise.resolve(propSettings) : dbService.getSettings(),
          dbService.getCustomers(),
        ]);

        if (isMounted) {
          setSettings(appSettings);
          // Find matching customer
          const matched = customersList.find(
            c => c.id === doc.customerId || c.customerName.toLowerCase() === doc.customerName.toLowerCase()
          );
          if (matched) {
            setCustomer(matched);
          }

          // Pre-populate transport info if present on document
          if (doc.dispatchedThrough) {
            setTransporterName(doc.dispatchedThrough);
          }
          if (doc.dispatchDocNo) {
            setTransDocNo(doc.dispatchDocNo);
          }

          // Load recent transporters
          const recent = getRecentTransporters();
          setRecentTransporters(recent);
        }
      } catch (err) {
        console.error('Failed to load context for E-Way Bill export:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadContext();

    return () => {
      isMounted = false;
    };
  }, [isOpen, doc, propSettings]);

  // Prerequisites errors check (Invoice & Masters)
  const prerequisiteErrors = useMemo(() => {
    if (loading || !settings) return [];
    return validateEwayBillPrerequisites(doc, settings, customer);
  }, [doc, settings, customer, loading]);

  if (!isOpen) return null;

  const handleSelectRecentTransporter = (t: { name: string; id: string }) => {
    setTransporterName(t.name);
    setTransporterId(t.id);
    setShowTransporterSuggestions(false);
  };

  const handleGenerateJson = () => {
    setValidationErrors([]);

    // 1. Check prerequisite errors (Invoice, Settings, Customer, HSN)
    if (prerequisiteErrors.length > 0) {
      setValidationErrors(prerequisiteErrors);
      return;
    }

    // 2. Validate Transport Details based on selected mode
    const currentTransport: TransportDetails = {
      transMode,
      transporterName,
      transporterId,
      distanceKm,
      vehicleNo,
      vehicleType,
      transDocNo,
      transDocDate,
    };

    const transportErrors = validateTransportDetails(currentTransport);
    if (transportErrors.length > 0) {
      setValidationErrors(transportErrors);
      return;
    }

    if (!settings) {
      setValidationErrors(['Application settings could not be loaded. Please refresh the page.']);
      return;
    }

    try {
      setIsGenerating(true);

      // 3. Build official NIC E-Way Bill JSON
      const ewayBillJson = buildEwayBillJsonObject(doc, settings, currentTransport, customer);

      // 4. Generate filename
      const filename = generateEwayBillFileName(doc.docNumber, doc.docDate);

      // 5. Trigger download
      downloadJsonFile(ewayBillJson, filename);

      // 6. Save transporter to recent cache for future auto-completion
      if (transporterName.trim() || transporterId.trim()) {
        saveRecentTransporter(transporterName, transporterId);
      }

      // 7. Audit log (linked to existing invoice, does NOT create new invoice or MIS row)
      dbService.logAudit(
        'USR-SYSTEM',
        'User',
        'EWAY_BILL_JSON_EXPORTED',
        'DOCUMENT',
        `E-Way Bill JSON exported for ${doc.docType} ${doc.docNumber} (Filename: ${filename}).`,
        doc.docNumber,
        doc.id
      ).catch(() => {});

      setGeneratedFileName(filename);
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Failed to generate E-Way Bill JSON:', err);
      setValidationErrors([`Failed to generate E-Way Bill JSON: ${err.message || 'Unknown error'}`]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white max-w-xl w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-4 sm:p-5 text-white flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
              <Truck className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black tracking-wide uppercase">
                  TRANSPORT DETAILS
                </h2>
                <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-400/30">
                  NIC e-Way Bill Export
                </span>
              </div>
              <p className="text-[11px] text-indigo-200 mt-0.5">
                Invoice details are already automatically mapped. Enter only transportation details.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Auto-Mapped Invoice Snapshot Badge */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-indigo-950">
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold bg-indigo-200/70 text-indigo-900 px-2 py-0.5 rounded text-[11px]">
                {doc.docNumber}
              </span>
              <span className="font-semibold truncate max-w-[180px] sm:max-w-[240px]">
                {doc.customerName}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span>
                Total: <strong className="font-bold text-indigo-950">{formatIndianCurrency(doc.grandTotal)}</strong>
              </span>
              <span className="bg-white px-2 py-0.5 rounded text-indigo-700 font-bold border border-indigo-200">
                {doc.items.length} {doc.items.length === 1 ? 'Item' : 'Items'} Mapped
              </span>
            </div>
          </div>

          {/* Success Notification */}
          {isSuccess ? (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3 animate-fadeIn text-emerald-900">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide text-emerald-800">
                    E-WAY BILL JSON GENERATED SUCCESSFULLY ✓
                  </h3>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Invoice data has been automatically mapped.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-emerald-200 font-mono text-[11px] text-slate-700 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <FileCode2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate font-bold">{generatedFileName}</span>
                </div>
                <span className="shrink-0 text-emerald-700 font-bold uppercase text-[10px] bg-emerald-100 px-2 py-0.5 rounded">
                  Downloaded
                </span>
              </div>

              <p className="text-[11px] text-emerald-800 leading-relaxed">
                The JSON file is ready for the applicable e-Way Bill upload process. Upload this file directly to the official GST e-Way Bill portal under <strong>e-Way Bill &gt; Generate Bulk</strong>.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={handleGenerateJson}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Again</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Validation Errors Box */}
              {validationErrors.length > 0 && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 space-y-1.5 animate-fadeIn">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-red-900">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Please correct the following before generating JSON:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-red-700">
                    {validationErrors.map((err, i) => (
                      <li key={i} className="leading-snug">{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notice if prerequisite master data has issues */}
              {prerequisiteErrors.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-950">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Missing Required Master Information</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-800 pl-1">
                    {prerequisiteErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Form Controls - Only Transport Details Required */}
              <div className="space-y-3.5">
                {/* Transport Mode & Vehicle Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Transport Mode <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={transMode}
                      onChange={e => setTransMode(e.target.value as TransportMode)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-600"
                    >
                      <option value="1">1 - Road</option>
                      <option value="2">2 - Rail</option>
                      <option value="3">3 - Air</option>
                      <option value="4">4 - Ship</option>
                    </select>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      {transMode === '1'
                        ? 'Requires Vehicle Number or Transporter ID'
                        : 'Requires Transport Document No & Date'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Vehicle Type
                    </label>
                    <select
                      value={vehicleType}
                      disabled={transMode !== '1'}
                      onChange={e => setVehicleType(e.target.value as VehicleType)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-600 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="R">Regular</option>
                      <option value="O">Over Dimension Cargo (ODC)</option>
                    </select>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Applicable for Road transport
                    </span>
                  </div>
                </div>

                {/* Transporter Name & ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase">
                        Transporter Name
                      </label>
                      {recentTransporters.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowTransporterSuggestions(!showTransporterSuggestions)}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                        >
                          {showTransporterSuggestions ? 'Hide Recent' : 'Recent'}
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={transporterName}
                      onChange={e => setTransporterName(e.target.value)}
                      placeholder="e.g. VRL Logistics / SafeXpress"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-indigo-200 focus:border-indigo-600"
                    />

                    {/* Recent Transporter Suggestion Dropdown */}
                    {showTransporterSuggestions && recentTransporters.length > 0 && (
                      <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase">
                          Recent Transporters
                        </div>
                        {recentTransporters.map((t, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectRecentTransporter(t)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-indigo-50 flex items-center justify-between transition-colors"
                          >
                            <span className="font-bold text-slate-800 truncate">{t.name}</span>
                            <span className="font-mono text-[10px] text-slate-500">{t.id}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Transporter GSTIN / TRANSIN
                    </label>
                    <input
                      type="text"
                      maxLength={15}
                      value={transporterId}
                      onChange={e => setTransporterId(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))}
                      placeholder="15-character GSTIN or TRANSIN"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono uppercase font-bold focus:ring-2 focus:ring-indigo-200 focus:border-indigo-600"
                    />
                  </div>
                </div>

                {/* Distance in KM & Vehicle Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Distance in KM <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={distanceKm}
                      onChange={e => setDistanceKm(e.target.value)}
                      placeholder="e.g. 150"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold focus:ring-2 focus:ring-indigo-200 focus:border-indigo-600"
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Approximate transit distance
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Vehicle Number {transMode === '1' && !transporterId && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={vehicleNo}
                      onChange={e => setVehicleNo(e.target.value.toUpperCase())}
                      placeholder="e.g. GJ01AB1234"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-bold uppercase focus:ring-2 focus:ring-indigo-200 focus:border-indigo-600"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Without spaces or special characters
                    </span>
                  </div>
                </div>

                {/* Transport Document Number & Date (Required for Rail/Air/Ship, optional for Road) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Transport Document Number {transMode !== '1' && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={transDocNo}
                      onChange={e => setTransDocNo(e.target.value)}
                      placeholder={
                        transMode === '2'
                          ? 'Railway Receipt (RR) No'
                          : transMode === '3'
                          ? 'Airway Bill No'
                          : transMode === '4'
                          ? 'Bill of Lading No'
                          : 'e.g. Lorry Receipt (LR) No (Optional)'
                      }
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-indigo-200 focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Transport Document Date {transMode !== '1' && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="date"
                      value={transDocDate}
                      onChange={e => setTransDocDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-indigo-200 focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerateJson}
                  disabled={isGenerating}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 active:bg-indigo-950 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>GENERATING E-WAY BILL JSON...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>GENERATE E-WAY BILL JSON</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer info banner */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 px-4 sm:px-6 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-slate-600">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>Official NIC E-Way Bill Bulk Format (v1.0.0421)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
