import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Badge } from '../shared/Badge';
import { 
  Package, 
  Search, 
  Layers, 
  ShoppingCart, 
  DollarSign,
  Tag
} from 'lucide-react';

export const SalesProducts: React.FC = () => {
  const { products, categories, setSalesTab, formatBDT } = useApp();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (p.sku || '').toLowerCase().includes(search.toLowerCase()) ||
                          (p.category || '').toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-5">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Glowzaa Wholesale Catalog</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-[#0F766E] border border-teal-200">
              {products.length} Master SKUs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time trade prices, suggested retail MRPs, and warehouse availability for customer quoting.
          </p>
        </div>

        <button
          onClick={() => setSalesTab('create_order')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-xs shadow-2xs transition-colors cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4 text-teal-200" />
          <span>Open Order Booking Cart</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SKU, product name, or shade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all' 
                ? 'bg-slate-900 text-white shadow-2xs' 
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Categories
          </button>
          {categories.slice(0, 8).map((cat, idx) => (
            <button
              key={`cat-pill-${cat}-${idx}`}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat 
                  ? 'bg-[#0F766E] text-white shadow-2xs' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {filteredProducts.map(p => {
          const retailMargin = p.mrp - p.wholesalePrice;
          const retailMarginPct = Math.round((retailMargin / p.mrp) * 100);

          return (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between hover:border-teal-200 transition-all group">
              <div className="space-y-3">
                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-100">
                  <img 
                    src={p.image} 
                    alt={p.name} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                  <div className="absolute top-2 left-2">
                    <Badge status={p.status} size="sm" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded">
                    {p.category}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">{p.name}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">{p.sku}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">B2B Wholesale:</span>
                    <span className="font-bold text-[#0F766E] text-sm">{formatBDT(p.wholesalePrice)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Retail MRP:</span>
                    <span className="font-semibold text-slate-700">{formatBDT(p.mrp)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-emerald-700 pt-1 border-t border-slate-200">
                    <span>Retailer Profit Margin:</span>
                    <span className="font-bold">{retailMarginPct}% ({formatBDT(retailMargin)})</span>
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Warehouse Stock</span>
                  <span className="font-bold text-slate-900 text-xs">{p.currentStock} {p.unit}</span>
                </div>

                <button
                  onClick={() => setSalesTab('create_order')}
                  className="px-3 py-1.5 rounded-lg bg-[#0F766E] hover:bg-[#115E59] text-white font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Book Item</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
