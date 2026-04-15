import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import { firebaseAuth, firebaseReady } from '../lib/firebase';
import {
  getUserProfile,
  updateUserProfile as updateUserProfileRecord,
  upsertUserProfileFromAuthUser,
} from '../lib/firebase-data';

const AuthContext = createContext();
const AUTH_PROVIDER = String(import.meta.env.VITE_AUTH_PROVIDER || 'firebase').trim().toLowerCase();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearSession = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setToken(null);
    setUser(null);
  }, []);

  const persistSession = useCallback((nextToken, nextUser) => {
    if (nextToken) {
      localStorage.setItem('authToken', nextToken);
      setToken(nextToken);
    }

    if (nextUser) {
      localStorage.setItem('authUser', JSON.stringify(nextUser));
      setUser(nextUser);
    }

  }, []);

  useEffect(() => {
    if (AUTH_PROVIDER !== 'firebase') {
      setLoading(false);
      setError('Only Firebase auth provider is supported in this build. Set VITE_AUTH_PROVIDER=firebase.');
      return undefined;
    }

    if (!firebaseReady || !firebaseAuth) {
      setLoading(false);
      setError('Firebase Auth is not configured. Add VITE_FIREBASE_* values.');
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (nextAuthUser) => {
      if (!nextAuthUser) {
        clearSession();
        setLoading(false);
        return;
      }

      try {
        const freshToken = await nextAuthUser.getIdToken();
        const profile = await upsertUserProfileFromAuthUser(nextAuthUser);
        persistSession(freshToken, profile);
        setError(null);
      } catch (authError) {
        console.error('Failed to bootstrap Firebase auth session:', authError);
        clearSession();
        setError('Failed to initialize your session. Please sign in again.');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [clearSession, persistSession]);

  const signup = useCallback(async (userData) => {
    if (!firebaseReady || !firebaseAuth) {
      return { success: false, error: 'Firebase Auth is not configured.' };
    }

    setLoading(true);
    setError(null);

    try {
      const email = String(userData?.email || '').trim().toLowerCase();
      const password = String(userData?.password || '');
      const name = String(userData?.name || '').trim();

      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);

      if (name) {
        await updateFirebaseProfile(credential.user, { displayName: name });
      }

      const profile = await upsertUserProfileFromAuthUser(credential.user, {
        name,
        email,
        role: userData?.role,
        termsAccepted: Boolean(userData?.termsAccepted),
        termsAcceptedAt: userData?.termsAcceptedAt || null,
        provider: 'firebase',
      });

      const idToken = await credential.user.getIdToken();
      persistSession(idToken, profile);
      return { success: true, user: profile };
    } catch (err) {
      const message = err?.message || 'Signup failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const login = useCallback(async (email, password) => {
    if (!firebaseReady || !firebaseAuth) {
      return { success: false, error: 'Firebase Auth is not configured.' };
    }

    setLoading(true);
    setError(null);

    try {
      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        String(email || '').trim().toLowerCase(),
        String(password || '')
      );

      const [idToken, profile] = await Promise.all([
        credential.user.getIdToken(),
        getUserProfile(credential.user.uid),
      ]);

      const resolvedProfile = profile || await upsertUserProfileFromAuthUser(credential.user, { provider: 'firebase' });

      if (resolvedProfile?.status === 'suspended') {
        await signOut(firebaseAuth);
        throw new Error('Your account is suspended. Please contact support.');
      }

      persistSession(idToken, resolvedProfile);
      return { success: true, user: resolvedProfile };
    } catch (err) {
      const message = err?.message || 'Login failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const googleAuth = useCallback(async (credential, role = 'participant', profile = {}, options = {}) => {
    if (!firebaseReady || !firebaseAuth) {
      return { success: false, error: 'Firebase Auth is not configured.' };
    }

    setLoading(true);
    setError(null);

    try {
      const firebaseCredential = GoogleAuthProvider.credential(String(credential || '').trim());
      const signed = await signInWithCredential(firebaseAuth, firebaseCredential);

      const mergedProfile = await upsertUserProfileFromAuthUser(signed.user, {
        role,
        ...profile,
        termsAccepted: Boolean(options.termsAccepted),
        termsAcceptedAt: options.termsAcceptedAt || null,
        provider: 'google.com',
      });

      if (mergedProfile?.status === 'suspended') {
        await signOut(firebaseAuth);
        throw new Error('Your account is suspended. Please contact support.');
      }

      const idToken = await signed.user.getIdToken();
      persistSession(idToken, mergedProfile);
      return { success: true, user: mergedProfile };
    } catch (err) {
      const friendlyError = err?.message || 'Google sign-in failed';
      setError(friendlyError);
      return { success: false, error: friendlyError };
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      if (firebaseAuth) {
        await signOut(firebaseAuth);
      }
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      clearSession();
      setLoading(false);
    }
  }, [clearSession]);

  const updateProfile = useCallback(async (updates) => {
    if (!token || !user?.id) {
      throw new Error('Not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const nextUser = await updateUserProfileRecord(user.id, updates || {});
      persistSession(token, nextUser);
      return nextUser;
    } catch (err) {
      setError(err?.message || 'Profile update failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [persistSession, token, user?.id]);

  const findRegisteredUserByEmail = useCallback((email) => {
    if (!email) return null;

    const normalized = String(email).trim().toLowerCase();
    const currentEmail = String(user?.email || '').trim().toLowerCase();
    if (normalized && currentEmail && normalized === currentEmail) {
      return user;
    }

    const storedUser = localStorage.getItem('authUser');
    if (!storedUser) return null;

    try {
      const parsed = JSON.parse(storedUser);
      if (String(parsed?.email || '').trim().toLowerCase() === normalized) {
        return parsed;
      }
    } catch {
      return null;
    }

    return null;
  }, [user]);

  const contextValue = useMemo(() => ({
    user,
    token,
    loading,
    error,
    signup,
    login,
    googleAuth,
    logout,
    updateProfile,
    findRegisteredUserByEmail,
  }), [user, token, loading, error, signup, login, googleAuth, logout, updateProfile, findRegisteredUserByEmail]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
