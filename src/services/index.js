import api from './api';

export const authService = {
  sendOTP: (mobile) => api.post('/auth/send-otp', { mobile }),
  resendOTP: (mobile) => api.post('/auth/resend-otp', { mobile }),
  verifyOTP: (mobile, otp) => api.post('/auth/verify-otp', { mobile, otp }),
  registerSendOTP: (mobile) => api.post('/auth/register/send-otp', { mobile }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  updateSettings: (data) => api.patch('/auth/settings', data),
  deleteAccount: () => api.delete('/auth/account'),
};

export const teamService = {
  create: (data) => api.post('/team/create', data),
  join: (code) => api.post('/team/join', { code }),
  approve: (userId, action) => api.post('/team/approve', { userId, action }),
  getMyTeam: () => api.get('/team/my'),
  getMyTeams: () => api.get('/team/all'),
  switchTeam: (teamId) => api.patch('/team/switch', { teamId }),
  promote: (userId, role) => api.patch('/team/promote', { userId, role }),
  uploadQR: (formData) => api.post('/team/upload-qr', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  removePlayer: (userId) => api.post('/team/remove', { userId }),
  updateAlias: (userId, alias) => api.post('/team/alias', { userId, alias }),
};

export const paymentService = {
  // Legacy direct add
  add:            (data) => api.post('/payment', data),
  getAll:         (params) => api.get('/payment', { params }),
  getSummary:     () => api.get('/payment/summary'),

  // Payment request lifecycle (new flow)
  createRequest:  (data) => api.post('/payment/request', data),
  markCash:       (requestId, userId, amount) => api.post(`/payment/request/${requestId}/cash`, { userId, amount }),
  markDone:       (data) => api.post('/payment/mark-done', data),
  verify:         (data) => api.patch('/payment/verify', data),  // { requestId, userId, action, rejectionNote? }

  // Queries
  getRequests:    (params) => api.get('/payment/requests', { params }),
  getMyRequests:  () => api.get('/payment/requests/my'),
  getAllLedgers:  () => api.get('/payment/ledger'),
  getMyLedger:   () => api.get('/payment/ledger/me'),
};


export const expenseService = {
  add: (data) => api.post('/expense', data),
  getAll: (params) => api.get('/expense', { params }),
};

export const balanceService = {
  add: (data) => api.post('/balance/add', data),
  getHistory: () => api.get('/balance'),
};

export const chatService = {
  getMessages: () => api.get('/chat'),
  send: (message) => api.post('/chat', { message }),
};

export const notificationService = {
  getAll: () => api.get('/notification'),
  markRead: () => api.patch('/notification/read'),
  getUnreadCount: () => api.get('/notification/unread-count'),
};

export const reportService = {
  daily: (date) => api.get('/report/daily', { params: { date } }),
  full: () => api.get('/report/full'),
};

export const adminService = {
  resetDb: () => api.delete('/admin/reset-db'),
};
