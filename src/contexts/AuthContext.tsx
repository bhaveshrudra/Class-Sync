import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type UserRole = 'student' | 'admin' | null;

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  year?: string | null;
  branch?: string | null;
  section?: string | null;
  roll_number?: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  profile: null,
  loading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    try {
      // In Phase 2, the profiles table might not be created yet.
      // We structure this so it works gracefully when it is added.
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, year, branch, section, roll_number')
        .eq('id', userId)
        .single();
        
      if (error) {
        // Fallback: If roll_number column is missing before migration 00008, retry without roll_number
        if (error.message && error.message.includes('roll_number')) {
          const fallbackRes = await supabase
            .from('profiles')
            .select('id, name, email, role, year, branch, section')
            .eq('id', userId)
            .single();
          if (fallbackRes.data) {
            setRole(fallbackRes.data.role as UserRole);
            setProfile(fallbackRes.data as UserProfile);
            return;
          }
        }
        setRole(null);
        setProfile(null);
      } else if (data) {
        setRole(data.role as UserRole);
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error("Error fetching user profile/role:", err);
      setRole(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchUserRole(session.user.id);
    }
  };

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setRole(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, profile, loading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
