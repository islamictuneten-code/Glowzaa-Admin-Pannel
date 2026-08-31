import React, { useState } from 'react';
import { Truck, User, MapPin, Building2, AlertCircle } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { Order } from '../../types';
import { useApp } from '../../context/AppContext';

interface AssignDeliveryModalProps {
  order: Order;
  onClose: () => void;
}

export const AssignDeliveryModal: React.FC<AssignDeliveryModalProps> = ({ order, onClose }) => {
  const { deliveryStaff, assignDeliveryToOrder } = useApp();

  const availableStaff = deliveryStaff.length > 0 ? [...deliveryStaff].sort((a, b) => {
    const statusOrder: Record<string, number> = { on_duty: 0, available: 1, active: 2, off_duty: 3 };
    return (statusOrder[a.status || ''] ?? 9) - (statusOrder[b.status || ''] ?? 9);
  }) : [];

  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    order.deliveryStaffId || (availableStaff.length > 0 ? availableStaff[0].id : '')
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId) {
      setError('Please select a delivery courier.');
      return;
    }

    const driver = availableStaff.find(
      d => d.id === selectedDriverId || (d as any).uid === selectedDriverId || d.staffId === selectedDriverId
    );
    if (!driver) {
      setError('Selected delivery staff not found.');
      return;
    }

    setIsSubmitting(true);
    try {
      await assignDeliveryToOrder(order.id, driver.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign delivery staff.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Assign Delivery Driver for #${order.orderNumber}`}
      subtitle={`Destination: ${order.shopName} (${order.area}, ${order.district})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <div>
          <label className="font-semibold text-slate-700 block mb-1">
            Select Delivery Courier *
          </label>
          <select
            value={selectedDriverId}
            onChange={e => {
              setSelectedDriverId(e.target.value);
              if (error) setError(null);
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-purple-500"
          >
            {availableStaff.length === 0 ? (
              <option value="">No Drivers Available</option>
            ) : (
              availableStaff.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} — Vehicle: {d.vehicleNumber || 'Unassigned'} ({(d.assignedZones || [d.assignedArea || 'All Zones']).join(', ')}) [{d.status || 'active'}]
                </option>
              ))
            )}
          </select>
        </div>

        <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 space-y-1 text-purple-900">
          <span className="font-bold block flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-purple-600" />
            Dispatch Metadata Update
          </span>
          <p className="text-purple-800/90 text-[11px] leading-relaxed">
            Assigning a courier logs <code className="font-mono font-bold bg-purple-100 px-1 py-0.5 rounded">assignedAt</code>, <code className="font-mono font-bold bg-purple-100 px-1 py-0.5 rounded">assignedBy</code>, and appends a record to the Firestore delivery history log.
          </p>
        </div>

        <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedDriverId}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? 'Assigning...' : 'Assign Courier'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
