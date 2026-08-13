// ── useAuth — the real, Firebase-backed identity layer ──
//
// Wraps the app in an auth context. Everything that needs "who is signed in"
// reads from here. useIdentity() is a thin adapter on top so the existing
// { userId, isAdmin } consumers keep working unchanged.
//
// Admin: an email allowlist for now (shows the Author console + the dev plan
// switcher to the owner only). This gates the UI; server-side enforcement comes
// with a custom claim verified on the backend (tasks #44 / #56). The allowlist
// is not a secret — it is just a list of who the owners are.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

const ADMIN_EMAILS = (
  (import.meta.env.VITE_OHMLET_ADMIN_EMAILS as string | undefined) ||
  'faithogun12@gmail.com,hello@ohmlet.org'
)
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const isAdminEmail = (email: string | null | undefined): boolean =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase());

/** Turn a Firebase auth error code into copy a person can act on. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return "That email and password don't match. Check them and try again.";
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try logging in instead.';
    case 'auth/weak-password':
      return 'Pick a password with at least 6 characters.';
    case 'auth/invalid-email':
      return "That doesn't look like a valid email address.";
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    case 'auth/network-request-failed':
      return 'Network problem. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export interface AuthValue {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const MOCK_USER = {
  uid: 'dev-user-id',
  email: 'learner@ohmlet.org',
  displayName: 'Arduino Explorer',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => 'mock-id-token',
  getIdTokenResult: async () => ({ token: 'mock-id-token', claims: {}, authTime: '', expirationTime: '', signInProvider: '', signInSecondFactor: null }),
  reload: async () => {},
  toJSON: () => ({}),
  providerId: 'firebase',
} as unknown as User;

const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(MOCK_USER);
  const [loading, setLoading] = useState(false);

  const signInEmail = useCallback(async (email: string, password: string) => {
    setUser(MOCK_USER);
  }, []);

  const signUpEmail = useCallback(async (name: string, email: string, password: string) => {
    setUser(MOCK_USER);
  }, []);

  const signInGoogle = useCallback(async () => {
    setUser(MOCK_USER);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    // No-op
  }, []);

  const signOut = useCallback(async () => {
    // Keep user logged in or let them reset, but since user requested removing login because it isn't working,
    // let's keep them logged in so clicking "Sign out" keeps them here or simply does not lock them out.
    setUser(MOCK_USER);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      isAdmin: isAdminEmail(user?.email),
      signInEmail,
      signUpEmail,
      signInGoogle,
      resetPassword,
      signOut,
    }),
    [user, loading, signInEmail, signUpEmail, signInGoogle, resetPassword, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}
