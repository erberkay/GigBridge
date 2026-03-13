import { create } from 'zustand';
import { UserType, OrgRole } from '../types';

interface AuthState {
  userId: string | null;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  userType: UserType | null;
  orgId: string | null;
  orgRole: OrgRole | null;
  orgName: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: {
    userId: string;
    email: string;
    displayName: string;
    photoURL?: string;
    userType: UserType;
    orgId?: string | null;
    orgRole?: OrgRole | null;
    orgName?: string | null;
  }) => void;
  setOrgInfo: (orgId: string, orgRole: OrgRole, orgName: string) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  updatePhotoURL: (url: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  userId: null,
  email: null,
  displayName: null,
  photoURL: null,
  userType: null,
  orgId: null,
  orgRole: null,
  orgName: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL ?? null,
      userType: user.userType,
      orgId: user.orgId ?? null,
      orgRole: user.orgRole ?? null,
      orgName: user.orgName ?? null,
      isAuthenticated: true,
      isLoading: false,
    }),

  setOrgInfo: (orgId, orgRole, orgName) => set({ orgId, orgRole, orgName }),

  clearUser: () =>
    set({
      userId: null,
      email: null,
      displayName: null,
      photoURL: null,
      userType: null,
      orgId: null,
      orgRole: null,
      orgName: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  setLoading: (loading) => set({ isLoading: loading }),
  updatePhotoURL: (url) => set({ photoURL: url }),
}));
