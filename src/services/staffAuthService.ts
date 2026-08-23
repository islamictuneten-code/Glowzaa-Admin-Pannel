import { initializeApp, deleteApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signOut as secondarySignOut,
  sendPasswordResetEmail,
  updatePassword,
  signInWithEmailAndPassword,
  setPersistence,
  inMemoryPersistence
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc,
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { AuthUser, AuditLog, UserRole, DeviceSessionInfo } from '../types';
import { cleanUndefined } from './firestoreService';

export interface CreateStaffInput {
  name: string;
  loginId: string;
  phone: string;
  role: UserRole;
  password: string;
  email?: string;
  photoURL?: string;
  status?: 'active' | 'inactive';
  staffId?: string;
  title?: string;
  department?: string;
  territory?: string;
  assignedArea?: string;
  assignedZones?: string[];
  vehicleNumber?: string;
  vehicleType?: 'Covered Van' | 'Motorcycle' | 'Mini-Truck' | 'Bicycle Delivery' | string;
  monthlyTarget?: number;
  commissionRate?: number;
}

export interface UpdateStaffInput {
  name?: string;
  phone?: string;
  role?: UserRole;
  photoURL?: string;
  status?: 'active' | 'inactive';
  staffId?: string;
  title?: string;
  department?: string;
  territory?: string;
  assignedArea?: string;
  assignedZones?: string[];
  vehicleNumber?: string;
  vehicleType?: 'Covered Van' | 'Motorcycle' | 'Mini-Truck' | 'Bicycle Delivery' | string;
  monthlyTarget?: number;
  commissionRate?: number;
}

/**
 * Generate 2-letter uppercase initials for avatar
 */
export function getAvatarInitials(name: string): string {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Resolve Login ID to internal Firebase Auth email
 * e.g. "seller01" -> "seller01@glowzaa.local"
 * If already an email, keeps it intact.
 */
export function resolveLoginIdToEmail(loginId: string): string {
  const clean = loginId.trim().toLowerCase();
  if (clean.includes('@')) {
    return clean;
  }
  return `${clean}@glowzaa.local`;
}

/**
 * Check if a Login ID is already in use in Firestore
 */
export async function isLoginIdTaken(loginId: string, excludeUid?: string): Promise<boolean> {
  const clean = loginId.trim().toLowerCase();
  const q = query(collection(db, 'users'), where('loginId', '==', clean));
  const snap = await getDocs(q);
  if (snap.empty) return false;
  if (excludeUid) {
    return snap.docs.some(d => d.id !== excludeUid);
  }
  return true;
}

/**
 * Helper to normalize admin identifier
 */
function normalizeAdminUser(admin: AuthUser | { uid: string; name?: string } | string, fallbackName?: string): { uid: string; name: string } {
  if (typeof admin === 'string') {
    return { uid: admin, name: fallbackName || 'Administrator' };
  }
  return { uid: admin.uid, name: admin.name || fallbackName || 'Administrator' };
}

/**
 * Safely write audit log to Firestore with a unique document reference and merge handling
 */
export async function writeAuditLogSafely(logData: {
  action: string;
  targetUserId: string;
  targetUserLoginId?: string;
  targetUserName?: string;
  targetRole?: string;
  performedByUserId: string;
  performedByUserName?: string;
  timestamp?: string;
  details?: string;
}): Promise<void> {
  try {
    const cleanData = cleanUndefined({
      action: logData.action,
      targetUserId: logData.targetUserId,
      targetUserLoginId: logData.targetUserLoginId || '',
      targetUserName: logData.targetUserName || 'Staff User',
      targetRole: logData.targetRole || 'staff',
      performedByUserId: logData.performedByUserId,
      performedByUserName: logData.performedByUserName || 'Administrator',
      timestamp: logData.timestamp || new Date().toISOString(),
      details: logData.details || ''
    });

    const newDocRef = doc(collection(db, 'audit_logs'));
    await setDoc(newDocRef, cleanData, { merge: true });
  } catch (err) {
    console.warn('Audit log write notice:', err);
  }
}

/**
 * Create Staff Firebase Auth Account without logging out the active Admin session
 * Uses an isolated secondary Firebase App instance
 */
export async function createStaffAccount(
  input: CreateStaffInput, 
  adminUser: AuthUser | { uid: string; name?: string } | string,
  adminNameFallback?: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const admin = normalizeAdminUser(adminUser, adminNameFallback);
    // 1. Validation
    const cleanName = input.name.trim();
    const cleanLoginId = input.loginId.trim().toLowerCase();
    const cleanPhone = input.phone.trim();
    const cleanPassword = input.password.trim();

    if (!cleanName) {
      return { success: false, error: 'Full Name is required.' };
    }
    if (!cleanLoginId || cleanLoginId.length < 3) {
      return { success: false, error: 'Login ID / Username must be at least 3 characters.' };
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(cleanLoginId)) {
      return { success: false, error: 'Login ID can only contain letters, numbers, dots, dashes, and underscores.' };
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    if (!['admin', 'sales', 'delivery'].includes(input.role)) {
      return { success: false, error: 'Invalid staff role selected.' };
    }

    // 2. Uniqueness check in Firestore
    const loginIdExists = await isLoginIdTaken(cleanLoginId);
    if (loginIdExists) {
      return { success: false, error: `The Login ID "${cleanLoginId}" is already in use. Please choose another username.` };
    }

    const authEmail = resolveLoginIdToEmail(cleanLoginId);

    // 3. Create Firebase Authentication account in secondary app instance
    let newUid: string;
    let secondaryApp: any;
    let secondaryAuth: any;
    try {
      const secondaryAppName = `StaffAuthCreator_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
      secondaryAuth = getAuth(secondaryApp);
      try {
        await setPersistence(secondaryAuth, inMemoryPersistence);
      } catch {}

      try {
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, authEmail, cleanPassword);
        newUid = userCredential.user.uid;
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          return { success: false, error: `An account for "${cleanLoginId}" already exists in the system.` };
        }
        if (authErr.code === 'auth/weak-password') {
          return { success: false, error: 'Password is too weak. Please use at least 6 characters.' };
        }
        return { success: false, error: authErr.message || 'Failed to create authentication account.' };
      } finally {
        try {
          await secondarySignOut(secondaryAuth);
          await deleteApp(secondaryApp);
        } catch (cleanupErr) {
          // Ignore cleanup errors
        }
      }
    } catch (outerAuthErr: any) {
      console.warn('Secondary app init notice:', outerAuthErr);
      return { success: false, error: outerAuthErr.message || 'Failed to initialize authentication service.' };
    }

    // 4. Save Staff Profile to Firestore users collection
    const defaultStaffCode = input.role === 'sales' 
      ? `SLS-${Math.floor(1000 + Math.random() * 9000)}` 
      : input.role === 'delivery' 
        ? `DLV-${Math.floor(1000 + Math.random() * 9000)}` 
        : `ADM-${Math.floor(1000 + Math.random() * 9000)}`;

    const userProfile: AuthUser = {
      uid: newUid,
      id: newUid,
      loginId: cleanLoginId,
      name: cleanName,
      email: authEmail,
      phone: cleanPhone || '+880 1700-000000',
      role: input.role,
      status: input.status || 'active',
      avatar: getAvatarInitials(cleanName),
      photoURL: input.photoURL || undefined,
      title: input.title || (input.role === 'sales' ? 'Field Sales Executive' : input.role === 'delivery' ? 'Delivery Courier' : 'Operations Admin'),
      department: input.department || (input.role === 'sales' ? 'Wholesale Field Sales' : input.role === 'delivery' ? 'Logistics & Fleet' : 'Administration HQ'),
      staffId: input.staffId || defaultStaffCode,
      salesStaffId: input.role === 'sales' ? (input.staffId || defaultStaffCode) : (input.staffId || undefined),
      deliveryStaffId: input.role === 'delivery' ? (input.staffId || defaultStaffCode) : (input.staffId || undefined),
      territory: input.territory || (input.role === 'sales' ? 'Dhaka Central & Wholesale Hubs' : ''),
      assignedArea: input.assignedArea || (input.role === 'delivery' ? 'Dhaka Metropolitan Area' : ''),
      assignedZones: input.assignedZones || (input.assignedArea ? [input.assignedArea] : ['Dhaka Central']),
      vehicleNumber: input.vehicleNumber || '',
      vehicleType: input.vehicleType || 'Covered Van',
      monthlyTarget: input.monthlyTarget !== undefined ? Number(input.monthlyTarget) : (input.role === 'sales' ? 450000 : 0),
      commissionRate: input.commissionRate !== undefined ? Number(input.commissionRate) : (input.role === 'sales' ? 2.0 : 0),
      createdAt: new Date().toISOString(),
      createdBy: admin.uid,
      createdByName: admin.name || 'Administrator',
    };

    // Save to Firestore (sanitize all undefined values before saving)
    await setDoc(doc(db, 'users', newUid), cleanUndefined(userProfile));

    // 5. Create Audit Log
    writeAuditLogSafely({
      action: 'STAFF_ACCOUNT_CREATED',
      targetUserId: newUid,
      targetUserLoginId: cleanLoginId,
      targetUserName: cleanName,
      targetRole: input.role,
      performedByUserId: admin.uid,
      performedByUserName: admin.name || 'Administrator',
      timestamp: new Date().toISOString(),
      details: `Created new ${input.role.toUpperCase()} staff account for "${cleanName}" with Login ID: "${cleanLoginId}"`
    });

    return { success: true, user: userProfile };
  } catch (error: any) {
    console.error('Error creating staff account:', error);
    return { success: false, error: error.message || 'An unexpected error occurred while creating the staff account.' };
  }
}

/**
 * Update staff member profile in Firestore
 */
export async function updateStaffProfile(
  userId: string,
  updates: UpdateStaffInput,
  adminUser: AuthUser | { uid: string; name?: string } | string,
  adminNameFallback?: string,
  targetLoginId?: string,
  existingUser?: Partial<AuthUser>
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = normalizeAdminUser(adminUser, adminNameFallback);
    const userRef = doc(db, 'users', userId);
    
    let existingData: Partial<AuthUser> = existingUser || {};
    if (!existingUser) {
      try {
        const existingSnap = await getDoc(userRef);
        if (existingSnap.exists()) {
          existingData = existingSnap.data() as AuthUser;
        }
      } catch (e) {
        console.warn('Failed to fetch existing user data:', e);
      }
    }

    const isRoleChanged = updates.role && existingData.role && updates.role !== existingData.role;

    const payload: Partial<AuthUser> = {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: admin.uid
    };

    if (updates.name) {
      payload.avatar = getAvatarInitials(updates.name);
    }

    // Use setDoc with merge: true so it creates or updates seamlessly even if synthesized
    await setDoc(userRef, cleanUndefined(payload), { merge: true });

    // Write audit log safely
    writeAuditLogSafely({
      action: isRoleChanged ? 'STAFF_ROLE_CHANGED' : 'STAFF_PROFILE_UPDATED',
      targetUserId: userId,
      targetUserLoginId: targetLoginId || existingData.loginId || existingData.email || userId,
      targetUserName: updates.name || existingData.name || 'Staff User',
      targetRole: updates.role || existingData.role || 'sales',
      performedByUserId: admin.uid,
      performedByUserName: admin.name || 'Administrator',
      timestamp: new Date().toISOString(),
      details: isRoleChanged 
        ? `Role updated from ${(existingData.role || 'unknown').toUpperCase()} to ${updates.role?.toUpperCase()}`
        : `Staff profile updated for ${updates.name || existingData.name || userId}`
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating staff profile:', error);
    return { success: false, error: error.message || 'Failed to update staff profile.' };
  }
}

/**
 * Enable or Disable staff account
 */
export async function toggleStaffStatus(
  userId: string,
  newStatus: 'active' | 'inactive',
  adminUser: AuthUser | { uid: string; name?: string } | string,
  adminNameFallback?: string,
  targetLoginId?: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = normalizeAdminUser(adminUser, adminNameFallback);
    const userRef = doc(db, 'users', userId);
    const existingSnap = await getDoc(userRef);
    if (!existingSnap.exists()) {
      return { success: false, error: 'Staff user profile not found.' };
    }

    const existingData = existingSnap.data() as AuthUser;

    await updateDoc(userRef, cleanUndefined({
      status: newStatus,
      updatedAt: new Date().toISOString(),
      updatedBy: admin.uid
    }));

    // Write audit log safely
    writeAuditLogSafely({
      action: newStatus === 'inactive' ? 'STAFF_ACCOUNT_DISABLED' : 'STAFF_ACCOUNT_ENABLED',
      targetUserId: userId,
      targetUserLoginId: targetLoginId || existingData.loginId || existingData.email,
      targetUserName: existingData.name,
      targetRole: existingData.role,
      performedByUserId: admin.uid,
      performedByUserName: admin.name || 'Administrator',
      timestamp: new Date().toISOString(),
      details: newStatus === 'inactive' 
        ? `Account disabled for "${existingData.name}" (${existingData.loginId || existingData.email}). ${reason ? `Reason: ${reason}` : ''}`
        : `Account re-enabled for "${existingData.name}" (${existingData.loginId || existingData.email}).`
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error toggling staff status:', error);
    return { success: false, error: error.message || 'Failed to update staff status.' };
  }
}

/**
 * Reset Staff Password directly or send reset email
 */
export async function resetStaffPasswordDirectly(
  staffUserOrEmail: AuthUser | string,
  newPassword: string,
  adminUser: AuthUser | { uid: string; name?: string } | string,
  adminNameFallback?: string,
  targetLoginId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = normalizeAdminUser(adminUser, adminNameFallback);
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters.' };
    }

    const isUserObj = typeof staffUserOrEmail !== 'string';
    const email = isUserObj ? (staffUserOrEmail.email || resolveLoginIdToEmail(staffUserOrEmail.loginId || staffUserOrEmail.uid)) : staffUserOrEmail;
    const targetUserId = isUserObj ? staffUserOrEmail.uid : email;
    const targetUserName = isUserObj ? staffUserOrEmail.name : (targetLoginId || email);
    const targetRole = isUserObj ? staffUserOrEmail.role : 'staff';
    const loginId = isUserObj ? (staffUserOrEmail.loginId || staffUserOrEmail.email) : (targetLoginId || email);

    // Update Firestore user document with pendingPassword so login auto-syncs auth credentials
    if (isUserObj && staffUserOrEmail.uid) {
      try {
        await updateDoc(doc(db, 'users', staffUserOrEmail.uid), {
          pendingPassword: newPassword,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Failed to save pendingPassword in Firestore:', err);
      }
    } else {
      try {
        const q = query(collection(db, 'users'), where('email', '==', email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await updateDoc(snap.docs[0].ref, {
            pendingPassword: newPassword,
            updatedAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.warn('Failed to save pendingPassword by email:', err);
      }
    }

    // Write audit log indicating password reset safely
    writeAuditLogSafely({
      action: 'STAFF_PASSWORD_RESET',
      targetUserId,
      targetUserLoginId: loginId,
      targetUserName,
      targetRole,
      performedByUserId: admin.uid,
      performedByUserName: admin.name || 'Administrator',
      timestamp: new Date().toISOString(),
      details: `Password reset performed for "${targetUserName}" (${loginId})`
    });

    // If an email address is valid, trigger a password reset email as backup
    if (email.includes('@') && !email.endsWith('@glowzaa.local')) {
      try {
        await sendPasswordResetEmail(auth, email);
      } catch {}
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error resetting staff password:', error);
    return { success: false, error: error.message || 'Failed to reset password.' };
  }
}

/**
 * Send Password Reset Email
 */
export async function sendStaffResetEmail(
  email: string,
  staffName: string,
  adminUser: AuthUser
): Promise<{ success: boolean; error?: string }> {
  try {
    await sendPasswordResetEmail(auth, email);

    writeAuditLogSafely({
      action: 'STAFF_PASSWORD_RESET',
      targetUserId: email,
      targetUserName: staffName,
      targetRole: 'staff',
      performedByUserId: adminUser.uid,
      performedByUserName: adminUser.name || 'Admin',
      timestamp: new Date().toISOString(),
      details: `Password reset email dispatched to ${email}`
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send password reset email.' };
  }
}

/**
 * Fetch all staff users from Firestore
 */
export async function fetchStaffUsers(): Promise<AuthUser[]> {
  try {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        uid: docSnap.id,
        id: docSnap.id,
        loginId: data.loginId || data.email?.split('@')[0] || docSnap.id.slice(0, 6),
        name: data.name || 'Staff Member',
        email: data.email || '',
        phone: data.phone || '',
        role: (data.role as UserRole) || 'sales',
        status: (data.status as 'active' | 'inactive') || 'active',
        createdAt: data.createdAt ? (typeof data.createdAt === 'string' ? data.createdAt : data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()) : new Date().toISOString(),
        lastLoginAt: data.lastLoginAt ? (typeof data.lastLoginAt === 'string' ? data.lastLoginAt : data.lastLoginAt?.toDate ? data.lastLoginAt.toDate().toISOString() : undefined) : undefined,
        updatedAt: data.updatedAt ? (typeof data.updatedAt === 'string' ? data.updatedAt : data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined) : undefined,
        avatar: data.avatar || getAvatarInitials(data.name || 'ST'),
        photoURL: data.photoURL,
        title: data.title,
        department: data.department,
        staffId: data.staffId,
        salesStaffId: data.salesStaffId,
        deliveryStaffId: data.deliveryStaffId,
        territory: data.territory,
        assignedArea: data.assignedArea,
        assignedZones: data.assignedZones,
        vehicleNumber: data.vehicleNumber,
        vehicleType: data.vehicleType,
        monthlyTarget: data.monthlyTarget,
        commissionRate: data.commissionRate,
        createdBy: data.createdBy,
        createdByName: data.createdByName
      };
    });
  } catch (error) {
    console.warn('Error fetching staff users:', error);
    return [];
  }
}

/**
 * Fetch recent audit logs from Firestore
 */
export async function fetchAuditLogs(limitCount = 50): Promise<AuditLog[]> {
  try {
    const q = query(
      collection(db, 'audit_logs'), 
      orderBy('timestamp', 'desc'), 
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    })) as AuditLog[];
  } catch (error) {
    console.warn('Error fetching audit logs:', error);
    return [];
  }
}

export function subscribeStaffUsers(callback: (users: AuthUser[]) => void): () => void {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const users = snap.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        uid: docSnap.id,
        id: docSnap.id,
        loginId: data.loginId || data.email?.split('@')[0] || docSnap.id.slice(0, 6),
        name: data.name || 'Staff Member',
        email: data.email || '',
        phone: data.phone || '',
        role: (data.role as UserRole) || 'sales',
        status: (data.status as 'active' | 'inactive') || 'active',
        createdAt: data.createdAt ? (typeof data.createdAt === 'string' ? data.createdAt : data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()) : new Date().toISOString(),
        lastLoginAt: data.lastLoginAt ? (typeof data.lastLoginAt === 'string' ? data.lastLoginAt : data.lastLoginAt?.toDate ? data.lastLoginAt.toDate().toISOString() : undefined) : undefined,
        updatedAt: data.updatedAt ? (typeof data.updatedAt === 'string' ? data.updatedAt : data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : undefined) : undefined,
        avatar: data.avatar || getAvatarInitials(data.name || 'ST'),
        photoURL: data.photoURL,
        title: data.title,
        department: data.department,
        staffId: data.staffId,
        salesStaffId: data.salesStaffId,
        deliveryStaffId: data.deliveryStaffId,
        territory: data.territory,
        assignedArea: data.assignedArea,
        assignedZones: data.assignedZones,
        vehicleNumber: data.vehicleNumber,
        vehicleType: data.vehicleType,
        monthlyTarget: data.monthlyTarget,
        commissionRate: data.commissionRate,
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        sessionRevokedAt: data.sessionRevokedAt,
        sessionVersion: data.sessionVersion,
        activeSessions: data.activeSessions || []
      };
    }) as AuthUser[];
    callback(users);
  }, (error) => {
    console.error('Error in subscribeStaffUsers:', error);
  });
}

/**
 * Detect client device, browser, and OS info
 */
export function getDeviceClientInfo(existingSessionId?: string): DeviceSessionInfo {
  let sessionId = existingSessionId;
  if (!sessionId && typeof window !== 'undefined') {
    sessionId = localStorage.getItem('glowzaa_client_session_id') || '';
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      try {
        localStorage.setItem('glowzaa_client_session_id', sessionId);
      } catch {}
    }
  }
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  
  // OS Detection
  let os = 'Unknown OS';
  if (/Windows NT 10.0|Windows NT 11.0/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6.3/i.test(ua)) os = 'Windows 8.1';
  else if (/Windows/i.test(ua)) os = 'Windows PC';
  else if (/Android/i.test(ua)) os = 'Android OS';
  else if (/iPhone/i.test(ua)) os = 'Apple iOS (iPhone)';
  else if (/iPad/i.test(ua)) os = 'Apple iPadOS';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS Apple Mac';
  else if (/Linux/i.test(ua)) os = 'Linux OS';
  else if (/CrOS/i.test(ua)) os = 'ChromeOS';

  // Browser Detection
  let browser = 'Web Browser';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua) && !/OPR\//i.test(ua)) browser = 'Google Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Apple Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera Browser';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet';

  // Device Type
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/iPad|Tablet/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/Mobi|Android|iPhone|iPod/i.test(ua)) {
    deviceType = 'mobile';
  }

  const deviceName = `${browser} on ${os}`;
  const nowIso = new Date().toISOString();

  return {
    sessionId,
    deviceName,
    deviceType,
    browser,
    os,
    createdAt: nowIso,
    lastActiveAt: nowIso,
    isCurrent: true
  };
}

/**
 * Register or update the current device session in Firestore users/{uid}
 */
export async function registerOrUpdateDeviceSession(
  uid: string,
  sessionInfo: DeviceSessionInfo
): Promise<void> {
  if (!uid || !sessionInfo.sessionId) return;

  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const existingSessions: DeviceSessionInfo[] = Array.isArray(data.activeSessions) ? data.activeSessions : [];

    // Filter out sessions older than 30 days or identical sessionId
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filteredSessions = existingSessions.filter(s => {
      if (s.sessionId === sessionInfo.sessionId) return false;
      const createdTime = new Date(s.lastActiveAt || s.createdAt).getTime();
      return !isNaN(createdTime) && createdTime > thirtyDaysAgo;
    });

    const updatedSessions: DeviceSessionInfo[] = [
      {
        sessionId: sessionInfo.sessionId,
        deviceName: sessionInfo.deviceName,
        deviceType: sessionInfo.deviceType,
        browser: sessionInfo.browser,
        os: sessionInfo.os,
        createdAt: sessionInfo.createdAt || new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      },
      ...filteredSessions
    ].slice(0, 15); // Max 15 active sessions retained

    await setDoc(userRef, {
      activeSessions: updatedSessions,
      lastLoginAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Notice registering device session:', err);
  }
}

/**
 * Log out all devices (or all OTHER devices) for a user
 */
export async function logoutAllDevicesInFirestore(
  uid: string,
  keepCurrentSessionId?: string,
  adminUser?: AuthUser | { uid: string; name?: string } | string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return { success: false, error: 'User profile not found.' };
    }

    const userData = snap.data() as AuthUser;
    const nowIso = new Date().toISOString();
    const existingSessions: DeviceSessionInfo[] = Array.isArray(userData.activeSessions) ? userData.activeSessions : [];

    let updatedSessions: DeviceSessionInfo[] = [];
    if (keepCurrentSessionId) {
      // Keep only current session
      updatedSessions = existingSessions.filter(s => s.sessionId === keepCurrentSessionId);
    }

    const newVersion = (userData.sessionVersion || 1) + 1;

    await setDoc(userRef, {
      sessionRevokedAt: nowIso,
      sessionVersion: newVersion,
      activeSessions: updatedSessions,
      updatedAt: nowIso
    }, { merge: true });

    // Write audit log safely
    const admin = adminUser ? normalizeAdminUser(adminUser) : { uid, name: userData.name || 'User' };
    writeAuditLogSafely({
      action: 'STAFF_ALL_DEVICES_LOGGED_OUT',
      targetUserId: uid,
      targetUserLoginId: userData.loginId || userData.email || uid,
      targetUserName: userData.name || 'Staff User',
      targetRole: userData.role || 'sales',
      performedByUserId: admin.uid,
      performedByUserName: admin.name || 'Administrator',
      timestamp: nowIso,
      details: keepCurrentSessionId 
        ? `All other device sessions terminated (retained current active session: ${keepCurrentSessionId})` 
        : `Terminated all active device sessions across all platforms for ${userData.name || uid}`
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error logging out all devices:', err);
    return { success: false, error: err.message || 'Failed to logout devices.' };
  }
}

/**
 * Revoke a specific single device session in Firestore
 */
export async function revokeDeviceSessionInFirestore(
  uid: string,
  sessionId: string,
  adminUser?: AuthUser | { uid: string; name?: string } | string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return { success: false, error: 'User profile not found.' };
    }

    const userData = snap.data() as AuthUser;
    const existingSessions: DeviceSessionInfo[] = Array.isArray(userData.activeSessions) ? userData.activeSessions : [];
    const targetSession = existingSessions.find(s => s.sessionId === sessionId);
    const updatedSessions = existingSessions.filter(s => s.sessionId !== sessionId);
    const nowIso = new Date().toISOString();

    await setDoc(userRef, {
      activeSessions: updatedSessions,
      updatedAt: nowIso
    }, { merge: true });

    // Write audit log safely
    const admin = adminUser ? normalizeAdminUser(adminUser) : { uid, name: userData.name || 'User' };
    writeAuditLogSafely({
      action: 'STAFF_SESSION_REVOKED',
      targetUserId: uid,
      targetUserLoginId: userData.loginId || userData.email || uid,
      targetUserName: userData.name || 'Staff User',
      targetRole: userData.role || 'sales',
      performedByUserId: admin.uid,
      performedByUserName: admin.name || 'Administrator',
      timestamp: nowIso,
      details: `Revoked session ${sessionId} (${targetSession?.deviceName || 'Device'}) for ${userData.name || uid}`
    });

    return { success: true };
  } catch (err: any) {
    console.error('Error revoking device session:', err);
    return { success: false, error: err.message || 'Failed to revoke device session.' };
  }
}
