import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  login: async (phone, code) => {
    const response = await api.post('/users/auth/verify-otp/', {
      phone, code, purpose: 'login'
    });
    const { access_token, refresh_token, user } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    set({ user, isAuthenticated: true });
    return response.data;
  },

  register: async (phone, code, userType) => {
    const response = await api.post('/users/auth/verify-otp/', {
      phone, code, purpose: 'register', user_type: userType
    });
    const { access_token, refresh_token, user } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    set({ user, isAuthenticated: true });
    return response.data;
  },

  fetchUser: async () => {
    try {
      const response = await api.get('/users/me/');
      set({ user: response.data, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
      localStorage.clear();
    }
  },

  logout: () => {
    localStorage.clear();
    set({ user: null, isAuthenticated: false });
  },
}));

export default useAuthStore;
