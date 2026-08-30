import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { 
  PurchaseOrder, 
  PurchaseOrderItem, 
  PurchaseRequest,
  PurchaseRequestItem,
  Supplier,
  PurchaseOrderStatus
} from '../../../types';
import { Modal } from '../../shared/Modal';
import { Badge } from '../../shared/Badge';
import { 
  ShoppingBag, Search, PlusCircle, CheckCircle, 
  XCircle, Clock, Truck, FileText, Loader2, Send, Check
} from 'lucide-react';
import { 
  getPurchaseOrders,
  getPurchaseOrderItems,
  createPurchaseOrderFromRequest,
  submitPurchaseOrderForApproval,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  sendPurchaseOrderToSupplier,
  confirmSupplierPurchaseOrder,
  requestPurchaseOrderRevision,
  cancelPurchaseOrder,
  closePurchaseOrder
} from '../../../services/purchaseOrderService';
import { getPurchaseRequests, getPurchaseRequestItems, getSuppliers } from '../../../services/firestoreService';
import { GoodsReceiptForm } from './GoodsReceiptForm';

export const PurchaseOrdersDashboard: React.FC = () => {
  const { formatBDT, products } = useApp();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'requests'>('orders');
  
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const [viewingOrderItems, setViewingOrderItems] = useState<PurchaseOrderItem[]>([]);
  const [viewingRequest, setViewingRequest] = useState<PurchaseRequest | null>(null);
  const [viewingRequestItems, setViewingRequestItems] = useState<PurchaseRequestItem[]>([]);
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const fetchedOrders = await getPurchaseOrders();
      setOrders(fetchedOrders);
      
      const fetchedRequests = await getPurchaseRequests();
      setRequests(fetchedRequests);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser?.uid]);

  const handleAction = async (actionFn: () => Promise<{ success: boolean; error?: string }>, successMsg: string) => {
    setActionLoading(true);
    try {
      const res = await actionFn();
      if (res.success) {
        alert(successMsg);
        setViewingOrder(null);
        fetchData();
      } else {
        alert('Error: ' + res.error);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePO = async (requestId: string) => {
    if (!currentUser) return;
    setActionLoading(true);
    try {
      const res = await createPurchaseOrderFromRequest(requestId, currentUser);
      if (res.success) {
        alert('PO Created Successfully!');
        setViewingRequest(null);
        setActiveTab('orders');
        fetchData();
      } else {
        alert('Error creating PO: ' + res.error);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const loadOrderDetails = async (order: PurchaseOrder) => {
    setViewingOrder(order);
    const items = await getPurchaseOrderItems(order.id);
    setViewingOrderItems(items);
  };
  
  const loadRequestDetails = async (req: PurchaseRequest) => {
    setViewingRequest(req);
    const items = await getPurchaseRequestItems(req.id);
    setViewingRequestItems(items);
  };

  const filteredOrders = orders.filter(o => 
    (statusFilter === 'all' || o.status === statusFilter) &&
    (o.poNumber.toLowerCase().includes(search.toLowerCase()) || 
     o.supplierName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-[#0F766E]" />
            Procurement Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage purchase requests and supplier purchase orders.</p>
        </div>
        <div className="flex bg-slate-200 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'orders' ? 'bg-white text-[#0F766E] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Purchase Orders
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'requests' ? 'bg-white text-[#0F766E] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Purchase Requests
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-[#0F766E] animate-spin" />
        </div>
      ) : activeTab === 'orders' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total POs</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{orders.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Pending Approval</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{orders.filter(o => o.status === 'pending_approval').length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">In Transit</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{orders.filter(o => o.status === 'in_transit').length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Value</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{formatBDT(orders.reduce((sum, o) => sum + o.totalAmountBDT, 0))}</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search PO or supplier..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="sent_to_supplier">Sent</option>
              <option value="supplier_confirmed">Confirmed</option>
              <option value="in_transit">In Transit</option>
              <option value="received">Received</option>
            </select>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">PO Number</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">No purchase orders found</td>
                    </tr>
                  ) : filteredOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{order.poNumber}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{order.supplierName}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">{formatBDT(order.totalAmountBDT)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          order.status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
                          order.status === 'draft' ? 'bg-slate-100 text-slate-800' :
                          order.status === 'rejected' || order.status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {order.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 text-right">
                        <button 
                          onClick={() => loadOrderDetails(order)}
                          className="text-xs font-semibold text-[#0F766E] hover:text-[#085d56]"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Request #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{req.requestNumber}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{req.supplierName || '-'}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{formatBDT(req.totalEstimatedAmountBDT)}</td>
                    <td className="py-3 px-4">
                      <Badge status={req.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={() => loadRequestDetails(req)}
                        className="text-xs font-semibold text-[#0F766E] hover:text-[#085d56]"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PO Details Modal */}
      <Modal isOpen={!!viewingOrder} onClose={() => !actionLoading && setViewingOrder(null)} title={`Purchase Order: ${viewingOrder?.poNumber}`} maxWidth="4xl">
        {viewingOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Supplier</p>
                <p className="font-bold text-slate-900 mt-1">{viewingOrder.supplierName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Status</p>
                <p className="font-bold text-slate-900 mt-1 uppercase text-[#0F766E]">{viewingOrder.status.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Total Amount</p>
                <p className="font-bold text-slate-900 mt-1">{formatBDT(viewingOrder.totalAmountBDT)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Created By</p>
                <p className="font-bold text-slate-900 mt-1">{viewingOrder.createdByUserName}</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 mb-3 border-b pb-2">Line Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3 text-right">Ordered Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingOrderItems.map(item => (
                      <tr key={item.id}>
                        <td className="py-2 px-3 font-medium text-slate-800">{item.productName}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{item.orderedQuantity}</td>
                        <td className="py-2 px-3 text-right text-slate-600">{formatBDT(item.unitPurchasePriceBDT)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{formatBDT(item.totalLineAmountBDT)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {currentUser && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                {viewingOrder.status === 'draft' && (
                  <button 
                    onClick={() => handleAction(() => submitPurchaseOrderForApproval(viewingOrder.id, currentUser), 'Submitted for approval!')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-amber-700 disabled:opacity-50"
                  >
                    Submit for Approval
                  </button>
                )}
                {viewingOrder.status === 'pending_approval' && currentUser.role === 'admin' && viewingOrder.createdByUserId !== (currentUser.uid || currentUser.id) && (
                  <button 
                    onClick={() => handleAction(() => approvePurchaseOrder(viewingOrder.id, currentUser), 'PO Approved!')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Approve PO
                  </button>
                )}
                {viewingOrder.status === 'approved' && currentUser.role === 'admin' && (
                  <button 
                    onClick={() => handleAction(() => sendPurchaseOrderToSupplier(viewingOrder.id, currentUser), 'Marked as Sent!')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    Mark Sent to Supplier
                  </button>
                )}
                {viewingOrder.status === 'sent_to_supplier' && currentUser.role === 'admin' && (
                  <button 
                    onClick={() => handleAction(() => confirmSupplierPurchaseOrder(viewingOrder.id, currentUser), 'Supplier confirmed!')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#0F766E] text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-[#0d645d] flex items-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Record Supplier Confirmation
                  </button>
                )}
                {['supplier_confirmed', 'in_transit', 'partially_received'].includes(viewingOrder.status) && currentUser.role === 'admin' && (
                  <button 
                    onClick={() => {
                      setViewingOrder(null);
                      setReceivingOrder(viewingOrder);
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Truck className="w-4 h-4" />
                    Receive Goods
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* PR Details Modal */}
      <Modal isOpen={!!viewingRequest} onClose={() => !actionLoading && setViewingRequest(null)} title={`Purchase Request: ${viewingRequest?.requestNumber}`} maxWidth="3xl">
        {viewingRequest && (
          <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
               <div>
                 <p className="text-xs text-slate-500 font-semibold uppercase">Status</p>
                 <p className="font-bold text-slate-900 mt-1 uppercase">{viewingRequest.status}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500 font-semibold uppercase">Est. Amount</p>
                 <p className="font-bold text-slate-900 mt-1">{formatBDT(viewingRequest.totalEstimatedAmountBDT)}</p>
               </div>
             </div>
             
             {viewingRequest.status === 'approved' && (
               <div className="pt-4 border-t border-slate-200 flex justify-end">
                 <button 
                   onClick={() => handleCreatePO(viewingRequest.id)}
                   disabled={actionLoading}
                   className="px-6 py-2 bg-[#0F766E] text-white font-bold rounded-lg shadow-sm hover:bg-[#0d645d] disabled:opacity-50 flex items-center gap-2"
                 >
                   {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                   Convert to Purchase Order
                 </button>
               </div>
             )}
          </div>
        )}
      </Modal>
      {receivingOrder && (
        <GoodsReceiptForm 
          purchaseOrder={receivingOrder}
          onClose={() => setReceivingOrder(null)}
          onSuccess={() => {
            setReceivingOrder(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};
