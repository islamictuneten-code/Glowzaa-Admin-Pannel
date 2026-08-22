import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CategoryDoc, SubCategory } from '../../types';
import { 
  Layers, 
  PlusCircle, 
  Package, 
  ArrowUpRight, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Tag, 
  Plus, 
  X,
  AlertCircle,
  FolderPlus,
  ArrowRight
} from 'lucide-react';
import { Modal } from '../shared/Modal';

export const AdminCategories: React.FC = () => {
  const { 
    categoryDocs, 
    products, 
    createCategory, 
    updateCategory, 
    toggleCategoryStatus, 
    deleteCategory, 
    setAdminTab, 
    formatBDT,
    isCategoriesLoading 
  } = useApp();

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDoc | null>(null);
  const [managingSubCatCategory, setManagingSubCatCategory] = useState<CategoryDoc | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryDoc | null>(null);

  // Add category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatStatus, setNewCatStatus] = useState<'active' | 'inactive'>('active');
  const [newSubCats, setNewSubCats] = useState<string[]>([]);
  const [subCatInput, setSubCatInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick subcategory adder in modal
  const [quickSubName, setQuickSubName] = useState('');

  // Handle adding subcategory chip to new category form
  const handleAddSubCatChip = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    if (!subCatInput.trim()) return;
    if (!newSubCats.includes(subCatInput.trim())) {
      setNewSubCats([...newSubCats, subCatInput.trim()]);
    }
    setSubCatInput('');
  };

  const handleRemoveSubCatChip = (name: string) => {
    setNewSubCats(newSubCats.filter(s => s !== name));
  };

  // Submit Create Category to Firestore
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newCatName.trim()) {
      setFormError('Category name is required.');
      return;
    }

    setIsSubmitting(true);
    const subCategories: SubCategory[] = newSubCats.map(name => ({
      id: `sub-${Math.random().toString(36).substring(2, 8)}`,
      name: name.trim(),
      slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      status: 'active'
    }));

    const res = await createCategory({
      name: newCatName.trim(),
      description: newCatDesc.trim(),
      status: newCatStatus,
      subCategories
    });

    setIsSubmitting(false);

    if (res.success) {
      setNewCatName('');
      setNewCatDesc('');
      setNewSubCats([]);
      setNewCatStatus('active');
      setIsAddModalOpen(false);
    } else {
      setFormError(res.error || 'Failed to create category.');
    }
  };

  // Submit Edit Category
  const handleSaveEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!editingCategory.name.trim()) return;

    setIsSubmitting(true);
    const res = await updateCategory(editingCategory.id, {
      name: editingCategory.name.trim(),
      description: editingCategory.description?.trim() || '',
      status: editingCategory.status
    });
    setIsSubmitting(false);

    if (res.success) {
      setEditingCategory(null);
    }
  };

  // Add SubCategory to an existing Category
  const handleAddSubCategoryToCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingSubCatCategory || !quickSubName.trim()) return;

    const currentSubCats = managingSubCatCategory.subCategories || [];
    const newSub: SubCategory = {
      id: `sub-${Date.now()}`,
      name: quickSubName.trim(),
      slug: quickSubName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      status: 'active'
    };

    const updatedList = [...currentSubCats, newSub];
    const res = await updateCategory(managingSubCatCategory.id, {
      subCategories: updatedList
    });

    if (res.success) {
      setManagingSubCatCategory({
        ...managingSubCatCategory,
        subCategories: updatedList
      });
      setQuickSubName('');
    }
  };

  // Toggle SubCategory Status
  const handleToggleSubCategoryStatus = async (subId: string) => {
    if (!managingSubCatCategory) return;
    const currentSubCats = managingSubCatCategory.subCategories || [];
    const updated = currentSubCats.map(sub => {
      if (sub.id === subId) {
        return { ...sub, status: sub.status === 'active' ? 'inactive' : 'active' as 'active' | 'inactive' };
      }
      return sub;
    });

    const res = await updateCategory(managingSubCatCategory.id, {
      subCategories: updated
    });

    if (res.success) {
      setManagingSubCatCategory({
        ...managingSubCatCategory,
        subCategories: updated
      });
    }
  };

  // Remove SubCategory from existing category
  const handleRemoveSubCategoryFromCategory = async (subId: string) => {
    if (!managingSubCatCategory) return;
    const currentSubCats = managingSubCatCategory.subCategories || [];
    const updated = currentSubCats.filter(sub => sub.id !== subId);

    const res = await updateCategory(managingSubCatCategory.id, {
      subCategories: updated
    });

    if (res.success) {
      setManagingSubCatCategory({
        ...managingSubCatCategory,
        subCategories: updated
      });
    }
  };

  // Delete Category confirmation
  const handleConfirmDelete = async () => {
    if (!deletingCategory) return;
    setIsSubmitting(true);
    await deleteCategory(deletingCategory.id);
    setIsSubmitting(false);
    setDeletingCategory(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Category & Sub-Category Management</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {categoryDocs.length} Firestore Categories
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Organize Glowzaa beauty and skincare catalog hierarchy, configure sub-categories, and monitor inventory distribution.
          </p>
        </div>

        <button
          onClick={() => {
            setNewCatName('');
            setNewCatDesc('');
            setNewSubCats([]);
            setNewCatStatus('active');
            setFormError(null);
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      {isCategoriesLoading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-2 border-rose-600/30 border-t-rose-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading categories from Firestore...</p>
        </div>
      ) : categoryDocs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Categories Found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">Click below to create your first product category in Firestore.</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-rose-600 text-white font-semibold text-xs rounded-xl shadow-xs"
          >
            Create Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {categoryDocs.map((cat, catIdx) => {
            const catProducts = products.filter(p => p.category === cat.name || p.categoryId === cat.id);
            const totalStock = catProducts.reduce((sum, p) => sum + (p.currentStock || 0), 0);
            const stockValuation = catProducts.reduce((sum, p) => sum + ((p.currentStock || 0) * (p.purchasePrice || 0)), 0);
            const lowStockCount = catProducts.filter(p => p.stockStatus === 'low_stock' || p.stockStatus === 'out_of_stock').length;
            const subCats = cat.subCategories || [];

            return (
              <div 
                key={`cat-card-${cat.id || cat.slug || cat.name}-${catIdx}`}
                className={`bg-white rounded-2xl border ${cat.status === 'active' ? 'border-slate-200' : 'border-slate-300 bg-slate-50/50 opacity-80'} p-5 shadow-xs hover:border-rose-300 transition-all flex flex-col justify-between`}
              >
                <div>
                  
                  {/* Card Header: Icon, Name & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-bold shrink-0">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-tight">{cat.name}</h3>
                        <span className="text-[11px] text-slate-400">
                          {cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleCategoryStatus(cat.id, cat.status)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                          cat.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                        title="Click to toggle Active / Inactive"
                      >
                        {cat.status.toUpperCase()}
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {cat.description && (
                    <p className="text-xs text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  )}

                  {/* Sub-categories Section */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Sub-Categories ({subCats.length})
                      </span>
                      <button
                        onClick={() => setManagingSubCatCategory(cat)}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Manage</span>
                      </button>
                    </div>

                    {subCats.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No sub-categories assigned yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {subCats.slice(0, 4).map((sub, subIdx) => (
                          <span 
                            key={`sub-${sub.id || sub.slug || sub.name}-${subIdx}`}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                              sub.status === 'active' 
                                ? 'bg-slate-50 border-slate-200 text-slate-700' 
                                : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                            }`}
                          >
                            {sub.name}
                          </span>
                        ))}
                        {subCats.length > 4 && (
                          <span className="text-[10px] font-semibold text-slate-500 px-1 py-0.5">
                            +{subCats.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Inventory & Valuation Stats */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Products in Catalog:</span>
                      <span className="font-bold text-slate-900">{catProducts.length} SKUs</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Warehouse Units:</span>
                      <span className="font-bold text-slate-900">{totalStock} units</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Stock Valuation (Cost):</span>
                      <span className="font-bold text-emerald-600">{formatBDT(stockValuation)}</span>
                    </div>
                    {lowStockCount > 0 && (
                      <div className="flex justify-between text-amber-600 font-semibold">
                        <span>Low Stock Warnings:</span>
                        <span>{lowStockCount} items</span>
                      </div>
                    )}
                  </div>

                </div>

                {/* Card Actions Footer */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingCategory(cat)}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Edit Category"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setManagingSubCatCategory(cat)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Add / Edit Sub-Categories"
                    >
                      <Tag className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingCategory(cat)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => setAdminTab('products')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    <span>View SKUs</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 1. ADD CATEGORY MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Product Category"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateCategory} className="space-y-4 text-left">
          
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Category Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Organic Sunscreen & Care"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              placeholder="Brief description of product types in this category..."
              rows={2}
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 font-medium"
            />
          </div>

          {/* Sub-categories input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Initial Sub-Categories
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                placeholder="Type subcategory name and click Add"
                value={subCatInput}
                onChange={(e) => setSubCatInput(e.target.value)}
                onKeyDown={handleAddSubCatChip}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
              <button
                type="button"
                onClick={handleAddSubCatChip}
                className="px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 cursor-pointer"
              >
                Add Sub
              </button>
            </div>

            {newSubCats.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-100">
                {newSubCats.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 shadow-xs"
                  >
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubCatChip(name)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Initial Status
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={newCatStatus === 'active'}
                  onChange={() => setNewCatStatus('active')}
                  className="text-rose-600"
                />
                <span>Active (Available in catalog)</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={newCatStatus === 'inactive'}
                  onChange={() => setNewCatStatus('inactive')}
                  className="text-rose-600"
                />
                <span>Inactive (Hidden)</span>
              </label>
            </div>
          </div>

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
              <span>Save to Firestore</span>
            </button>
          </div>

        </form>
      </Modal>

      {/* 2. EDIT CATEGORY MODAL */}
      {editingCategory && (
        <Modal
          isOpen={true}
          onClose={() => setEditingCategory(null)}
          title={`Edit Category: ${editingCategory.name}`}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSaveEditCategory} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Category Name
              </label>
              <input
                type="text"
                value={editingCategory.name}
                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                rows={2}
                value={editingCategory.description || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Category Status
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="editStatus"
                    value="active"
                    checked={editingCategory.status === 'active'}
                    onChange={() => setEditingCategory({ ...editingCategory, status: 'active' })}
                    className="text-rose-600"
                  />
                  <span>Active</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="editStatus"
                    value="inactive"
                    checked={editingCategory.status === 'inactive'}
                    onChange={() => setEditingCategory({ ...editingCategory, status: 'inactive' })}
                    className="text-rose-600"
                  />
                  <span>Inactive</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
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
                <span>Update Category</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 3. MANAGE SUB-CATEGORIES MODAL */}
      {managingSubCatCategory && (
        <Modal
          isOpen={true}
          onClose={() => setManagingSubCatCategory(null)}
          title={`Sub-Categories for: ${managingSubCatCategory.name}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-5 text-left">
            
            {/* Add new subcategory form */}
            <form onSubmit={handleAddSubCategoryToCategory} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter sub-category title (e.g. Lip Balms, SPF 50+)"
                value={quickSubName}
                onChange={(e) => setQuickSubName(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-medium"
              />
              <button
                type="submit"
                disabled={!quickSubName.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
              >
                Add Sub
              </button>
            </form>

            {/* Existing Sub-Categories List */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Sub-Categories ({managingSubCatCategory.subCategories?.length || 0})
              </span>

              {(!managingSubCatCategory.subCategories || managingSubCatCategory.subCategories.length === 0) ? (
                <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  No sub-categories defined yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                  {managingSubCatCategory.subCategories.map((sub, subIdx) => (
                    <div key={`sub-manage-${sub.id || sub.slug || sub.name}-${subIdx}`} className="p-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{sub.name}</span>
                          <span className="text-[10px] text-slate-400">{sub.slug}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleSubCategoryStatus(sub.id)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer ${
                            sub.status === 'active' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {sub.status.toUpperCase()}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubCategoryFromCategory(sub.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Remove subcategory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setManagingSubCatCategory(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </Modal>
      )}

      {/* 4. DELETE CATEGORY CONFIRMATION MODAL */}
      {deletingCategory && (
        <Modal
          isOpen={true}
          onClose={() => setDeletingCategory(null)}
          title="Confirm Category Deletion"
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-left">
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900">{deletingCategory.name}</strong> from Firestore? Products assigned to this category will remain in the catalog.
            </p>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
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
                {isSubmitting ? 'Deleting...' : 'Delete Category'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
