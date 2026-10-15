'use client';
/**
 * The signed-in user's profile (and, for managers, how many requests wait on
 * them), loaded once per page and shared by the sidebar and the page.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isManager } from '@/lib/roles';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  team: string;
  role: string;
  is_admin: boolean;
}

export interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  /** Requests the user can approve right now (0 for non-managers). */
  queueCount: number;
  refresh: () => void;
}

const ProfileCtx = createContext<ProfileState | null>(null);

function LiveProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [queueCount, setQueueCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, team, role, is_admin')
        .eq('id', user.id)
        .single();
      if (data) {
        setProfile(data as Profile);
        if (isManager(data.role) || data.is_admin) {
          const { data: queue } = await supabase.rpc('approval_queue');
          setQueueCount(Array.isArray(queue) ? queue.length : 0);
        }
      }
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Pick up role changes or new requests when the user comes back to the tab.
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  return <ProfileCtx.Provider value={{ profile, loading, queueCount, refresh }}>{children}</ProfileCtx.Provider>;
}

/** Provides the profile unless an ancestor already does; `value` pins it (previews/tests). */
export function ProfileProvider({ children, value }: { children: ReactNode; value?: ProfileState }) {
  const parent = useContext(ProfileCtx);
  if (parent) return <>{children}</>;
  if (value) return <ProfileCtx.Provider value={value}>{children}</ProfileCtx.Provider>;
  return <LiveProfileProvider>{children}</LiveProfileProvider>;
}

export function useProfile(): ProfileState {
  return useContext(ProfileCtx) ?? { profile: null, loading: true, queueCount: 0, refresh: () => {} };
}
