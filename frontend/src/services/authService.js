import api from './api';

export const authService = {
  requestOTP: (phone, purpose = 'register') =>
    api.post('/users/auth/request-otp/', { phone, purpose }),
  verifyOTP: (phone, code, purpose = 'register', userType = 'buyer') =>
    api.post('/users/auth/verify-otp/', { phone, code, purpose, user_type: userType }),
  getMe: () => api.get('/users/me/'),
};
