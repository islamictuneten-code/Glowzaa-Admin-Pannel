import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, ProductCategory } from '../../types';
import { Badge } from '../shared/Badge';
import { Modal } from '../shared/Modal';
import { 
  Package, 
  Search, 
  PlusCircle, 
  Filter, 
  Edit3, 
  AlertTriangle, 
  Boxes,
  MapPin,
  Tag,
  Trash2,
  CheckCircle2,
  XCircle,
  Sliders,
  Banknote,
  Info,
  ExternalLink,
  Layers,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';

export const AdminProducts: React.FC = () => {
  const { 
    products, 
    categoryDocs, 
    categories, 
    addProduct, 
    updateProduct, 
    toggleProductStatus, 
    deleteProduct, 
    adjustStock, 
    formatBDT, 
    isProductsLoading 
  } = useApp();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStockFilter, setSelectedStockFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingStockProd, setAdjustingStockProd] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Form State: Basic Info
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<string>('Makeup & Cosmetics');
  const [subCategory, setSubCategory] = useState('');
  const [brand, setBrand] = useState('Glowzaa');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Form State: Pricing
  const [purchasePrice, setPurchasePrice] = useState<number | ''>(350);
  const [wholesalePrice, setWholesalePrice] = useState<number | ''>(550);
  const [mrp, setMrp] = useState<number | ''>(950);
  const [minSellingPrice, setMinSellingPrice] = useState<number | ''>(500);

  // Form State: Inventory
  const [openingStock, setOpeningStock] = useState<number | ''>(50);
  const [currentStock, setCurrentStock] = useState<number | ''>(50);
  const [lowStockThreshold, setLowStockThreshold] = useState<number | ''>(15);
  const [unit, setUnit] = useState('piece');

  // Form State: Optional Details
  const [barcode, setBarcode] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [variant, setVariant] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stock Adjustment Form State
  const [adjustQuantity, setAdjustQuantity] = useState<number | ''>(0);
  const [adjustReason, setAdjustReason] = useState('Physical Stock Audit Correction');
  const [adjustType, setAdjustType] = useState<'adjustment' | 'stock_in' | 'damage' | 'audit' | 'return' | 'sample'>('audit');

  // Available Sub-categories for selected Category
  const activeCategoryDoc = categoryDocs.find(c => c.name === category);
  const availableSubCategories = activeCategoryDoc?.subCategories || [];

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const term = search.toLowerCase();
    const matchesSearch = 
      p.name.toLowerCase().includes(term) || 
      p.sku.toLowerCase().includes(term) ||
      (p.brand && p.brand.toLowerCase().includes(term)) ||
      (p.subCategory && p.subCategory.toLowerCase().includes(term)) ||
      (p.barcode && p.barcode.toLowerCase().includes(term));

    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesStock = selectedStockFilter === 'all' || p.stockStatus === selectedStockFilter;
    const matchesStatus = selectedStatusFilter === 'all' || p.status === selectedStatusFilter;

    return matchesSearch && matchesCategory && matchesStock && matchesStatus;
  });

  // Open Create Product Form
  const handleOpenAdd = () => {
    const defaultCat = categoryDocs[0]?.name || 'Makeup & Cosmetics';
    const subCat = categoryDocs[0]?.subCategories?.[0]?.name || '';

    setName('');
    setSku(`GZ-${Math.floor(1000 + Math.random() * 9000)}`);
    setCategory(defaultCat);
    setSubCategory(subCat);
    setBrand('Glowzaa');
    setImage('https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop&q=80');
    setDescription('');
    setStatus('active');
    setPurchasePrice(350);
    setWholesalePrice(550);
    setMrp(850);
    setMinSellingPrice(500);
    setOpeningStock(60);
    setCurrentStock(60);
    setLowStockThreshold(15);
    setUnit('piece');
    setBarcode('');
    setSize('');
    setColor('');
    setVariant('');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Submit Create Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Product name is required.');
      return;
    }
    if (!sku.trim()) {
      setFormError('Product SKU is required.');
      return;
    }
    if (!purchasePrice || Number(purchasePrice) < 0) {
      setFormError('Valid Purchase Price is required.');
      return;
    }
    if (!wholesalePrice || Number(wholesalePrice) <= 0) {
      setFormError('Valid Wholesale Price is required.');
      return;
    }
    if (!mrp || Number(mrp) <= 0) {
      setFormError('Valid Retail MRP is required.');
      return;
    }

    setIsSubmitting(true);

    const res = await addProduct({
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      category,
      categoryId: activeCategoryDoc?.id || '',
      subCategory: subCategory.trim(),
      brand: brand.trim(),
      brandName: brand.trim(),
      image: image.trim() || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop&q=80',
      description: description.trim(),
      status,
      purchasePrice: Number(purchasePrice),
      wholesalePrice: Number(wholesalePrice),
      mrp: Number(mrp),
      minSellingPrice: minSellingPrice ? Number(minSellingPrice) : Number(wholesalePrice),
      openingStock: openingStock ? Number(openingStock) : 0,
      currentStock: currentStock !== '' ? Number(currentStock) : (openingStock ? Number(openingStock) : 0),
      lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : 10,
      unit,
      barcode: barcode.trim(),
      size: size.trim(),
      color: color.trim(),
      variant: variant.trim(),
      warehouseLocation: 'Banani Central Hub'
    });

    setIsSubmitting(false);

    if (res.success) {
      setIsAddModalOpen(false);
    } else {
      setFormError(res.error || 'Failed to save product.');
    }
  };

  // Open Edit Product Modal
  const handleOpenEdit = (p: Product) => {
    setEditingProduct({ ...p });
    setFormError(null);
  };

  // Submit Edit Product
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editingProduct.name.trim() || !editingProduct.sku.trim()) {
      setFormError('Product Name and SKU are required.');
      return;
    }

    setIsSubmitting(true);
    const res = await updateProduct(editingProduct);
    setIsSubmitting(false);

    if (res.success) {
      setEditingProduct(null);
    } else {
      setFormError(res.error || 'Failed to update product.');
    }
  };

  // Open Stock Adjustment Modal
  const handleOpenStockAdjust = (p: Product) => {
    setAdjustingStockProd(p);
    setAdjustQuantity(0);
    setAdjustType('audit');
    setAdjustReason('Physical Stock Audit Count');
    setFormError(null);
  };

  // Submit Authorized Stock Adjustment
  const handleSaveStockAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingStockProd) return;
    if (adjustQuantity === '' || Number(adjustQuantity) === 0) {
      setFormError('Adjustment quantity cannot be 0. Enter positive number to add stock, or negative to reduce.');
      return;
    }
    if (!adjustReason.trim()) {
      setFormError('Please specify the reason for this inventory adjustment.');
      return;
    }

    setIsSubmitting(true);
    const res = await adjustStock(
      adjustingStockProd.id, 
      Number(adjustQuantity), 
      adjustReason.trim(), 
      adjustType
    );
    setIsSubmitting(false);

    if (res.success) {
      setAdjustingStockProd(null);
    } else {
      setFormError(res.error || 'Failed to adjust stock.');
    }
  };

  // Confirm Delete Product
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setIsSubmitting(true);
    await deleteProduct(deletingProduct.id);
    setIsSubmitting(false);
    setDeletingProduct(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Products & Catalog Master</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {products.length} Firestore SKUs
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Centralized B2B inventory master: pricing tiers (Cost, Wholesale, MRP), real-time stock counts, and barcode tracking.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SKU, product name, brand..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium cursor-pointer"
            >
              <option value="all">All Categories ({products.length})</option>
              {categoryDocs.map((c, idx) => (
                <option key={`filter-cat-${c.id || c.name}-${idx}`} value={c.name}>{c.name}</option>
              ))}
            </select>

            {/* Stock Status Filter */}
            <select
              value={selectedStockFilter}
              onChange={e => setSelectedStockFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium cursor-pointer"
            >
              <option value="all">All Stock Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">⚠️ Low Stock</option>
              <option value="out_of_stock">❌ Out of Stock</option>
            </select>

            {/* Active / Inactive Filter */}
            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium cursor-pointer"
            >
              <option value="all">Active & Inactive</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

          </div>

        </div>
      </div>

      {/* Product List Table */}
      {isProductsLoading ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="w-8 h-8 border-2 border-rose-600/30 border-t-rose-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Connecting to Firestore live catalog...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Products Found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            {search || selectedCategory !== 'all' 
              ? 'Try changing your search keywords or filter criteria.' 
              : 'Add your first product to the Firestore catalog.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-rose-600 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            Add Product Now
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                  <th className="py-3.5 px-4">Product Info</th>
                  <th className="py-3.5 px-3">SKU / Code</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3 text-right">Purchase Price</th>
                  <th className="py-3.5 px-3 text-right">Wholesale (B2B)</th>
                  <th className="py-3.5 px-3 text-right">MRP</th>
                  <th className="py-3.5 px-3 text-center">Current Stock</th>
                  <th className="py-3.5 px-3 text-center">Catalog Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredProducts.map((p) => {
                  const isLowStock = p.currentStock <= p.lowStockThreshold && p.currentStock > 0;
                  const isOutOfStock = p.currentStock <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                      
                      {/* Product Info & Thumbnail */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div>
                            <span className="font-bold text-slate-900 line-clamp-1 group-hover:text-rose-600 transition-colors block">
                              {p.name}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span>{p.brand || 'Glowzaa'}</span>
                              {p.size && <span>• {p.size}</span>}
                              {p.color && <span>• {p.color}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-3">
                        <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                          {p.sku}
                        </span>
                      </td>

                      {/* Category & SubCategory */}
                      <td className="py-3 px-3">
                        <div>
                          <span className="font-semibold text-slate-800 block">{p.category}</span>
                          {p.subCategory && (
                            <span className="text-[10px] text-slate-400">{p.subCategory}</span>
                          )}
                        </div>
                      </td>

                      {/* Purchase Price (Cost) */}
                      <td className="py-3 px-3 text-right font-semibold text-slate-600">
                        {formatBDT(p.purchasePrice)}
                      </td>

                      {/* Wholesale Price (B2B) */}
                      <td className="py-3 px-3 text-right font-bold text-rose-600">
                        {formatBDT(p.wholesalePrice)}
                      </td>

                      {/* MRP */}
                      <td className="py-3 px-3 text-right text-slate-500 font-medium">
                        {formatBDT(p.mrp)}
                      </td>

                      {/* Current Stock & Low Stock Indicator */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                            isOutOfStock 
                              ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                              : isLowStock 
                                ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}>
                            {p.currentStock} {p.unit || 'pcs'}
                          </span>

                          {isLowStock && (
                            <span className="text-[9px] text-amber-700 font-bold mt-0.5 flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Low (≤{p.lowStockThreshold})</span>
                            </span>
                          )}
                          {isOutOfStock && (
                            <span className="text-[9px] text-rose-700 font-bold mt-0.5">
                              Out of Stock
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Toggle Badge */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleProductStatus(p.id, p.status)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                            p.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                          }`}
                          title="Click to toggle Active / Inactive status"
                        >
                          {p.status.toUpperCase()}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          
                          {/* Stock Adjustment Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenStockAdjust(p)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Authorized Stock Adjustment"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Product Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Product Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Product Button */}
                          <button
                            type="button"
                            onClick={() => setDeletingProduct(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {filteredProducts.length} of {products.length} products</span>
            <div className="flex items-center gap-4">
              <span>Total Units in Catalog: <strong className="text-slate-900">{products.reduce((s, p) => s + p.currentStock, 0)}</strong></span>
              <span>Low Stock Alerts: <strong className="text-amber-600">{products.filter(p => p.currentStock <= p.lowStockThreshold && p.currentStock > 0).length}</strong></span>
            </div>
          </div>

        </div>
      )}

      {/* 1. ADD PRODUCT MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Product to Wholesale Catalog"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateProduct} className="space-y-5 text-left max-h-[80vh] overflow-y-auto pr-1">
          
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* SECTION 1: Basic Information */}
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider mb-3">
              <Info className="w-4 h-4 text-rose-600" />
              <span>1. Basic Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Product Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Glowzaa Velvet Matte Liquid Lipstick - Crimson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Product Code / SKU <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. GZ-LIP-001"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Brand Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Glowzaa Cosmetics"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category <span className="text-rose-600">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setCategory(newCat);
                    const matchingDoc = categoryDocs.find(c => c.name === newCat);
                    setSubCategory(matchingDoc?.subCategories?.[0]?.name || '');
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                  required
                >
                  {categoryDocs.map((c, idx) => (
                    <option key={`modal-cat-${c.id || c.name}-${idx}`} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Sub-Category
                </label>
                {availableSubCategories.length > 0 ? (
                  <select
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                  >
                    <option value="">Select Sub-Category</option>
                    {availableSubCategories.map((s, idx) => (
                      <option key={`modal-subcat-${s.id || s.name}-${idx}`} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Lips, Serum, Shampoo"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Product Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://..."
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                  {image && (
                    <img 
                      src={image} 
                      alt="Preview" 
                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0" 
                    />
                  )}
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Ingredients, usage guidelines, features..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Catalog Status
                </label>
                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="prodStatus"
                      value="active"
                      checked={status === 'active'}
                      onChange={() => setStatus('active')}
                      className="text-rose-600"
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="prodStatus"
                      value="inactive"
                      checked={status === 'inactive'}
                      onChange={() => setStatus('inactive')}
                      className="text-rose-600"
                    />
                    <span>Inactive</span>
                  </label>
                </div>
              </div>

            </div>
          </div>

          {/* SECTION 2: Pricing */}
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider mb-3">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>2. Pricing Tiers (BDT)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Purchase Price ৳ <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  placeholder="300"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Wholesale Price ৳ <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  placeholder="500"
                  value={wholesalePrice}
                  onChange={(e) => setWholesalePrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-rose-600 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Retail MRP ৳ <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  placeholder="850"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Min Selling Price ৳
                </label>
                <input
                  type="number"
                  placeholder="480"
                  value={minSellingPrice}
                  onChange={(e) => setMinSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

            </div>
          </div>

          {/* SECTION 3: Inventory */}
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider mb-3">
              <Boxes className="w-4 h-4 text-amber-600" />
              <span>3. Inventory & Units</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Opening Stock
                </label>
                <input
                  type="number"
                  placeholder="50"
                  value={openingStock}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Number(e.target.value);
                    setOpeningStock(val);
                    setCurrentStock(val);
                  }}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Current Stock
                </label>
                <input
                  type="number"
                  placeholder="50"
                  value={currentStock}
                  onChange={(e) => setCurrentStock(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  placeholder="15"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Unit of Measure
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20 cursor-pointer"
                >
                  <option value="piece">Piece (Pcs)</option>
                  <option value="box">Box</option>
                  <option value="pack">Pack</option>
                  <option value="dozen">Dozen</option>
                  <option value="set">Set</option>
                  <option value="carton">Carton</option>
                </select>
              </div>

            </div>
          </div>

          {/* SECTION 4: Optional Specifications */}
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider mb-3">
              <Tag className="w-4 h-4 text-purple-600" />
              <span>4. Optional Details (Barcode, Size, Shade, Variant)</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Barcode / EAN
                </label>
                <input
                  type="text"
                  placeholder="89411002..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Size / Volume
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50ml, 100g"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Color / Shade
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rose Gold, 02 Nude"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Variant
                </label>
                <input
                  type="text"
                  placeholder="e.g. Matte, Dewy"
                  value={variant}
                  onChange={(e) => setVariant(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>Save Product to Firestore</span>
            </button>
          </div>

        </form>
      </Modal>

      {/* 2. EDIT PRODUCT MODAL */}
      {editingProduct && (
        <Modal
          isOpen={true}
          onClose={() => setEditingProduct(null)}
          title={`Edit Product: ${editingProduct.sku}`}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 text-left max-h-[80vh] overflow-y-auto pr-1">
            
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Product Name
              </label>
              <input
                type="text"
                value={editingProduct.name}
                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  SKU / Code
                </label>
                <input
                  type="text"
                  value={editingProduct.sku}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  value={editingProduct.brand || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value, brandName: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Purchase Price ৳
                </label>
                <input
                  type="number"
                  value={editingProduct.purchasePrice}
                  onChange={(e) => setEditingProduct({ ...editingProduct, purchasePrice: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Wholesale Price ৳
                </label>
                <input
                  type="number"
                  value={editingProduct.wholesalePrice}
                  onChange={(e) => setEditingProduct({ ...editingProduct, wholesalePrice: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-rose-600 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  MRP ৳
                </label>
                <input
                  type="number"
                  value={editingProduct.mrp}
                  onChange={(e) => setEditingProduct({ ...editingProduct, mrp: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  value={editingProduct.lowStockThreshold}
                  onChange={(e) => setEditingProduct({ ...editingProduct, lowStockThreshold: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Catalog Status
                </label>
                <select
                  value={editingProduct.status}
                  onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold"
                >
                  <option value="active">Active (Available)</option>
                  <option value="inactive">Inactive (Hidden)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Image URL
              </label>
              <input
                type="url"
                value={editingProduct.image}
                onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>

          </form>
        </Modal>
      )}

      {/* 3. STOCK ADJUSTMENT MODAL (ADMIN ONLY) */}
      {adjustingStockProd && (
        <Modal
          isOpen={true}
          onClose={() => setAdjustingStockProd(null)}
          title={`Authorized Stock Adjustment: ${adjustingStockProd.sku}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveStockAdjust} className="space-y-4 text-left">
            
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Product summary */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
              <img
                src={adjustingStockProd.image}
                alt={adjustingStockProd.name}
                className="w-12 h-12 rounded-lg object-cover border border-slate-200 bg-white"
              />
              <div className="flex-1 min-w-0">
                <span className="font-bold text-xs text-slate-900 block truncate">{adjustingStockProd.name}</span>
                <span className="text-[11px] text-slate-500 font-mono">{adjustingStockProd.sku} • {adjustingStockProd.category}</span>
                <div className="mt-1 text-xs">
                  <span className="text-slate-500">Current Stock: </span>
                  <strong className="text-slate-900">{adjustingStockProd.currentStock} {adjustingStockProd.unit}</strong>
                </div>
              </div>
            </div>

            {/* Adjustment Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Adjustment Classification
              </label>
              <select
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="audit">Physical Stock Count / Audit</option>
                <option value="stock_in">Direct Stock In / Bulk Inflow</option>
                <option value="damage">Damaged / Expired Write-off</option>
                <option value="return">Customer Return / Restoration</option>
                <option value="sample">Marketing Sample / Tester</option>
                <option value="adjustment">Other Adjustment</option>
              </select>
            </div>

            {/* Quantity Delta Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Adjustment Quantity (+ to add, - to deduct)
              </label>
              <input
                type="number"
                placeholder="e.g. +20 or -5"
                value={adjustQuantity}
                onChange={(e) => setAdjustQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                required
              />
              {adjustQuantity !== '' && (
                <p className="text-[11px] text-slate-500 mt-1">
                  New stock count will be: <strong className="text-rose-600">{Math.max(0, adjustingStockProd.currentStock + Number(adjustQuantity))} {adjustingStockProd.unit}</strong>
                </p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mandatory Audit Reason <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Describe why stock is being adjusted..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                required
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdjustingStockProd(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <span>Confirm Stock Adjustment</span>
              </button>
            </div>

          </form>
        </Modal>
      )}

      {/* 4. DELETE PRODUCT CONFIRMATION MODAL */}
      {deletingProduct && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingProduct(null)}
          title="Confirm Product Deletion"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-left">
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900">{deletingProduct.name}</strong> ({deletingProduct.sku}) from Firestore?
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
