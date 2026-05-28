import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createClient } from '../utils/supabase/client';
import {
  getUserProfile,
  updateUserProfile as updateUserProfileRecord,
  upsertUserProfileFromAuthUser,
} from '../lib/supabase-data';

const AuthContext = createContext();
const supabase = createClient();

const ADMIN_EMAILS = String(process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map((value) => String(value || '').trim().toLowerCase())
  .filter(Boolean);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const clearSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      // Clear cookies starting with sb- to ensure Next.js middleware / server routes notice signout
      document.cookie.split(';').forEach((c) => {
        const name = c.trim().split('=')[0];
        if (name.startsWith('sb-')) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
    }
    setToken(null);
    setUser(null);
  }, []);

  const persistSession = useCallback((nextToken, nextUser) => {
    if (typeof window !== 'undefined') {
      if (nextToken) {
        localStorage.setItem('authToken', nextToken);
      }
      if (nextUser) {
        localStorage.setItem('authUser', JSON.stringify(nextUser));
      }
    }
    if (nextToken) setToken(nextToken);
    if (nextUser) setUser(nextUser);
  }, []);

  // Listen to auth changes
  useEffect(() => {
    let isMounted = true;

    // Load initial session from local storage if available to avoid flicker
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('authUser');
      const storedToken = localStorage.getItem('authToken');
      if (storedUser && storedToken) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        } catch (e) {
          // Ignore
        }
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (session) {
        // Validate the token is still live (getUser() triggers auto-refresh if needed)
        const { data: { user: validUser }, error: userError } = await supabase.auth.getUser();
        if (userError || !validUser) {
          // Token is expired and could not be refreshed — force sign-out
          await supabase.auth.signOut({ scope: 'local' });
          if (isMounted) {
            clearSession();
            setLoading(false);
          }
          return;
        }

        const nextToken = session.access_token;
        persistSession(nextToken, null);

        try {
          let profile = await getUserProfile(session.user.id);
          if (profile && !profile.email) {
            profile.email = session.user.email;
          }
          const intendedRole = session.user.user_metadata?.role;

          if (profile && intendedRole && profile.role !== intendedRole) {
            profile = await upsertUserProfileFromAuthUser(session.user, {
              ...profile,
              role: intendedRole,
              provider: session.user.app_metadata?.provider || 'supabase',
              accessToken: session.access_token,
              refreshToken: session.refresh_token,
            });
          } else if (!profile) {
            // Check if there was a role stored during OAuth signup flow
            const pendingRole = typeof window !== 'undefined'
              ? (localStorage.getItem('hm_oauth_role') || intendedRole || 'participant')
              : (intendedRole || 'participant');
            profile = await upsertUserProfileFromAuthUser(session.user, {
              role: pendingRole,
              provider: session.user.app_metadata?.provider || 'supabase',
              accessToken: session.access_token,
              refreshToken: session.refresh_token,
            });
            if (typeof window !== 'undefined') {
              localStorage.removeItem('hm_oauth_role');
            }
          }

          if (profile?.status === 'suspended') {
            await supabase.auth.signOut();
            clearSession();
            setError('Your account is suspended. Please contact support.');
          } else {
            if (profile && !profile.email && session.user.email) {
              profile.email = session.user.email;
            }
            persistSession(nextToken, profile);
            setError(null);
          }
        } catch (authError) {
          console.error('Failed to bootstrap auth session profile:', authError);
          clearSession();
          setError('Failed to initialize session profile.');
        }
      } else {
        clearSession();
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearSession, persistSession]);

  const signup = useCallback(async (userData) => {
    setLoading(true);
    setError(null);

    try {
      const email = String(userData?.email || '').trim().toLowerCase();
      const password = String(userData?.password || '');
      const name = String(userData?.name || '').trim();

      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: userData?.role || 'participant',
          },
        },
      });

      if (signupError) throw signupError;

      if (!data.user) {
        throw new Error('Signup failed: No user details returned.');
      }

      // Session is already automatically set by signUp in the client.

      const profile = await upsertUserProfileFromAuthUser(data.user, {
        name,
        email,
        role: userData?.role || 'participant',
        termsAccepted: Boolean(userData?.termsAccepted),
        termsAcceptedAt: userData?.termsAcceptedAt || null,
        provider: 'email',
        accessToken: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
      });

      // If user is already logged in (no email verification required or configured)
      if (data.session) {
        persistSession(data.session.access_token, profile);
      }

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
    setLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: String(email || '').trim().toLowerCase(),
        password: String(password || ''),
      });

      if (loginError) throw loginError;

      if (!data.user || !data.session) {
        throw new Error('Login failed: Invalid response from authentication provider.');
      }

      let profile = await getUserProfile(data.user.id);
      if (profile && !profile.email) {
        profile.email = data.user.email;
      }
      const intendedRole = data.user.user_metadata?.role;

      if (profile && intendedRole && profile.role !== intendedRole) {
        profile = await upsertUserProfileFromAuthUser(data.user, {
          ...profile,
          role: intendedRole,
          provider: 'email',
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
        });
      }

      const resolvedProfile = profile || await upsertUserProfileFromAuthUser(data.user, {
        role: intendedRole || 'participant',
        provider: 'email',
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      });

      if (resolvedProfile?.status === 'suspended') {
        await supabase.auth.signOut();
        throw new Error('Your account is suspended. Please contact support.');
      }

      persistSession(data.session.access_token, resolvedProfile);
      return { success: true, user: resolvedProfile };
    } catch (err) {
      let message = err?.message || 'Login failed';
      if (message.includes('Invalid login credentials')) {
        message = 'Account not found or wrong password. For admin access, sign in with your admin email and password.';
      }
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const googleAuth = useCallback(async (tokenOrOptions, roleOverride, _unused, extraOptions) => {
    setLoading(true);
    setError(null);

    const isTokenFlow = typeof tokenOrOptions === 'string';
    const options = isTokenFlow 
      ? { role: roleOverride, ...extraOptions } 
      : (tokenOrOptions || {});

    // Save desired role to localStorage so the auth state change listener can apply it if it's a new profile signup
    if (typeof window !== 'undefined' && options.role) {
      localStorage.setItem('hm_oauth_role', options.role);
    }

    try {
      if (isTokenFlow) {
        const { data: tokenData, error: tokenError } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: tokenOrOptions,
        });
        if (tokenError) throw tokenError;

        const profile = await upsertUserProfileFromAuthUser(tokenData.user, {
          name: String(options?.name || '').trim() || undefined,
          role: options?.role || 'participant',
          termsAccepted: options?.termsAccepted,
          termsAcceptedAt: options?.termsAcceptedAt,
          provider: 'google',
          accessToken: tokenData.session?.access_token,
          refreshToken: tokenData.session?.refresh_token,
        });

        if (profile?.status === 'suspended') {
          await supabase.auth.signOut();
          throw new Error('Your account is suspended. Please contact support.');
        }

        if (profile && !profile.email && tokenData.user?.email) {
          profile.email = tokenData.user.email;
        }

        if (tokenData.session) {
          persistSession(tokenData.session.access_token, profile);
        }
        return { success: true, user: profile };
      } else {
        const { data, error: googleError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/home` : undefined,
            queryParams: {
              prompt: 'select_account',
            },
          },
        });

        if (googleError) throw googleError;
        return { success: true };
      }
    } catch (err) {
      const message = err?.message || 'Google sign-in failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [persistSession]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      clearSession();
      setLoading(false);
    }
  }, [clearSession]);

  const updateProfile = useCallback(async (updates) => {
    if (!user?.id) {
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

  const resetPassword = useCallback(async (email) => {
    setLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        String(email || '').trim().toLowerCase(),
        {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
        }
      );
      if (resetError) throw resetError;
      return { success: true };
    } catch (err) {
      const message = err?.message || 'Failed to send reset email';
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const findRegisteredUserByEmail = useCallback((email) => {
    if (!email) return null;

    const normalized = String(email).trim().toLowerCase();
    const currentEmail = String(user?.email || '').trim().toLowerCase();
    if (normalized && currentEmail && normalized === currentEmail) {
      return user;
    }

    if (typeof window !== 'undefined') {
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
    resetPassword,
    findRegisteredUserByEmail,
  }), [user, token, loading, error, signup, login, googleAuth, logout, updateProfile, resetPassword, findRegisteredUserByEmail]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
