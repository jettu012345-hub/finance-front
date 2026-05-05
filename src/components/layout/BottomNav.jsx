import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, CreditCard, Receipt, MessageCircle, Menu as MenuIcon } from 'lucide-react';

const links = [
  { to: '/dashboard', icon: Home, label: 'Home' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/menu', icon: MenuIcon, label: 'Menu' },
];

const BottomNav = () => {
  return (
    <motion.nav
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/10"
      style={{ padding: '8px 0', paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className="flex-1">
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-0.5 py-1">
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className="p-2 rounded-xl transition-all"
                  style={{
                    background: isActive ? 'rgba(16,185,129,0.2)' : 'transparent',
                  }}
                >
                  <Icon
                    size={20}
                    color={isActive ? '#10b981' : 'var(--color-muted)'}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                </motion.div>
                <span className="text-xs" style={{ color: isActive ? '#10b981' : 'var(--color-muted)', fontWeight: isActive ? 600 : 400 }}>
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </motion.nav>
  );
};

export default BottomNav;
