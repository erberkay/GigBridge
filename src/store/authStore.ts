import { create } from 'zustand';
import { UserType } from '../types';

interface AuthState {
  userId: string | null;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  userType: UserType | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: {
    userId: string;
    email: string;
    displayName: string;
    photoURL?: string;
    userType: UserType;
  }) => void;
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
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) =>
    set({
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL ?? null,
      userType: user.userType,
      isAuthenticated: true,
      isLoading: false,
    }),

  clearUser: () =>
    set({
      userId: null,
      email: null,
      displayName: null,
      photoURL: null,
      userType: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  setLoading: (loading) => set({ isLoading: loading }),
  updatePhotoURL: (url) => set({ photoURL: url }),
}));
