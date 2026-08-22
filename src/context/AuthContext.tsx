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
  browserSessionPersistence
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
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { AuthUser, UserRole } from '../types';
import { resolveLoginIdToEmail } from '../services/staffAuthService';

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
  login: (loginIdentifier: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
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
        // Auto-provision admin profile for designated admin accounts or first user
        const isAdminAccount = user.email?.toLowerCase() === 'admin@glowzaa.com' || 
                               user.email?.toLowerCase() === 'rakibseohub@gmail.com';
        
        const nowIso = new Date().toISOString();
        const roleToAssign: UserRole = isAdminAccount ? 'admin' : 'sales';
        const nameToAssign = user.displayName || (isAdminAccount ? 'Glowzaa Admin' : 'Staff Member');
        const initials = nameToAssign.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'GA';
        const defaultLoginId = user.email ? user.email.split('@')[0].toLowerCase() : (isAdminAccount ? 'admin' : `user_${user.uid.slice(0, 5)}`);

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
          title: roleToAssign === 'admin' ? 'System Administrator' : 'Sales Executive',
          department: roleToAssign === 'admin' ? 'Operations & Executive HQ' : 'Field Sales & Accounts',
          staffId: roleToAssign === 'admin' ? 'ADM-001' : 'STF-001'
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
        commissionRate: data.commissionRate
      };

      return profile;
    } catch (err: any) {
      console.warn('Firestore user profile fetch notice:', err?.message || err);
      
      const isAdminAccount = user.email?.toLowerCase() === 'admin@glowzaa.com' || 
                             user.email?.toLowerCase() === 'rakibseohub@gmail.com';
      const roleToAssign: UserRole = isAdminAccount ? 'admin' : 'sales';
      const nameToAssign = user.displayName || (isAdminAccount ? 'Glowzaa Admin' : 'Staff Member');
      const initials = nameToAssign.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'GA';

      const fallbackProfile: AuthUser = {
        uid: user.uid,
        id: user.uid,
        loginId: user.email ? user.email.split('@')[0] : 'staff',
        name: nameToAssign,
        email: user.email || '',
        phone: '',
        role: roleToAssign,
        status: 'active',
        createdAt: new Date().toISOString(),
        avatar: initials,
        title: roleToAssign === 'admin' ? 'System Administrator' : 'Sales Executive',
        department: roleToAssign === 'admin' ? 'Operations & Executive HQ' : 'Field Sales & Accounts',
        staffId: roleToAssign === 'admin' ? 'ADM-001' : 'STF-001'
      };

      return fallbackProfile;
    }
  };

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsLoading(true);
      if (user) {
        const profile = await fetchUserProfile(user);
        if (profile) {
          if (profile.status === 'inactive') {
            await firebaseSignOut(auth);
            setFirebaseUser(null);
            setCurrentUser(null);
            setAuthError('Your account has been disabled. Please contact the administrator.');
          } else {
            setFirebaseUser(user);
            setCurrentUser(profile);
            setAuthError(null);
          }
        } else {
          await firebaseSignOut(auth);
          setFirebaseUser(null);
          setCurrentUser(null);
          setAuthError('Access Denied: Could not load staff profile.');
        }
      } else {
        setFirebaseUser(null);
        setCurrentUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

      // Set persistence based on "Remember Me"
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);

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
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setCurrentUser(null);
      setAuthError(null);
    } catch (err) {
      console.error('Error signing out of Firebase:', err);
    } finally {
      setIsLoading(false);
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
        login,
        register,
        logout,
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

