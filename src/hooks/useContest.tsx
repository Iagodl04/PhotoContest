
import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ContestSettings {
  id: string;
  title: string;
  subtitle: string;
  end_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

interface ContestContextType {
  settings: ContestSettings | null;
  categories: Category[];
  isLoading: boolean;
  isContestActive: () => boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (updates: Partial<ContestSettings>) => Promise<void>;
}

const ContestContext = createContext<ContestContextType | undefined>(undefined);

export function ContestProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ContestSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isContestActive = () => {
    if (!settings) return false;
    const now = new Date();
    const endDate = new Date(settings.end_at);
    return settings.is_active && now < endDate;
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('global_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error loading contest settings:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const refreshSettings = async () => {
    await Promise.all([loadSettings(), loadCategories()]);
  };

  const updateSettings = async (updates: Partial<ContestSettings>) => {
    try {
      if (!settings) throw new Error('No settings to update');

      const { data, error } = await supabase
        .from('global_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadSettings(), loadCategories()]);
      setIsLoading(false);
    };

    loadData();
  }, []);

  return (
    <ContestContext.Provider value={{
      settings,
      categories,
      isLoading,
      isContestActive,
      refreshSettings,
      updateSettings,
    }}>
      {children}
    </ContestContext.Provider>
  );
}

export function useContest() {
  const context = useContext(ContestContext);
  if (context === undefined) {
    throw new Error('useContest must be used within a ContestProvider');
  }
  return context;
}
