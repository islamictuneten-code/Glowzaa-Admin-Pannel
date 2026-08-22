import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { AuthUser, UserRole, AuditLog } from '../../types';
import { 
  fetchStaffUsers, 
  createStaffAccount, 
  updateStaffProfile, 
  toggleStaffStatus, 
  resetStaffPasswordDirectly, 
  fetchAuditLogs 
} from '../../services/staffAuthService';
import { uploadStaffProfilePhoto, validateImageFile } from '../../services/storageService';
import { UserAvatar } from '../shared/UserAvatar';
import { 
  Users, 
  UserCheck, 
  Truck, 
  Phone, 
  MapPin, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  Receipt,
  UserPlus,
  Key,
  Lock,
  Edit3,
  Eye,
  EyeOff,
  Search,
  Filter,
  Copy,
  Check,
  RefreshCw,
  UserX,
  FileText,
  AlertCircle,
  ShieldAlert,
  Calendar,
  Sparkles,
  X,
  ChevronRight,
  Activity,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';

export const AdminStaff: React.FC = () => {
  const { salesStaff, deliveryStaff, handoverDeliveryCash, formatBDT, addToast } = useApp();
  const { currentUser: activeAdminUser } = useAuth();

  // Active view mode: 'accounts' | 'sales_performance' | 'delivery_fleet' | 'audit_logs'
  const [activeTab, setActiveTab] = useState<'accounts' | 'sales_performance' | 'delivery_fleet' | 'audit_logs'>('accounts');

  // Staff users state from Firestore
  const [staffUsers, setStaffUsers] = useState<AuthUser[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'sales' | 'delivery'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [selectedStaff, setSelectedStaff] = useState<AuthUser | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    loginId: '',
    password: '',
    role: 'sales' as UserRole,
    phone: '',
    email: '',
    title: '',
    department: '',
    staffId: '',
    territory: 'Gulshan & Banani, Dhaka',
    monthlyTarget: 150000,
    commissionRate: 3.5,
    vehicleType: 'Motorcycle',
    vehicleNumber: 'Dhaka Metro HA-12-3456',
    assignedZones: 'Dhanmondi, Mohammadpur, Mirpur'
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState<boolean>(false);
  const [showCreatedCredentials, setShowCreatedCredentials] = useState<{ loginId: string; pass: string; name: string; role: string } | null>(null);

  // Profile Photo state for Create Form
  const [createPhotoFile, setCreatePhotoFile] = useState<File | null>(null);
  const [createPhotoPreview, setCreatePhotoPreview] = useState<string | null>(null);
  const [createPhotoError, setCreatePhotoError] = useState<string | null>(null);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    title: '',
    department: '',
    territory: '',
    monthlyTarget: 150000,
    commissionRate: 3.5,
    vehicleType: 'Motorcycle',
    vehicleNumber: '',
    assignedZones: ''
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Profile Photo state for Edit Form
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [editPhotoError, setEditPhotoError] = useState<string | null>(null);
  const [editPhotoRemoved, setEditPhotoRemoved] = useState<boolean>(false);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset Password State
  const [newPassword, setNewPassword] = useState<string>('');
  const [isSubmittingReset, setIsSubmittingReset] = useState<boolean>(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [showPasswordText, setShowPasswordText] = useState<boolean>(false);

  // Copied helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Fetch staff users on load
  const loadStaffList = async () => {
    setIsLoadingStaff(true);
    try {
      const users = await fetchStaffUsers();
      // If users is empty, synthesize from existing salesStaff and deliveryStaff for smooth first-time view
      if (users.length === 0 && (salesStaff.length > 0 || deliveryStaff.length > 0)) {
        const synthesized: AuthUser[] = [
          {
            uid: 'admin-master',
            id: 'admin-master',
            loginId: 'admin',
            name: activeAdminUser?.name || 'Glowzaa Admin',
            email: activeAdminUser?.email || 'admin@glowzaa.com',
            phone: '01711000000',
            role: 'admin',
            status: 'active',
            createdAt: new Date().toISOString(),
            avatar: 'GA',
            title: 'Head of Operations & System Admin',
            department: 'Executive HQ'
          },
          ...salesStaff.map((s, idx) => ({
            uid: `sales-${s.id}`,
            id: `sales-${s.id}`,
            loginId: `seller0${idx + 1}`,
            name: s.name,
            email: `seller0${idx + 1}@glowzaa.local`,
            phone: s.phone,
            role: 'sales' as UserRole,
            status: s.status as 'active' | 'inactive',
            createdAt: new Date().toISOString(),
            avatar: s.avatar,
            title: 'Field Sales Executive',
            department: 'Field Sales & Accounts',
            salesStaffId: s.id,
            territory: s.territory,
            monthlyTarget: s.monthlyTarget,
            commissionRate: s.commissionRate
          })),
          ...deliveryStaff.map((d, idx) => ({
            uid: `delivery-${d.id}`,
            id: `delivery-${d.id}`,
            loginId: `delivery0${idx + 1}`,
            name: d.name,
            email: `delivery0${idx + 1}@glowzaa.local`,
            phone: d.phone,
            role: 'delivery' as UserRole,
            status: d.status as 'active' | 'inactive',
            createdAt: new Date().toISOString(),
            avatar: d.avatar,
            title: 'Delivery Courier & Dispatch',
            department: 'Logistics Fleet',
            deliveryStaffId: d.id,
            vehicleNumber: d.vehicleNumber,
            vehicleType: d.vehicleType,
            assignedZones: d.assignedZones || [d.assignedArea || 'Dhaka Metro']
          }))
        ];
        setStaffUsers(synthesized);
      } else {
        setStaffUsers(users);
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const loadAuditHistory = async () => {
    setIsLoadingAudit(true);
    try {
      const logs = await fetchAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    loadStaffList();
  }, []);

  useEffect(() => {
    if (activeTab === 'audit_logs') {
      loadAuditHistory();
    }
  }, [activeTab]);

  // Photo Upload Handlers for Create
  const handleCreatePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCreatePhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setCreatePhotoError(validation.error || 'Invalid image file.');
      if (createFileInputRef.current) createFileInputRef.current.value = '';
      return;
    }

    setCreatePhotoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setCreatePhotoPreview(previewUrl);
  };

  const handleClearCreatePhoto = () => {
    if (createPhotoPreview) URL.revokeObjectURL(createPhotoPreview);
    setCreatePhotoFile(null);
    setCreatePhotoPreview(null);
    setCreatePhotoError(null);
    if (createFileInputRef.current) createFileInputRef.current.value = '';
  };

  // Photo Upload Handlers for Edit
  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setEditPhotoError(validation.error || 'Invalid image file.');
      if (editFileInputRef.current) editFileInputRef.current.value = '';
      return;
    }

    setEditPhotoFile(file);
    setEditPhotoRemoved(false);
    const previewUrl = URL.createObjectURL(file);
    setEditPhotoPreview(previewUrl);
  };

  const handleRemoveEditPhoto = () => {
    if (editPhotoPreview) URL.revokeObjectURL(editPhotoPreview);
    setEditPhotoFile(null);
    setEditPhotoPreview(null);
    setEditPhotoError(null);
    setEditPhotoRemoved(true);
    if (editFileInputRef.current) editFileInputRef.current.value = '';
  };

  // Handle Create Staff
  const handleOpenCreateModal = (presetRole?: UserRole) => {
    const nextRole = presetRole || 'sales';
    const rolePrefix = nextRole === 'sales' ? 'seller' : nextRole === 'delivery' ? 'delivery' : 'admin';
    const count = staffUsers.filter(u => u.role === nextRole).length + 1;
    const pad = count < 10 ? `0${count}` : `${count}`;
    const suggestedLoginId = `${rolePrefix}${pad}`;

    setCreateForm({
      name: '',
      loginId: suggestedLoginId,
      password: 'Glowzaa@2026',
      role: nextRole,
      phone: '',
      email: `${suggestedLoginId}@glowzaa.local`,
      title: nextRole === 'sales' ? 'Field Sales Executive' : nextRole === 'delivery' ? 'Logistics Delivery Courier' : 'Operations Admin',
      department: nextRole === 'sales' ? 'Wholesale Field Sales' : nextRole === 'delivery' ? 'Logistics & Fleet' : 'Executive Operations',
      staffId: nextRole === 'sales' ? `SLS-${pad}` : nextRole === 'delivery' ? `DLV-${pad}` : `ADM-${pad}`,
      territory: 'Gulshan, Banani, Mohakhali',
      monthlyTarget: 180000,
      commissionRate: 3.5,
      vehicleType: 'Motorcycle',
      vehicleNumber: 'Dhaka Metro HA-12-3456',
      assignedZones: 'Dhanmondi, Mohammadpur, Mirpur'
    });
    handleClearCreatePhoto();
    setCreateError(null);
    setShowCreatedCredentials(null);
    setIsCreateModalOpen(true);
  };

  const handleRoleChangeInCreate = (newRole: UserRole) => {
    const rolePrefix = newRole === 'sales' ? 'seller' : newRole === 'delivery' ? 'delivery' : 'admin';
    const count = staffUsers.filter(u => u.role === newRole).length + 1;
    const pad = count < 10 ? `0${count}` : `${count}`;
    const suggestedLoginId = `${rolePrefix}${pad}`;

    setCreateForm(prev => ({
      ...prev,
      role: newRole,
      loginId: suggestedLoginId,
      email: `${suggestedLoginId}@glowzaa.local`,
      title: newRole === 'sales' ? 'Field Sales Executive' : newRole === 'delivery' ? 'Logistics Delivery Courier' : 'Operations Admin',
      department: newRole === 'sales' ? 'Wholesale Field Sales' : newRole === 'delivery' ? 'Logistics & Fleet' : 'Executive Operations',
      staffId: newRole === 'sales' ? `SLS-${pad}` : newRole === 'delivery' ? `DLV-${pad}` : `ADM-${pad}`
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createForm.name.trim()) {
      setCreateError('Staff full name is required.');
      return;
    }
    if (!createForm.loginId.trim()) {
      setCreateError('Login ID / Username is required.');
      return;
    }
    if (!createForm.password || createForm.password.length < 6) {
      setCreateError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmittingCreate(true);

    try {
      const zonesArray = createForm.role === 'delivery' && typeof createForm.assignedZones === 'string'
        ? createForm.assignedZones.split(',').map(z => z.trim()).filter(Boolean)
        : undefined;

      const res = await createStaffAccount(
        {
          name: createForm.name.trim(),
          loginId: createForm.loginId.trim(),
          password: createForm.password,
          role: createForm.role,
          phone: createForm.phone.trim(),
          email: createForm.email.trim(),
          title: createForm.title.trim(),
          department: createForm.department.trim(),
          staffId: createForm.staffId.trim(),
          territory: createForm.role === 'sales' ? createForm.territory.trim() : undefined,
          monthlyTarget: createForm.role === 'sales' ? Number(createForm.monthlyTarget) : undefined,
          commissionRate: createForm.role === 'sales' ? Number(createForm.commissionRate) : undefined,
          vehicleType: createForm.role === 'delivery' ? createForm.vehicleType : undefined,
          vehicleNumber: createForm.role === 'delivery' ? createForm.vehicleNumber.trim() : undefined,
          assignedZones: zonesArray
        },
        activeAdminUser?.uid || 'admin',
        activeAdminUser?.name || 'Administrator'
      );

      if (res.success && res.user) {
        // If photo was selected, upload to Firebase Storage and attach download URL to Firestore profile
        if (createPhotoFile) {
          try {
            const uploadRes = await uploadStaffProfilePhoto(
              createPhotoFile, 
              res.user.uid, 
              activeAdminUser?.uid || 'admin'
            );
            if (uploadRes.success && uploadRes.downloadURL) {
              await updateStaffProfile(
                res.user.uid,
                { photoURL: uploadRes.downloadURL },
                activeAdminUser?.uid || 'admin',
                activeAdminUser?.name || 'Administrator',
                createForm.loginId.trim()
              );
            }
          } catch (uploadErr) {
            console.error('Failed to upload profile photo:', uploadErr);
          }
        }

        setShowCreatedCredentials({
          loginId: createForm.loginId.trim(),
          pass: createForm.password,
          name: createForm.name.trim(),
          role: createForm.role
        });
        addToast({
          type: 'success',
          title: 'Staff Account Created',
          message: `Account for ${createForm.name} (${createForm.loginId}) is active and ready for login.`
        });
        loadStaffList();
      } else {
        setCreateError(res.error || 'Failed to create staff account.');
      }
    } catch (err: any) {
      console.error('Error in handleCreateSubmit:', err);
      setCreateError(err?.message || 'An unexpected error occurred while creating staff account.');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Handle Toggle Status
  const handleToggleStatus = async (staff: AuthUser) => {
    const newStatus = staff.status === 'active' ? 'inactive' : 'active';
    const actionName = newStatus === 'active' ? 'Enabled' : 'Disabled';

    const res = await toggleStaffStatus(
      staff.uid,
      newStatus,
      activeAdminUser?.uid || 'admin',
      activeAdminUser?.name || 'Administrator',
      staff.loginId || staff.email
    );

    if (res.success) {
      setStaffUsers(prev => prev.map(u => u.uid === staff.uid ? { ...u, status: newStatus } : u));
      addToast({
        type: newStatus === 'active' ? 'success' : 'warning',
        title: `Account ${actionName}`,
        message: `${staff.name}'s account is now ${newStatus}. ${newStatus === 'inactive' ? 'Login access is immediately blocked.' : 'Staff can now log in.'}`
      });
    } else {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: res.error || 'Failed to change staff account status.'
      });
    }
  };

  // Handle Edit Staff
  const handleOpenEditModal = (staff: AuthUser) => {
    setSelectedStaff(staff);
    setEditPhotoFile(null);
    setEditPhotoPreview(null);
    setEditPhotoError(null);
    setEditPhotoRemoved(false);
    if (editFileInputRef.current) editFileInputRef.current.value = '';

    setEditForm({
      name: staff.name,
      phone: staff.phone || '',
      title: staff.title || '',
      department: staff.department || '',
      territory: staff.territory || '',
      monthlyTarget: staff.monthlyTarget || 150000,
      commissionRate: staff.commissionRate || 3.5,
      vehicleType: staff.vehicleType || 'Motorcycle',
      vehicleNumber: staff.vehicleNumber || '',
      assignedZones: (staff.assignedZones || []).join(', ')
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setEditError(null);

    if (!editForm.name.trim()) {
      setEditError('Staff name cannot be empty.');
      return;
    }

    setIsSubmittingEdit(true);

    try {
      let updatedPhotoURL: string | undefined = undefined;

      // 1. If new photo was selected, compress & upload to Firebase Storage
      if (editPhotoFile) {
        const uploadRes = await uploadStaffProfilePhoto(
          editPhotoFile,
          selectedStaff.uid,
          activeAdminUser?.uid || 'admin'
        );
        if (uploadRes.success && uploadRes.downloadURL) {
          updatedPhotoURL = uploadRes.downloadURL;
        } else {
          setEditError(uploadRes.error || 'Failed to upload profile photo to storage.');
          return;
        }
      } else if (editPhotoRemoved) {
        // Photo explicitly removed
        updatedPhotoURL = '';
      }

      const zonesArray = selectedStaff.role === 'delivery' 
        ? editForm.assignedZones.split(',').map(z => z.trim()).filter(Boolean)
        : undefined;

      const res = await updateStaffProfile(
        selectedStaff.uid,
        {
          name: editForm.name.trim(),
          phone: editForm.phone.trim(),
          title: editForm.title.trim(),
          department: editForm.department.trim(),
          territory: selectedStaff.role === 'sales' ? editForm.territory.trim() : undefined,
          monthlyTarget: selectedStaff.role === 'sales' ? Number(editForm.monthlyTarget) : undefined,
          commissionRate: selectedStaff.role === 'sales' ? Number(editForm.commissionRate) : undefined,
          vehicleType: selectedStaff.role === 'delivery' ? editForm.vehicleType : undefined,
          vehicleNumber: selectedStaff.role === 'delivery' ? editForm.vehicleNumber.trim() : undefined,
          assignedZones: zonesArray,
          ...(updatedPhotoURL !== undefined ? { photoURL: updatedPhotoURL } : {})
        },
        activeAdminUser?.uid || 'admin',
        activeAdminUser?.name || 'Administrator',
        selectedStaff.loginId || selectedStaff.email
      );

      if (res.success) {
        addToast({
          type: 'success',
          title: 'Profile Updated',
          message: `Updated profile details for ${editForm.name}.`
        });
        setIsEditModalOpen(false);
        loadStaffList();
      } else {
        setEditError(res.error || 'Failed to update staff profile.');
      }
    } catch (err: any) {
      setEditError(err?.message || 'An unexpected error occurred during update.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Reset Password Modal
  const handleOpenResetModal = (staff: AuthUser) => {
    setSelectedStaff(staff);
    setNewPassword('Glowzaa@' + Math.floor(1000 + Math.random() * 9000));
    setResetSuccessMessage(null);
    setResetError(null);
    setShowPasswordText(true);
    setIsResetModalOpen(true);
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    if (!newPassword || newPassword.length < 6) {
      setResetError('New password must be at least 6 characters long.');
      return;
    }

    setIsSubmittingReset(true);
    setResetError(null);
    setResetSuccessMessage(null);

    const res = await resetStaffPasswordDirectly(
      selectedStaff.email,
      newPassword,
      activeAdminUser?.uid || 'admin',
      activeAdminUser?.name || 'Administrator',
      selectedStaff.loginId || selectedStaff.email
    );

    setIsSubmittingReset(false);

    if (res.success) {
      setResetSuccessMessage(`Password updated successfully! Provide this new password to ${selectedStaff.name}.`);
      addToast({
        type: 'success',
        title: 'Password Reset',
        message: `Password changed for ${selectedStaff.name} (${selectedStaff.loginId}).`
      });
    } else {
      setResetError(res.error || 'Failed to reset password.');
    }
  };

  // Handle View Details
  const handleOpenDetailModal = (staff: AuthUser) => {
    setSelectedStaff(staff);
    setIsDetailModalOpen(true);
  };

  // Filtering
  const filteredStaff = staffUsers.filter(staff => {
    const matchesSearch = 
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (staff.loginId && staff.loginId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (staff.phone && staff.phone.includes(searchQuery)) ||
      (staff.territory && staff.territory.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'all' || staff.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || staff.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalSalesVolume = salesStaff.reduce((sum, s) => sum + s.achievedSales, 0);
  const totalDriverCashInHand = deliveryStaff.reduce((sum, d) => sum + d.cashInHand, 0);

  const activeCount = staffUsers.filter(u => u.status === 'active').length;
  const salesCount = staffUsers.filter(u => u.role === 'sales').length;
  const deliveryCount = staffUsers.filter(u => u.role === 'delivery').length;
  const adminCount = staffUsers.filter(u => u.role === 'admin').length;

  return (
    <div className="space-y-5 pb-28 sm:pb-12">
      
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#087F7A] shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">Staff & User Management</h1>
                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 text-[#087F7A] border border-teal-200 uppercase tracking-wide">
                  Admin Control
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Manage accounts, sales quotas, delivery fleets, and login access.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenCreateModal()}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#087F7A] hover:bg-[#075E5B] text-white font-semibold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Staff</span>
          </button>

          <button
            onClick={loadStaffList}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 cursor-pointer shrink-0"
            title="Refresh staff list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingStaff ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span className="truncate">Staff Accounts</span>
            <Users className="w-4 h-4 text-slate-400 shrink-0" />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{staffUsers.length}</span>
            <span className="text-[11px] text-emerald-600 font-bold">({activeCount} Active)</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span className="truncate">Sales Staff</span>
            <UserCheck className="w-4 h-4 text-teal-600 shrink-0" />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-teal-700">{salesCount}</span>
            <span className="text-[11px] text-slate-400">Field Reps</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span className="truncate">Couriers</span>
            <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-700">{deliveryCount}</span>
            <span className="text-[11px] text-slate-400">Fleet Drivers</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span className="truncate">Admins</span>
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-rose-700">{adminCount}</span>
            <span className="text-[11px] text-slate-400">HQ Controllers</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="border-b border-slate-200 pb-3">
        <div className="overflow-x-auto no-scrollbar scroll-smooth -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 min-w-full sm:min-w-0">
            <button
              onClick={() => setActiveTab('accounts')}
              className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'accounts' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 shrink-0 ${activeTab === 'accounts' ? 'text-[#087F7A]' : 'text-slate-500'}`} />
              <span>Staff Accounts</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'accounts' ? 'bg-teal-50 text-[#087F7A] border border-teal-200' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {staffUsers.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('sales_performance')}
              className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'sales_performance' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <UserCheck className={`w-4 h-4 shrink-0 ${activeTab === 'sales_performance' ? 'text-teal-600' : 'text-slate-500'}`} />
              <span>Sales Quotas</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'sales_performance' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {salesStaff.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('delivery_fleet')}
              className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'delivery_fleet' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Truck className={`w-4 h-4 shrink-0 ${activeTab === 'delivery_fleet' ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span>Fleet & Cash</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'delivery_fleet' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-200/80 text-slate-600'
              }`}>
                {deliveryStaff.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('audit_logs')}
              className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'audit_logs' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Activity className={`w-4 h-4 shrink-0 ${activeTab === 'audit_logs' ? 'text-amber-600' : 'text-slate-500'}`} />
              <span>Security Audit</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: ACCOUNTS & USER MANAGEMENT */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 sm:space-y-0 sm:flex sm:gap-3 sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search staff by Name, Login ID, Phone..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#087F7A] transition-all font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5">
              {/* Role filter */}
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value as any)}
                  aria-label="Filter staff by role"
                  className="w-full sm:w-auto bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 font-medium focus:outline-none focus:bg-white focus:border-[#087F7A] text-xs cursor-pointer appearance-none pr-8"
                >
                  <option value="all">All Roles</option>
                  <option value="sales">Sales (Sellers)</option>
                  <option value="delivery">Delivery (Couriers)</option>
                  <option value="admin">Admins</option>
                </select>
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Status filter */}
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  aria-label="Filter staff by status"
                  className="w-full sm:w-auto bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 font-medium focus:outline-none focus:bg-white focus:border-[#087F7A] text-xs cursor-pointer appearance-none pr-8"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Disabled Only</option>
                </select>
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Mobile Card View (on small screens) */}
          <div className="block sm:hidden space-y-3">
            {isLoadingStaff ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-[#087F7A] mx-auto mb-2" />
                <span className="text-xs">Loading staff directory...</span>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No staff found.</p>
              </div>
            ) : (
              filteredStaff.map(staff => {
                const isCurrentUser = activeAdminUser?.uid === staff.uid;
                const roleBadgeColor = staff.role === 'admin' 
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : staff.role === 'sales'
                    ? 'bg-teal-50 text-teal-700 border-teal-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                return (
                  <div key={staff.uid} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={staff.name}
                          photoURL={staff.photoURL}
                          avatarInitials={staff.avatar}
                          role={staff.role}
                          size="md"
                        />
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm leading-snug">{staff.name}</h4>
                          <span className="text-[11px] text-slate-400">{staff.title || staff.department || staff.email}</span>
                        </div>
                      </div>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        staff.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${staff.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        <span>{staff.status === 'active' ? 'Active' : 'Disabled'}</span>
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Username / Login ID:</span>
                        <div className="inline-flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-md border border-slate-200 font-mono font-bold text-xs text-slate-800">
                          <span>{staff.loginId || staff.email.split('@')[0]}</span>
                          <button
                            onClick={() => copyToClipboard(staff.loginId || staff.email.split('@')[0], staff.uid)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer"
                            title="Copy"
                          >
                            {copiedKey === staff.uid ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Assigned Role:</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border capitalize ${roleBadgeColor}`}>
                          {staff.role === 'sales' ? 'Sales / Seller' : staff.role === 'delivery' ? 'Delivery Staff' : 'Admin'}
                        </span>
                      </div>

                      {staff.phone && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Phone:</span>
                          <span className="font-semibold text-slate-800">{staff.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenDetailModal(staff)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(staff)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleOpenResetModal(staff)}
                        className="flex items-center justify-center p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer"
                        title="Reset Password"
                      >
                        <Key className="w-3.5 h-3.5" />
                      </button>

                      {!isCurrentUser && (
                        <button
                          onClick={() => handleToggleStatus(staff)}
                          className={`flex items-center justify-center p-2 rounded-lg transition-colors cursor-pointer border ${
                            staff.status === 'active'
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                          title={staff.status === 'active' ? 'Disable account' : 'Enable account'}
                        >
                          {staff.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Staff Accounts Table (Tablet and Above) */}
          <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Login ID / Username</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Phone / Contact</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4">Last Login</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                  {isLoadingStaff ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-[#087F7A]" />
                          <span>Loading staff directory from Firestore...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Users className="w-8 h-8 text-slate-300" />
                          <span className="font-semibold text-slate-600">No staff accounts matched your filter.</span>
                          <button
                            onClick={() => handleOpenCreateModal()}
                            className="mt-2 text-xs text-[#087F7A] font-bold hover:underline cursor-pointer"
                          >
                            + Create a new staff account
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map(staff => {
                      const isCurrentUser = activeAdminUser?.uid === staff.uid;
                      const roleBadgeColor = staff.role === 'admin' 
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : staff.role === 'sales'
                          ? 'bg-teal-50 text-teal-700 border-teal-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                      return (
                        <tr key={staff.uid} className="hover:bg-slate-50/60 transition-colors">
                          {/* Staff Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                name={staff.name}
                                photoURL={staff.photoURL}
                                avatarInitials={staff.avatar}
                                role={staff.role}
                                size="sm"
                              />
                              <div>
                                <span className="font-bold text-slate-900 block">{staff.name}</span>
                                <span className="text-[11px] text-slate-400">{staff.title || staff.department || staff.email}</span>
                              </div>
                            </div>
                          </td>

                          {/* Login ID / Username */}
                          <td className="py-3.5 px-4">
                            <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-mono font-bold text-xs text-slate-800">
                              <span>{staff.loginId || staff.email.split('@')[0]}</span>
                              <button
                                onClick={() => copyToClipboard(staff.loginId || staff.email.split('@')[0], staff.uid)}
                                className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                                title="Copy username"
                              >
                                {copiedKey === staff.uid ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${roleBadgeColor}`}>
                              {staff.role === 'admin' && <ShieldAlert className="w-3 h-3" />}
                              {staff.role === 'sales' && <UserCheck className="w-3 h-3" />}
                              {staff.role === 'delivery' && <Truck className="w-3 h-3" />}
                              <span>{staff.role === 'sales' ? 'Sales / Seller' : staff.role === 'delivery' ? 'Delivery Staff' : 'Admin'}</span>
                            </span>
                          </td>

                          {/* Phone */}
                          <td className="py-3.5 px-4">
                            <div className="text-xs">
                              <span className="font-medium text-slate-900 block">{staff.phone || '—'}</span>
                              <span className="text-[11px] text-slate-400 truncate max-w-[150px] block">{staff.email}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              staff.status === 'active' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${staff.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                              <span>{staff.status === 'active' ? 'Active' : 'Disabled'}</span>
                            </span>
                          </td>

                          {/* Created Date */}
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            {new Date(staff.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>

                          {/* Last Login */}
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            {staff.lastLoginAt ? (
                              <span className="text-slate-700 font-medium">
                                {new Date(staff.lastLoginAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}{' '}
                                {new Date(staff.lastLoginAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Never logged in</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details */}
                              <button
                                onClick={() => handleOpenDetailModal(staff)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="View staff details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Staff */}
                              <button
                                onClick={() => handleOpenEditModal(staff)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="Edit staff profile"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Reset Password */}
                              <button
                                onClick={() => handleOpenResetModal(staff)}
                                className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer"
                                title="Reset staff password"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>

                              {/* Toggle Enable/Disable */}
                              {!isCurrentUser && (
                                <button
                                  onClick={() => handleToggleStatus(staff)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer border ${
                                    staff.status === 'active'
                                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                  }`}
                                  title={staff.status === 'active' ? 'Disable this account' : 'Enable this account'}
                                >
                                  {staff.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: SALES QUOTA & PERFORMANCE */}
      {activeTab === 'sales_performance' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-teal-50/70 p-4 rounded-2xl border border-teal-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Total Achieved Sales Volume</h3>
              <p className="text-xs text-slate-600">Combined sales performance booked by authorized field sales staff.</p>
            </div>
            <span className="text-xl font-extrabold text-teal-800">{formatBDT(totalSalesVolume)}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {salesStaff.map(staff => {
              const achievementPct = Math.round((staff.achievedSales / staff.monthlyTarget) * 100);
              return (
                <div key={staff.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={staff.name}
                        photoURL={staff.photoURL}
                        avatarInitials={staff.avatar}
                        role="sales"
                        size="md"
                      />
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{staff.name}</h3>
                        <span className="text-[11px] text-slate-400 font-mono">{staff.phone}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${staff.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {staff.status}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>{staff.territory}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                      <span>Total Booked Orders:</span>
                      <span className="font-bold text-slate-900">{staff.totalOrders}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Commission Rate:</span>
                      <span className="font-bold text-slate-900">{staff.commissionRate}%</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Monthly Target:</span>
                      <span className="font-bold text-slate-900">{formatBDT(staff.monthlyTarget)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-700">Achieved:</span>
                      <span className="text-teal-700">{formatBDT(staff.achievedSales)} ({achievementPct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-teal-500 to-[#087F7A] h-full rounded-full" 
                        style={{ width: `${Math.min(100, achievementPct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: FLEET & CASH RECONCILIATION */}
      {activeTab === 'delivery_fleet' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Fleet Collected Cash in Circulation</h4>
                <p className="text-slate-600 text-xs">Total driver route collections awaiting evening cash desk reconciliation.</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-extrabold text-emerald-800">{formatBDT(totalDriverCashInHand)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliveryStaff.map(driver => (
              <div key={driver.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={driver.name}
                      photoURL={driver.photoURL}
                      avatarInitials={driver.avatar}
                      role="delivery"
                      size="md"
                    />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{driver.name}</h3>
                      <span className="text-[11px] text-slate-400 font-mono">{driver.phone}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${driver.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {driver.status}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Vehicle:</span>
                    <span className="font-bold text-slate-900">{driver.vehicleNumber} ({driver.vehicleType})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Zones:</span>
                    <span className="font-semibold text-slate-800">
                      {(driver.assignedZones || [driver.assignedArea || 'Dhaka Metro']).join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Today's Runs:</span>
                    <span className="font-semibold text-emerald-700">
                      {driver.completedDeliveriesToday} Completed • {driver.activeDeliveriesToday} Active
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Cash in Hand</span>
                    <span className="text-sm font-extrabold text-emerald-700">{formatBDT(driver.cashInHand)}</span>
                  </div>

                  {driver.cashInHand > 0 && (
                    <button
                      onClick={() => handoverDeliveryCash(driver.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      Reconcile Cash
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY AUDIT LOGS */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Administrative Security Trail</h3>
                <p className="text-xs text-slate-500">Immutable ledger recording user creations, permissions, password resets and status changes.</p>
              </div>
            </div>
            <button
              onClick={loadAuditHistory}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAudit ? 'animate-spin' : ''}`} />
              <span>Refresh Log</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Admin Performer</th>
                    <th className="py-3 px-4">Target Login ID / User</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                  {isLoadingAudit ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">Loading audit history...</td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No audit events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {new Date(log.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            log.action === 'USER_CREATED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            log.action === 'PASSWORD_RESET' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            log.action === 'USER_DISABLED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-teal-50 text-teal-700 border border-teal-200'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{log.performerName}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">{log.targetUserLoginId || log.targetUserId}</td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE STAFF ACCOUNT */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-left my-8">
            
            {/* Header */}
            <div className="px-6 py-4 bg-[#102A2A] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#087F7A] flex items-center justify-center text-white">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Create New Staff Account</h3>
                  <p className="text-xs text-teal-200/80">Generates Firebase credentials for Sales or Delivery staff</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white/60 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {showCreatedCredentials ? (
              /* Success / Credential Summary Screen */
              <div className="p-6 space-y-5">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Account Successfully Provisioned!</h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      The staff account is active. Provide these login credentials to the staff member so they can access their portal.
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4 font-mono text-sm border border-slate-800">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-slate-400 font-sans text-xs uppercase font-bold">Staff Member:</span>
                    <span className="font-bold text-white">{showCreatedCredentials.name}</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-slate-400 font-sans text-xs uppercase font-bold">Designated Role:</span>
                    <span className="font-bold uppercase text-teal-400">{showCreatedCredentials.role}</span>
                  </div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-slate-400 font-sans text-xs uppercase font-bold">Login ID / Username:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-amber-300 text-base">{showCreatedCredentials.loginId}</span>
                      <button
                        onClick={() => copyToClipboard(showCreatedCredentials.loginId, 'modal_user')}
                        className="text-slate-400 hover:text-white cursor-pointer"
                        title="Copy username"
                      >
                        {copiedKey === 'modal_user' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans text-xs uppercase font-bold">Password:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-teal-300 text-base">{showCreatedCredentials.pass}</span>
                      <button
                        onClick={() => copyToClipboard(showCreatedCredentials.pass, 'modal_pass')}
                        className="text-slate-400 hover:text-white cursor-pointer"
                        title="Copy password"
                      >
                        {copiedKey === 'modal_pass' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      const credText = `Glowzaa B2B Staff Login Credentials:\nUsername: ${showCreatedCredentials.loginId}\nPassword: ${showCreatedCredentials.pass}\nRole: ${showCreatedCredentials.role.toUpperCase()}`;
                      copyToClipboard(credText, 'modal_full');
                      addToast({ type: 'info', title: 'Copied', message: 'Full credentials copied to clipboard.' });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy All Credentials</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      setShowCreatedCredentials(null);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#087F7A] hover:bg-[#075E5B] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
                
                {createError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{createError}</span>
                  </div>
                )}

                {/* Role Selector Tabs */}
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Account Role <span className="text-rose-600">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRoleChangeInCreate('sales')}
                      className={`py-2.5 px-3 rounded-xl font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        createForm.role === 'sales' 
                          ? 'bg-teal-50 border-[#087F7A] text-[#087F7A] shadow-xs' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Sales / Seller</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleChangeInCreate('delivery')}
                      className={`py-2.5 px-3 rounded-xl font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        createForm.role === 'delivery' 
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-700 shadow-xs' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Truck className="w-4 h-4" />
                      <span>Delivery Staff</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleChangeInCreate('admin')}
                      className={`py-2.5 px-3 rounded-xl font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        createForm.role === 'admin' 
                          ? 'bg-rose-50 border-rose-600 text-rose-700 shadow-xs' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4" />
                      <span>Admin</span>
                    </button>
                  </div>
                </div>

                {/* Profile Photo Upload Field */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <label className="block font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                    Profile Photo (Optional)
                  </label>
                  
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {createPhotoPreview ? (
                        <img 
                          src={createPhotoPreview} 
                          alt="Preview" 
                          className="w-14 h-14 rounded-xl object-cover border-2 border-[#087F7A] shadow-xs"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-slate-200 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                          <Camera className="w-5 h-5 text-slate-400" />
                          <span className="text-[9px] font-semibold mt-0.5">None</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => createFileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#087F7A]" />
                          <span>{createPhotoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                        </button>

                        {createPhotoPreview && (
                          <button
                            type="button"
                            onClick={handleClearCreatePhoto}
                            className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      <input
                        ref={createFileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={handleCreatePhotoChange}
                        className="hidden"
                      />

                      <p className="text-[10px] text-slate-400 leading-tight">
                        Supported: JPG, PNG, WebP (Max 5MB). Automatically compressed and stored in Firebase Storage.
                      </p>

                      {createPhotoError && (
                        <p className="text-[11px] text-rose-600 font-semibold">{createPhotoError}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Staff Full Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.name}
                      onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Tanvir Ahmed"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-[#087F7A]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Phone Number <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={createForm.phone}
                      onChange={e => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="e.g. 01712345678"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:bg-white focus:border-[#087F7A]"
                    />
                  </div>
                </div>

                {/* Login ID / Username & Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Login ID / Username <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={createForm.loginId}
                      onChange={e => {
                        const val = e.target.value.toLowerCase().replace(/\s+/g, '');
                        setCreateForm(prev => ({ ...prev, loginId: val, email: `${val}@glowzaa.local` }));
                      }}
                      placeholder="e.g. seller01, delivery01"
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-[#087F7A]"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">Staff member uses this to sign in.</span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold uppercase tracking-wider text-slate-700">
                        Initial Password <span className="text-rose-600">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setCreateForm(prev => ({ ...prev, password: 'Glowzaa@' + Math.floor(1000 + Math.random() * 9000) }))}
                        className="text-[10px] text-[#087F7A] font-bold hover:underline cursor-pointer"
                      >
                        Auto-Generate
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPasswordText ? 'text' : 'password'}
                        required
                        value={createForm.password}
                        onChange={e => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Min 6 characters"
                        className="w-full pl-3.5 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:border-[#087F7A]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordText(!showPasswordText)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        {showPasswordText ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Role Specific Fields */}
                {createForm.role === 'sales' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-teal-50/50 rounded-xl border border-teal-100">
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Sales Territory
                      </label>
                      <input
                        type="text"
                        value={createForm.territory}
                        onChange={e => setCreateForm(prev => ({ ...prev, territory: e.target.value }))}
                        placeholder="e.g. Gulshan & Banani"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Monthly Target (৳)
                      </label>
                      <input
                        type="number"
                        value={createForm.monthlyTarget}
                        onChange={e => setCreateForm(prev => ({ ...prev, monthlyTarget: Number(e.target.value) }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Commission Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={createForm.commissionRate}
                        onChange={e => setCreateForm(prev => ({ ...prev, commissionRate: Number(e.target.value) }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                )}

                {createForm.role === 'delivery' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Vehicle Type
                      </label>
                      <select
                        value={createForm.vehicleType}
                        onChange={e => setCreateForm(prev => ({ ...prev, vehicleType: e.target.value }))}
                        aria-label="Select vehicle type"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                      >
                        <option value="Motorcycle">Motorcycle</option>
                        <option value="Covered Van">Covered Van</option>
                        <option value="Bicycle">Bicycle</option>
                        <option value="Pickup Truck">Pickup Truck</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Vehicle Plate No.
                      </label>
                      <input
                        type="text"
                        value={createForm.vehicleNumber}
                        onChange={e => setCreateForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                        placeholder="e.g. Dhaka Metro HA-12"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Assigned Zones (Comma sep)
                      </label>
                      <input
                        type="text"
                        value={createForm.assignedZones}
                        onChange={e => setCreateForm(prev => ({ ...prev, assignedZones: e.target.value }))}
                        placeholder="Dhanmondi, Mirpur"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCreate}
                    className="px-5 py-2.5 rounded-xl bg-[#087F7A] hover:bg-[#075E5B] text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingCreate ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating Firebase Account...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Create & Save Account</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

      {/* MODAL 2: EDIT STAFF PROFILE */}
      {isEditModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-left my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-4 h-4 text-teal-400" />
                <h3 className="font-bold text-base">Edit Staff: {selectedStaff.name}</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-white/60 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 text-xs">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                  {editError}
                </div>
              )}

              {/* Profile Photo Edit Field */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="block font-bold uppercase tracking-wider text-slate-700 text-[11px]">
                  Profile Photo
                </label>

                <div className="flex items-center gap-4">
                  <div className="relative">
                    {editPhotoPreview ? (
                      <img 
                        src={editPhotoPreview} 
                        alt="New Preview" 
                        className="w-14 h-14 rounded-xl object-cover border-2 border-[#087F7A] shadow-xs"
                      />
                    ) : !editPhotoRemoved && selectedStaff.photoURL ? (
                      <img 
                        src={selectedStaff.photoURL} 
                        alt={selectedStaff.name} 
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-xs"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-200 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                        <Camera className="w-5 h-5 text-slate-400" />
                        <span className="text-[9px] font-semibold mt-0.5">None</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => editFileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#087F7A]" />
                        <span>{editPhotoPreview || (!editPhotoRemoved && selectedStaff.photoURL) ? 'Change Photo' : 'Upload Photo'}</span>
                      </button>

                      {(editPhotoPreview || (!editPhotoRemoved && selectedStaff.photoURL)) && (
                        <button
                          type="button"
                          onClick={handleRemoveEditPhoto}
                          className="px-2.5 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Photo</span>
                        </button>
                      )}
                    </div>

                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleEditPhotoChange}
                      className="hidden"
                    />

                    <p className="text-[10px] text-slate-400 leading-tight">
                      Supported: JPG, PNG, WebP (Max 5MB). Automatically compressed and stored in Firebase Storage.
                    </p>

                    {editPhotoError && (
                      <p className="text-[11px] text-rose-600 font-semibold">{editPhotoError}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">Title / Designation</label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={editForm.department}
                    onChange={e => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>
              </div>

              {selectedStaff.role === 'sales' && (
                <div className="p-3.5 bg-teal-50 rounded-xl space-y-3">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">Territory</label>
                    <input
                      type="text"
                      value={editForm.territory}
                      onChange={e => setEditForm(prev => ({ ...prev, territory: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">Monthly Target (৳)</label>
                      <input
                        type="number"
                        value={editForm.monthlyTarget}
                        onChange={e => setEditForm(prev => ({ ...prev, monthlyTarget: Number(e.target.value) }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">Commission Rate (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editForm.commissionRate}
                        onChange={e => setEditForm(prev => ({ ...prev, commissionRate: Number(e.target.value) }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedStaff.role === 'delivery' && (
                <div className="p-3.5 bg-emerald-50 rounded-xl space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">Vehicle Plate</label>
                      <input
                        type="text"
                        value={editForm.vehicleNumber}
                        onChange={e => setEditForm(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">Vehicle Type</label>
                      <select
                        value={editForm.vehicleType}
                        onChange={e => setEditForm(prev => ({ ...prev, vehicleType: e.target.value }))}
                        aria-label="Select vehicle type"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                      >
                        <option value="Motorcycle">Motorcycle</option>
                        <option value="Covered Van">Covered Van</option>
                        <option value="Bicycle">Bicycle</option>
                        <option value="Pickup Truck">Pickup Truck</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1">Assigned Delivery Zones</label>
                    <input
                      type="text"
                      value={editForm.assignedZones}
                      onChange={e => setEditForm(prev => ({ ...prev, assignedZones: e.target.value }))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl bg-[#087F7A] hover:bg-[#075E5B] text-white font-semibold shadow-xs cursor-pointer"
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DIRECT PASSWORD RESET */}
      {isResetModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-left">
            <div className="px-6 py-4 bg-amber-900/90 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Reset Password</h3>
              </div>
              <button onClick={() => setIsResetModalOpen(false)} className="text-white/60 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <p className="text-slate-600 leading-relaxed">
                  Set a new password for <span className="font-bold text-slate-900">{selectedStaff.name}</span> (Username: <span className="font-mono font-bold text-amber-700">{selectedStaff.loginId}</span>).
                </p>
              </div>

              {resetSuccessMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Password Successfully Changed</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-emerald-200 font-mono font-bold text-xs flex justify-between items-center">
                    <span>{newPassword}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(newPassword, 'reset_key')}
                      className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                    >
                      {copiedKey === 'reset_key' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {resetError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                  {resetError}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold uppercase tracking-wider text-slate-700">
                    New Password <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword('Glowzaa@' + Math.floor(1000 + Math.random() * 9000))}
                    className="text-[10px] text-[#087F7A] font-bold hover:underline cursor-pointer"
                  >
                    Auto-Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-sm focus:outline-none focus:border-amber-600"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReset}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {isSubmittingReset ? 'Updating...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: VIEW STAFF DETAILS */}
      {isDetailModalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden text-left my-8">
            <div className="px-6 py-5 bg-[#102A2A] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={selectedStaff.name}
                  photoURL={selectedStaff.photoURL}
                  avatarInitials={selectedStaff.avatar}
                  role={selectedStaff.role}
                  size="lg"
                />
                <div>
                  <h3 className="font-bold text-lg">{selectedStaff.name}</h3>
                  <p className="text-xs text-teal-200/80">{selectedStaff.title || selectedStaff.role.toUpperCase()}</p>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-white/60 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              
              {/* Status Banner */}
              <div className={`p-3 rounded-xl flex items-center justify-between ${
                selectedStaff.status === 'active' ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${selectedStaff.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  <span className="font-bold text-xs uppercase tracking-wide">
                    Account Status: {selectedStaff.status}
                  </span>
                </div>
                <span className="text-[11px] font-medium">
                  {selectedStaff.status === 'active' ? 'Staff can sign in freely' : 'Access is blocked by Admin'}
                </span>
              </div>

              {/* Grid Details */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Login ID / Username</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{selectedStaff.loginId || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Assigned Role</span>
                  <span className="font-bold text-slate-900 text-sm capitalize">{selectedStaff.role}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Phone Contact</span>
                  <span className="font-medium text-slate-900">{selectedStaff.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Corporate Email</span>
                  <span className="font-medium text-slate-900 truncate block">{selectedStaff.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Created On</span>
                  <span className="font-medium text-slate-900">
                    {new Date(selectedStaff.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Last Logged In</span>
                  <span className="font-medium text-slate-900">
                    {selectedStaff.lastLoginAt ? new Date(selectedStaff.lastLoginAt).toLocaleString('en-GB') : 'Never'}
                  </span>
                </div>
              </div>

              {/* Role specific info */}
              {selectedStaff.role === 'sales' && (
                <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-200 space-y-2">
                  <h4 className="font-bold text-teal-900">Sales Quota & Field Parameters</h4>
                  <div className="grid grid-cols-3 gap-2 pt-1 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Territory</span>
                      <span className="font-bold">{selectedStaff.territory || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Target</span>
                      <span className="font-bold">{formatBDT(selectedStaff.monthlyTarget || 0)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Commission</span>
                      <span className="font-bold">{selectedStaff.commissionRate || 0}%</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedStaff.role === 'delivery' && (
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                  <h4 className="font-bold text-emerald-900">Fleet & Vehicle Information</h4>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Vehicle</span>
                      <span className="font-bold">{selectedStaff.vehicleNumber || '—'} ({selectedStaff.vehicleType || 'Motorcycle'})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Assigned Zones</span>
                      <span className="font-bold">{(selectedStaff.assignedZones || []).join(', ') || 'Dhaka Metro'}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenResetModal(selectedStaff);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold cursor-pointer"
                >
                  Reset Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenEditModal(selectedStaff);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold cursor-pointer"
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-[#087F7A] hover:bg-[#075E5B] text-white font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
