import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  Layers,
  History,
  Tag,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { Product, AppSettings, CustomerProductPriceHistory } from '../../types';
import { dbService } from '../../services/storage';
import { exportProductsToCSV, downloadProductTemplateCSV } from '../../utils/excelExport';
import { formatIndianCurrency, formatDate } from '../../utils/indianNumbering';
import { useAuth } from '../../context/AuthContext';

export const ProductMaster: React.FC = () => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [priceHistories, setPriceHistories] = useState<CustomerProductPriceHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [gstFilter, setGstFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [hsnSac, setHsnSac] = useState('');
  const [defaultGstRate, setDefaultGstRate] = useState<number>(18);
  const [defaultBasePrice, setDefaultBasePrice] = useState<number>(0);
  const [active, setActive] = useState(true);

  // Product Pricing Drawer
  const [pricingDrawerProduct, setPricingDrawerProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const [prods, appSettings, phs] = await Promise.all([
      dbService.getProducts(),
      dbService.getSettings(),
      dbService.getPriceHistories(),
    ]);
    setProducts(prods);
    setSettings(appSettings);
    setPriceHistories(phs);
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setProductName('');
    setProductDescription('');
    setHsnSac('');
    setDefaultGstRate(settings?.tax.defaultGstRate || 18);
    setDefaultBasePrice(0);
    setActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setProductName(prod.productName);
    setProductDescription(prod.productDescription || '');
    setHsnSac(prod.hsnSac || '');
    setDefaultGstRate(prod.defaultGstRate || 18);
    setDefaultBasePrice(prod.defaultBasePrice || 0);
    setActive(prod.active);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      alert('Please enter a Product Name');
      return;
    }

    const nowIso = new Date().toISOString();
    const prodId = editingProduct?.id || `PROD-${Date.now()}`;

    const productToSave: Product = {
      id: prodId,
      productName: productName.trim(),
      productDescription: productDescription.trim(),
      hsnSac: hsnSac.trim(),
      defaultGstRate: Number(defaultGstRate),
      defaultBasePrice: Number(defaultBasePrice),
      active,
      createdDate: editingProduct?.createdDate || nowIso,
      lastUpdatedDate: nowIso,
    };

    await dbService.saveProduct(productToSave);
    await dbService.logAudit(
      currentUser?.id || 'USR-001',
      currentUser?.displayName || 'User',
      editingProduct ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED',
      'PRODUCT',
      `Product ${productToSave.productName} (HSN: ${productToSave.hsnSac || '-'}, Base: ₹${productToSave.defaultBasePrice}) saved.`,
      undefined,
      productToSave.id
    );

    setIsModalOpen(false);
    loadProducts();
  };

  const handleDelete = async (prod: Product) => {
    if (confirm(`Are you sure you want to delete product "${prod.productName}"?`)) {
      await dbService.deleteProduct(prod.id);
      await dbService.logAudit(
        currentUser?.id || 'USR-001',
        currentUser?.displayName || 'User',
        'PRODUCT_DELETED',
        'PRODUCT',
        `Product ${prod.productName} deleted.`,
        undefined,
        prod.id
      );
      loadProducts();
    }
  };

  // Bulk CSV Upload
  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        alert('File is empty or contains only headers.');
        return;
      }

      let addedCount = 0;
      const nowIso = new Date().toISOString();

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
        const [pName, pDesc, pHsn, pGst, pBase] = cols;

        if (pName) {
          const newProd: Product = {
            id: `PROD-CSV-${Date.now()}-${i}`,
            productName: pName,
            productDescription: pDesc || '',
            hsnSac: pHsn || '',
            defaultGstRate: Number(pGst) || 18,
            defaultBasePrice: Number(pBase) || 0,
            active: true,
            createdDate: nowIso,
            lastUpdatedDate: nowIso,
          };
          await dbService.saveProduct(newProd);
          addedCount++;
        }
      }

      alert(`Successfully imported ${addedCount} products.`);
      loadProducts();
    };
    reader.readAsText(file);
  };

  // Filtered List
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (statusFilter === 'ACTIVE' && !p.active) return false;
      if (statusFilter === 'INACTIVE' && p.active) return false;
      if (gstFilter !== 'ALL' && String(p.defaultGstRate) !== gstFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = p.productName.toLowerCase().includes(query);
        const matchesHsn = p.hsnSac.toLowerCase().includes(query);
        const matchesDesc = p.productDescription.toLowerCase().includes(query);
        if (!matchesName && !matchesHsn && !matchesDesc) return false;
      }
      return true;
    });
  }, [products, searchQuery, gstFilter, statusFilter]);

  // Customer rates for the selected product in the pricing drawer
  const customerRatesForProduct = useMemo(() => {
    if (!pricingDrawerProduct) return [];
    return priceHistories.filter(
      ph =>
        ph.productId === pricingDrawerProduct.id ||
        ph.productName.toLowerCase() === pricingDrawerProduct.productName.toLowerCase()
    );
  }, [pricingDrawerProduct, priceHistories]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            <span>Product & Item Master</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Master catalogue with HSN/SAC codes, standard GST rates, and base price registry.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* CSV Template */}
          <button
            onClick={downloadProductTemplateCSV}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download CSV Import Template"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV Template</span>
          </button>

          {/* Bulk Import */}
          <label className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
            <input type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" />
          </label>

          {/* Export */}
          <button
            onClick={() => exportProductsToCSV(filteredProducts)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* Add New */}
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, HSN/SAC, specs..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* GST Filter */}
          <select
            value={gstFilter}
            onChange={e => setGstFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-300 bg-slate-50 font-medium"
          >
            <option value="ALL">All GST Rates</option>
            {settings?.tax.availableGstRates.map(rate => (
              <option key={rate} value={String(rate)}>
                {rate}% GST
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-300 bg-slate-50 font-medium"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-900 text-white uppercase font-black text-[10px] tracking-wider">
                <th className="py-3 px-4">Product Name & Specifications</th>
                <th className="py-3 px-3 text-center">HSN / SAC</th>
                <th className="py-3 px-3 text-center">GST Rate</th>
                <th className="py-3 px-3 text-right">Default Base Price</th>
                <th className="py-3 px-3 text-center">Client Rates</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No products found. Click "+ Add Product" or Import CSV.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(prod => (
                  <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Product Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{prod.productName}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[320px]">
                        {prod.productDescription || 'No technical specification recorded'}
                      </div>
                    </td>

                    {/* HSN/SAC */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                      {prod.hsnSac || '-'}
                    </td>

                    {/* GST Rate */}
                    <td className="py-3 px-3 text-center font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {prod.defaultGstRate}%
                      </span>
                    </td>

                    {/* Base Price */}
                    <td className="py-3 px-3 text-right font-extrabold text-slate-950 text-xs">
                      {formatIndianCurrency(prod.defaultBasePrice)}
                    </td>

                    {/* Client Pricing Registry */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setPricingDrawerProduct(prod)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors"
                      >
                        Client Rates
                      </button>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          prod.active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {prod.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(prod)}
                          title="Edit Product"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(prod)}
                          title="Delete Product"
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Product / Item Name *
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  placeholder="e.g. Industrial SS Ball Valve 2 Inch"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Technical Specifications / Description
                </label>
                <textarea
                  rows={2}
                  value={productDescription}
                  onChange={e => setProductDescription(e.target.value)}
                  placeholder="Material SS-316, Pressure 150 PSI, Flanged End"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    HSN / SAC Code
                  </label>
                  <input
                    type="text"
                    value={hsnSac}
                    onChange={e => setHsnSac(e.target.value)}
                    placeholder="84818030"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Default GST %
                  </label>
                  <select
                    value={defaultGstRate}
                    onChange={e => setDefaultGstRate(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-medium"
                  >
                    {settings?.tax.availableGstRates.map(rate => (
                      <option key={rate} value={rate}>
                        {rate}%
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Base Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={defaultBasePrice || ''}
                    onChange={e => setDefaultBasePrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={e => setActive(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Active Product</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                  >
                    Save Product
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Rates For Product Modal */}
      {pricingDrawerProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Customer Pricing Variations
                </h3>
                <p className="text-xs text-slate-500 font-bold">{pricingDrawerProduct.productName}</p>
              </div>
              <button
                onClick={() => setPricingDrawerProduct(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between">
              <span className="text-slate-600">Catalogue Base Price:</span>
              <span className="font-extrabold text-slate-900">
                {formatIndianCurrency(pricingDrawerProduct.defaultBasePrice)}
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Customer</th>
                    <th className="py-2 px-2 text-right">Last Billed (₹)</th>
                    <th className="py-2 px-2 text-right">Previous (₹)</th>
                    <th className="py-2 px-3 text-right">Last Doc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customerRatesForProduct.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400">
                        No customer transactions recorded yet for this product.
                      </td>
                    </tr>
                  ) : (
                    customerRatesForProduct.map((cp, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">{cp.customerName}</td>
                        <td className="py-2 px-2 text-right font-extrabold text-indigo-900">
                          {formatIndianCurrency(cp.lastPrice)}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-500">
                          {cp.previousPrice ? formatIndianCurrency(cp.previousPrice) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[10px] text-slate-600">
                          {cp.lastDocNumber}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setPricingDrawerProduct(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
