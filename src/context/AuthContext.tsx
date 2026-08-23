import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { AuthUser, UserRole, DeviceSessionInfo } from '../types';
import { 
  resolveLoginIdToEmail, 
  getDeviceClientInfo, 
  registerOrUpdateDeviceSession, 
  logoutAllDevicesInFirestore, 
  revokeDeviceSessionInFirestore 
} from '../services/staffAuthService';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  loginId?: string;
  title?: string;
  department?: string;
  staffId?: string;
  territory?: string;
  assignedArea?: string;
  vehicleNumber?: string;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  currentSessionId: string;
  activeSessions: DeviceSessionInfo[];
  login: (loginIdentifier: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  logoutAllDevices: (alsoThisDevice?: boolean) => Promise<{ success: boolean; error?: string }>;
  revokeSession: (sessionId: string, targetUid?: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  clearError: () => void;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [currentSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        let sess = localStorage.getItem('glowzaa_client_session_id');
        if (!sess) {
          sess = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          localStorage.setItem('glowzaa_client_session_id', sess);
        }
        return sess;
      } catch {}
    }
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  });

  const [activeSessions, setActiveSessions] = useState<DeviceSessionInfo[]>([]);

  // Helper to safely format createdAt from Firestore Timestamp or string
  const formatCreatedAt = (val: any): string => {
    if (!val) return new Date().toISOString();
    if (typeof val === 'string') return val;
    if (val && typeof val.toDate === 'function') {
      try {
        return val.toDate().toISOString();
      } catch {
        return new Date().toISOString();
      }
    }
    return new Date().toISOString();
  };

  // Helper to fetch user profile from Firestore users/{uid}
  const fetchUserProfile = async (user: FirebaseUser): Promise<AuthUser | null> => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userSnapshot = await getDoc(userDocRef);

      if (!userSnapshot.exists()) {
        // Auto-provision admin profile ONLY for designated root admin accounts
        const isAdminAccount = user.email?.toLowerCase() === 'admin@glowzaa.com' || 
                               user.email?.toLowerCase() === 'rakibseohub@gmail.com';
        
        if (!isAdminAccount) {
          console.warn(`No Firestore staff profile document found for UID: ${user.uid} (${user.email}). Denying unprovisioned access.`);
          return null;
        }
        
        const nowIso = new Date().toISOString();
        const roleToAssign: UserRole = 'admin';
        const nameToAssign = user.displayName || 'Glowzaa Admin';
        const initials = nameToAssign.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'GA';
        const defaultLoginId = user.email ? user.email.split('@')[0].toLowerCase() : 'admin';

        const autoProfile: AuthUser = {
          uid: user.uid,
          id: user.uid,
          loginId: defaultLoginId,
          name: nameToAssign,
          email: user.email || '',
          phone: '',
          role: roleToAssign,
          status: 'active',
          createdAt: nowIso,
          avatar: initials,
          title: 'System Administrator',
          department: 'Operations & Executive HQ',
          staffId: 'ADM-001'
        };

        // Write to Firestore document users/{uid}
        try {
          await setDoc(userDocRef, {
            uid: autoProfile.uid,
            id: autoProfile.uid,
            loginId: autoProfile.loginId,
            name: autoProfile.name,
            email: autoProfile.email,
            phone: autoProfile.phone,
            role: autoProfile.role,
            status: autoProfile.status,
            createdAt: serverTimestamp(),
            avatar: autoProfile.avatar,
            title: autoProfile.title,
            department: autoProfile.department,
            staffId: autoProfile.staffId
          }, { merge: true });
        } catch (setErr) {
          console.warn('Could not sync newly provisioned profile to Firestore:', setErr);
        }

        return autoProfile;
      }

      const data = userSnapshot.data();
      const profile: AuthUser = {
        uid: user.uid,
        id: user.uid,
        loginId: data.loginId || (user.email ? user.email.split('@')[0] : user.uid.slice(0, 6)),
        name: data.name || user.displayName || 'Glowzaa Member',
        email: user.email || data.email || '',
        phone: data.phone || '',
        role: (data.role as UserRole) || 'admin',
        status: (data.status as 'active' | 'inactive') || 'active',
        createdAt: formatCreatedAt(data.createdAt),
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        lastLoginAt: data.lastLoginAt ? formatCreatedAt(data.lastLoginAt) : undefined,
        updatedAt: data.updatedAt ? formatCreatedAt(data.updatedAt) : undefined,
        avatar: data.avatar || (data.name ? data.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'GZ'),
        photoURL: data.photoURL || user.photoURL || undefined,
        title: data.title || (data.role === 'admin' ? 'System Administrator' : data.role === 'sales' ? 'Field Sales Executive' : 'Delivery Courier'),
        department: data.department || (data.role === 'admin' ? 'Operations & Executive HQ' : data.role === 'sales' ? 'Wholesale Field Sales' : 'Logistics & Fleet'),
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
        sessionRevokedAt: data.sessionRevokedAt,
        sessionVersion: data.sessionVersion,
        activeSessions: Array.isArray(data.activeSessions) ? data.activeSessions : []
      };

      return profile;
    } catch (err: any) {
      console.warn('Firestore user profile fetch notice:', err?.message || err);
      
      const isAdminAccount = user.email?.toLowerCase() === 'admin@glowzaa.com' || 
                             user.email?.toLowerCase() === 'rakibseohub@gmail.com';
      if (!isAdminAccount) {
        return null;
      }
      const roleToAssign: UserRole = 'admin';
      const nameToAssign = user.displayName || 'Glowzaa Admin';
      const initials = nameToAssign.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'GA';

      const fallbackProfile: AuthUser = {
        uid: user.uid,
        id: user.uid,
        loginId: user.email ? user.email.split('@')[0] : 'admin',
        name: nameToAssign,
        email: user.email || '',
        phone: '',
        role: roleToAssign,
        status: 'active',
        createdAt: new Date().toISOString(),
        avatar: initials,
        title: 'System Administrator',
        department: 'Operations & Executive HQ',
        staffId: 'ADM-001'
      };

      return fallbackProfile;
    }
  };

  // Listen to Firebase Auth state changes & Firestore live session synchronization
  useEffect(() => {
    let unsubscribeFirestoreDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeFirestoreDoc) {
        unsubscribeFirestoreDoc();
        unsubscribeFirestoreDoc = null;
      }

      setIsLoading(true);
      if (user) {
        const profile = await fetchUserProfile(user);
        if (profile) {
          if (profile.status === 'inactive') {
            await firebaseSignOut(auth);
            setFirebaseUser(null);
            setCurrentUser(null);
            setActiveSessions([]);
            setAuthError('Your account has been disabled. Please contact the administrator.');
            setIsLoading(false);
            return;
          }

          // Register this device session in Firestore
          const deviceInfo = getDeviceClientInfo(currentSessionId);
          let sessionCreatedAt = '';
          try {
            sessionCreatedAt = localStorage.getItem('glowzaa_session_created_at') || '';
            if (!sessionCreatedAt) {
              sessionCreatedAt = deviceInfo.createdAt;
              localStorage.setItem('glowzaa_session_created_at', sessionCreatedAt);
            }
          } catch {
            sessionCreatedAt = deviceInfo.createdAt;
          }
          deviceInfo.createdAt = sessionCreatedAt;

          await registerOrUpdateDeviceSession(user.uid, deviceInfo);

          setFirebaseUser(user);
          setCurrentUser(profile);
          setAuthError(null);

          // Listen live to users/{uid} document for real-time remote session revocation & status changes
          unsubscribeFirestoreDoc = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (!docSnap.exists()) return;
            const data = docSnap.data();

            // 1. Account disabled check
            if (data.status === 'inactive') {
              firebaseSignOut(auth);
              setFirebaseUser(null);
              setCurrentUser(null);
              setActiveSessions([]);
              setAuthError('Your account has been disabled by HQ Administrator.');
              return;
            }

            const rawSessions: DeviceSessionInfo[] = Array.isArray(data.activeSessions) ? data.activeSessions : [];
            
            // 2. Cross-device remote logout check
            const revokedAt = data.sessionRevokedAt;
            const sessionCreationTime = new Date(sessionCreatedAt || 0).getTime();
            const revocationTime = revokedAt ? new Date(revokedAt).getTime() : 0;
            const isCurrentSessionFound = rawSessions.some(s => s.sessionId === currentSessionId);

            if (revocationTime > sessionCreationTime && !isCurrentSessionFound) {
              try {
                localStorage.removeItem('glowzaa_session_created_at');
              } catch {}
              firebaseSignOut(auth);
              setFirebaseUser(null);
              setCurrentUser(null);
              setActiveSessions([]);
              setAuthError('You have been logged out because all sessions were terminated remotely. (সমস্ত ডিভাইস থেকে লগআউট সম্পন্ন হয়েছে)');
              return;
            }

            // Mark current session and sort
            const formattedSessions = rawSessions.map(s => ({
              ...s,
              isCurrent: s.sessionId === currentSessionId
            })).sort((a, b) => {
              if (a.isCurrent) return -1;
              if (b.isCurrent) return 1;
              return new Date(b.lastActiveAt || b.createdAt).getTime() - new Date(a.lastActiveAt || a.createdAt).getTime();
            });

            setActiveSessions(formattedSessions);

            setCurrentUser(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                name: data.name || prev.name,
                email: data.email || prev.email,
                phone: data.phone || prev.phone,
                role: data.role || prev.role,
                status: data.status || prev.status,
                avatar: data.avatar || prev.avatar,
                photoURL: data.photoURL || prev.photoURL,
                title: data.title || prev.title,
                department: data.department || prev.department,
                sessionRevokedAt: data.sessionRevokedAt,
                sessionVersion: data.sessionVersion,
                activeSessions: formattedSessions
              };
            });
          }, (err) => {
            console.warn('Firestore live user profile subscription notice:', err);
          });

        } else {
          await firebaseSignOut(auth);
          setFirebaseUser(null);
          setCurrentUser(null);
          setActiveSessions([]);
          setAuthError('Access Denied: Could not load staff profile.');
        }
      } else {
        setFirebaseUser(null);
        setCurrentUser(null);
        setActiveSessions([]);
      }
      setIsLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestoreDoc) {
        unsubscribeFirestoreDoc();
      }
    };
  }, [currentSessionId]);

  const clearError = () => {
    setAuthError(null);
  };

  const refreshUserProfile = async () => {
    if (auth.currentUser) {
      const profile = await fetchUserProfile(auth.currentUser);
      if (profile) {
        if (profile.status === 'inactive') {
          await logout();
          setAuthError('Your account has been disabled. Please contact the administrator.');
        } else {
          setCurrentUser(profile);
        }
      }
    }
  };

  // Real Firebase Sign-In supporting both Login ID (Username) and Email
  const login = async (loginIdentifier: string, password: string, rememberMe: boolean = true): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);

    const cleanInput = loginIdentifier.trim();
    if (!cleanInput && !password) {
      const msg = 'Login ID / Email and password are required.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
    if (!cleanInput) {
      const msg = 'Login ID / Email is required.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
    if (!password) {
      const msg = 'Password is required.';
      setAuthError(msg);
      return { success: false, error: msg };
    }

    setIsLoading(true);

    try {
      // 1. Resolve Login ID to Authentication Email
      let authEmail = cleanInput.toLowerCase();
      if (!cleanInput.includes('@')) {
        // Look up by loginId in Firestore users collection
        try {
          const q = query(collection(db, 'users'), where('loginId', '==', cleanInput.toLowerCase()));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            const foundData = querySnap.docs[0].data();
            authEmail = foundData.email || resolveLoginIdToEmail(cleanInput);
          } else {
            authEmail = resolveLoginIdToEmail(cleanInput);
          }
        } catch {
          authEmail = resolveLoginIdToEmail(cleanInput);
        }
      }

      // Set persistence based on "Remember Me" with resilient fallback against closing/restricted IndexedDB
      try {
        const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);
      } catch (persistErr) {
        console.warn('Auth persistence fallback to in-memory:', persistErr);
        try {
          await setPersistence(auth, inMemoryPersistence);
        } catch {
          // Continue even if setPersistence fails in restricted iframe/browser environments
        }
      }

      // Authenticate with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, authEmail, password);
      const user = userCredential.user;

      // Verify Firestore profile & check disabled status
      const profile = await fetchUserProfile(user);

      if (!profile) {
        await firebaseSignOut(auth);
        setFirebaseUser(null);
        setCurrentUser(null);
        setIsLoading(false);
        const errMsg = 'Access Denied: No staff profile document found for this account.';
        setAuthError(errMsg);
        return { success: false, error: errMsg };
      }

      if (profile.status === 'inactive') {
        await firebaseSignOut(auth);
        setFirebaseUser(null);
        setCurrentUser(null);
        setIsLoading(false);
        const errMsg = 'Your account has been disabled. Please contact the administrator.';
        setAuthError(errMsg);
        return { success: false, error: errMsg };
      }

      // Record session info
      const nowIso = new Date().toISOString();
      try {
        localStorage.setItem('glowzaa_session_created_at', nowIso);
      } catch {}

      const deviceInfo = getDeviceClientInfo(currentSessionId);
      deviceInfo.createdAt = nowIso;
      await registerOrUpdateDeviceSession(user.uid, deviceInfo);

      // Record lastLoginAt in Firestore
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          lastLoginAt: serverTimestamp()
        });
      } catch {}

      setFirebaseUser(user);
      setCurrentUser(profile);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      let errorMessage = 'Invalid Login ID or password. Please verify your credentials.';

      switch (err.code) {
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/Password sign-in is not enabled in Firebase Console.';
          break;
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          errorMessage = 'Incorrect Login ID or password. Please verify your credentials.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid login identifier format.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Your account has been disabled. Please contact the administrator.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed login attempts. Access temporarily locked. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network connection error. Please verify your internet connection.';
          break;
        default:
          errorMessage = err.message || 'Authentication failed.';
      }

      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Real Firebase Registration & Firestore Profile Creation
  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setAuthError(null);

    if (!data.name.trim()) {
      const msg = 'Full staff name is required.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
    if (!data.email.trim()) {
      const msg = 'Email address is required.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
    if (!data.password || data.password.length < 6) {
      const msg = 'Password must be at least 6 characters long.';
      setAuthError(msg);
      return { success: false, error: msg };
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
      const user = userCredential.user;

      const initials = data.name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'GA';
      const now = new Date().toISOString();
      const loginId = data.loginId || data.email.trim().split('@')[0].toLowerCase();

      const profile: AuthUser = {
        uid: user.uid,
        id: user.uid,
        loginId,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim() || '',
        role: data.role,
        status: 'active',
        createdAt: now,
        avatar: initials,
        title: data.title || (data.role === 'admin' ? 'System Administrator' : data.role === 'sales' ? 'Field Sales Executive' : 'Delivery Courier'),
        department: data.department || (data.role === 'admin' ? 'Operations & HQ' : data.role === 'sales' ? 'Wholesale Field Sales' : 'Logistics Fleet'),
        staffId: data.staffId || (data.role === 'admin' ? 'ADM-001' : 'STF-001'),
        territory: data.territory,
        assignedArea: data.assignedArea,
        vehicleNumber: data.vehicleNumber
      };

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: profile.uid,
        id: profile.uid,
        loginId: profile.loginId,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        status: profile.status,
        createdAt: serverTimestamp(),
        avatar: profile.avatar,
        title: profile.title,
        department: profile.department,
        staffId: profile.staffId || null,
        territory: profile.territory || null,
        assignedArea: profile.assignedArea || null,
        vehicleNumber: profile.vehicleNumber || null
      });

      setFirebaseUser(user);
      setCurrentUser(profile);
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      let errorMessage = 'Failed to create account.';

      switch (err.code) {
        case 'auth/operation-not-allowed':
          errorMessage = 'Email/Password authentication must be enabled in Firebase Console.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = 'An account with this email address already exists. Please log in with your credentials.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'The email address format is invalid.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak. Must be at least 6 characters.';
          break;
        default:
          errorMessage = err.message || 'Registration failed.';
      }

      setAuthError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Real Firebase Sign-Out
  const logout = async () => {
    setIsLoading(true);
    try {
      if (currentUser?.uid && currentSessionId) {
        await revokeDeviceSessionInFirestore(currentUser.uid, currentSessionId, currentUser).catch(() => {});
      }
      try {
        localStorage.removeItem('glowzaa_session_created_at');
      } catch {}
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setCurrentUser(null);
      setActiveSessions([]);
      setAuthError(null);
    } catch (err) {
      console.error('Error signing out of Firebase:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Log Out All Devices (Optionally keeping or terminating this device)
  const logoutAllDevices = async (alsoThisDevice: boolean = true): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser?.uid) {
      return { success: false, error: 'User is not authenticated.' };
    }

    setIsLoading(true);
    try {
      const res = await logoutAllDevicesInFirestore(
        currentUser.uid,
        alsoThisDevice ? undefined : currentSessionId,
        currentUser
      );

      if (res.success) {
        if (alsoThisDevice) {
          try {
            localStorage.removeItem('glowzaa_session_created_at');
          } catch {}
          await firebaseSignOut(auth);
          setFirebaseUser(null);
          setCurrentUser(null);
          setActiveSessions([]);
        } else {
          // Re-sync active sessions locally
          const currentDev = getDeviceClientInfo(currentSessionId);
          setActiveSessions([{ ...currentDev, isCurrent: true }]);
        }
        return { success: true };
      } else {
        return { success: false, error: res.error || 'Failed to terminate all sessions.' };
      }
    } catch (err: any) {
      console.error('Error in logoutAllDevices:', err);
      return { success: false, error: err.message || 'Failed to terminate sessions.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Revoke a single specific session
  const revokeSession = async (sessionId: string, targetUid?: string): Promise<{ success: boolean; error?: string }> => {
    const uid = targetUid || currentUser?.uid;
    if (!uid) return { success: false, error: 'User not identified.' };

    try {
      const res = await revokeDeviceSessionInFirestore(uid, sessionId, currentUser || undefined);
      if (res.success) {
        if (sessionId === currentSessionId) {
          await logout();
        } else {
          setActiveSessions(prev => prev.filter(s => s.sessionId !== sessionId));
        }
        return { success: true };
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to revoke device session.' };
    }
  };

  // Real Firebase Password Reset Email
  const resetPassword = async (email: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      let targetEmail = email.trim();
      if (!targetEmail.includes('@')) {
        targetEmail = resolveLoginIdToEmail(targetEmail);
      }
      await sendPasswordResetEmail(auth, targetEmail);
      return { 
        success: true, 
        message: `Password reset instructions sent to ${targetEmail}. Check your inbox or spam folder.` 
      };
    } catch (err: any) {
      let errorMessage = 'Failed to dispatch password reset email.';
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account registered with this email or Login ID.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      }
      return { success: false, error: errorMessage };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        isAuthenticated: Boolean(currentUser && firebaseUser),
        isLoading,
        authError,
        currentSessionId,
        activeSessions,
        login,
        register,
        logout,
        logoutAllDevices,
        revokeSession,
        resetPassword,
        clearError,
        refreshUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


