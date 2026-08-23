import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Warehouse } from '../../types';
import { Building2, Plus, Edit, Trash2, MapPin, Phone, User, X, Save, AlertTriangle } from 'lucide-react';
import { Modal } from '../shared/Modal';

export const AdminWarehouses: React.FC = () => {
  const { addToast } = useApp();
  
  // Mocking warehouse state for now, will integrate with Firestore later
  const [warehouses, setWarehouses] = useState<Warehouse[]>([
    { id: 'wh-01', name: 'Banani Central Distribution Hub', address: 'Plot 10, Road 5, Banani', contactNumber: '+880 1700-000000', managerName: 'Karim Ahmed', status: 'active' }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  const handleSaveWarehouse = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newWarehouse: Warehouse = {
      id: editingWarehouse?.id || `wh-${Date.now()}`,
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      contactNumber: formData.get('contactNumber') as string,
      managerName: formData.get('managerName') as string,
      status: 'active',
    };

    if (editingWarehouse) {
      setWarehouses(prev => prev.map(w => w.id === editingWarehouse.id ? newWarehouse : w));
      addToast({ type: 'success', title: 'Warehouse Updated', message: 'Warehouse details updated successfully.' });
    } else {
      setWarehouses(prev => [...prev, newWarehouse]);
      addToast({ type: 'success', title: 'Warehouse Added', message: 'New warehouse added successfully.' });
    }
    
    setIsModalOpen(false);
    setEditingWarehouse(null);
  };

  const deleteWarehouse = (id: string) => {
    setWarehouses(prev => prev.filter(w => w.id !== id));
    addToast({ type: 'info', title: 'Warehouse Deleted', message: 'Warehouse removed successfully.' });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Warehouse Management</h1>
          <p className="text-sm text-slate-500">Manage your product storage facilities.</p>
        </div>
        <button
          onClick={() => { setEditingWarehouse(null); setIsModalOpen(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Warehouse
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map(wh => (
          <div key={wh.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{wh.name}</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {wh.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingWarehouse(wh); setIsModalOpen(true); }} className="text-slate-400 hover:text-slate-600"><Edit className="w-4 h-4" /></button>
                <button onClick={() => deleteWarehouse(wh.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> {wh.address}</div>
              <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> {wh.contactNumber}</div>
              <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> Manager: {wh.managerName}</div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <Modal isOpen={true} onClose={() => setIsModalOpen(false)} title={editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}>
          <form onSubmit={handleSaveWarehouse} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Warehouse Name</label>
              <input name="name" defaultValue={editingWarehouse?.name} required className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Address</label>
              <input name="address" defaultValue={editingWarehouse?.address} required className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Contact Number</label>
              <input name="contactNumber" defaultValue={editingWarehouse?.contactNumber} required className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Manager Name</label>
              <input name="managerName" defaultValue={editingWarehouse?.managerName} required className="w-full p-2 border rounded-lg" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
