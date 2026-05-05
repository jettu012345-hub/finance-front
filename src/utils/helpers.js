export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export const formatTime = (date) =>
  new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export const formatDateTime = (date) => `${formatDate(date)}, ${formatTime(date)}`;

export const getInitials = (name = '') =>
  name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

export const getRoleColor = (role) => {
  const colors = {
    admin:   '#f59e0b', // gold  — backend only
    manager: '#10b981', // green — team creator/promoted
    player:  '#6366f1', // indigo — joined via code
    user:    '#6b7280', // grey  — no team yet
  };
  return colors[role] || '#6b7280';
};

export const getCategoryIcon = (category) => {
  const icons = { water: '💧', juice: '🥤', equipment: '🏏', ground: '🏟️', other: '📦' };
  return icons[category] || '📦';
};
