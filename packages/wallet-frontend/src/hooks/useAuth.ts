import { useAuthStore } from '@/store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { getProfile } from '@/api/auth.api';
import type { Profile } from '@/types/auth';

export function useAuth() {
  const { token, paramId, userId, email, isAuthenticated, setAuth, clearAuth } =
    useAuthStore();

  return { token, paramId, userId, email, isAuthenticated, setAuth, clearAuth };
}

export function useProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery<Profile>({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}
