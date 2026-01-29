
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  full_name_normalized: string;
  device_id: string;
  phone?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (firstName: string, lastName: string, phone?: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  forceLogoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Generate or get device ID
  const getDeviceId = () => {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  };

  // Normalize name for admin comparison
  const normalizeName = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  // Check if user is admin
  const isAdmin = () => {
    if (!user) return false;
    const normalizedFirst = normalizeName(user.first_name);
    const normalizedLast = normalizeName(user.last_name);
    return normalizedFirst === 'iago' && normalizedLast === 'diaz';
  };

  // Force logout all users (for admin reset)
  const forceLogoutAll = async () => {
    try {
      // Clear all device IDs in database
      await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Clear local storage
      localStorage.clear();
      setUser(null);
    } catch (error) {
      console.error('Error forcing logout for all users:', error);
      throw error;
    }
  };

  // Load user from localStorage and verify in database
  const loadUser = async () => {
    try {
      const deviceId = getDeviceId();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('device_id', deviceId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user:', error);
      }

      if (data) {
        setUser(data);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Login or register user
  const login = async (firstName: string, lastName: string, phone?: string) => {
    try {
      const deviceId = getDeviceId();
      const fullNameNormalized = `${firstName} ${lastName}`.toLowerCase();

      // Check if user with same name already exists (applies to everyone including admin)
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('full_name_normalized', fullNameNormalized);

      if (checkError) throw checkError;

      if (existingUsers && existingUsers.length > 0) {
        // For ALL users (including admin), they cannot have duplicate names
        throw new Error('duplicate_name');
      }

      // Try to find existing user by device_id
      const { data: existingDeviceUser, error: deviceError } = await supabase
        .from('users')
        .select('*')
        .eq('device_id', deviceId)
        .single();

      if (existingDeviceUser) {
        // Update existing user
        const { data, error } = await supabase
          .from('users')
          .update({
            first_name: firstName,
            last_name: lastName,
            full_name_normalized: fullNameNormalized,
            phone: phone || null,
          })
          .eq('device_id', deviceId)
          .select()
          .single();

        if (error) throw error;
        setUser(data);
      } else {
        // Create new user
        const { data, error } = await supabase
          .from('users')
          .insert({
            first_name: firstName,
            last_name: lastName,
            full_name_normalized: fullNameNormalized,
            device_id: deviceId,
            phone: phone || null,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            throw new Error('duplicate_name');
          }
          throw error;
        }
        setUser(data);
      }
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  // Logout
  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAdmin, forceLogoutAll }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
