import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Users, Info, ChevronRight, Shield, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/authStore';
import useTeamStore from '../store/teamStore';
import Layout from '../components/layout/Layout';

const Menu = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { team } = useTeamStore();
  
  const [showAbout, setShowAbout] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <Layout>
      <div className="max-w-md mx-auto w-full pt-6 px-4">
        <h1 className="text-3xl font-black mb-8 tracking-tight" style={{ color: 'var(--color-text)' }}>
          Menu
        </h1>

        <div className="glass p-4 rounded-2xl mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl"
            style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>{user?.username}</h2>
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>{user?.mobile}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl overflow-hidden">
            <button onClick={() => navigate('/team')} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.2)', color: '#3b82f6' }}><Users size={20} /></div>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>My Teams</p>
                  <p className="text-xs" style={{ color: 'var(--color-muted)' }}>{team ? `Current: ${team.name}` : 'Manage teams'}</p>
                </div>
              </div>
              <ChevronRight size={20} color="var(--color-muted)" />
            </button>
            <button onClick={() => navigate('/profile')} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}><User size={20} /></div>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Profile Settings</p>
                  <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Update details</p>
                </div>
              </div>
              <ChevronRight size={20} color="var(--color-muted)" />
            </button>
          </div>

          <div className="glass rounded-2xl overflow-hidden">
            <button onClick={() => setShowAbout(true)} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}><Info size={20} /></div>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>About App</p>
                  <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Cricket Finance v1.0</p>
                </div>
              </div>
              <ChevronRight size={20} color="var(--color-muted)" />
            </button>
            <button onClick={() => setShowPrivacy(true)} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl" style={{ background: 'rgba(139,92,246,0.2)', color: '#8b5cf6' }}><Shield size={20} /></div>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--color-text)' }}>Privacy & Terms</p>
                  <p className="text-xs" style={{ color: 'var(--color-muted)' }}>Read our policies</p>
                </div>
              </div>
              <ChevronRight size={20} color="var(--color-muted)" />
            </button>
          </div>

          <div className="glass rounded-2xl overflow-hidden mt-8">
            <button onClick={logout} className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left text-red-400">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.2)' }}><LogOut size={20} /></div>
              <span className="font-bold text-sm">Log Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* About App Modal */}
      <AnimatePresence>
        {showAbout && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowAbout(false)}
          >
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass border border-white/10 rounded-3xl p-6 relative"
              style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}
            >
              <button onClick={() => setShowAbout(false)} className="absolute right-4 top-4 p-2 bg-white/5 rounded-full text-white/70 hover:text-white transition-colors">
                <X size={20} />
              </button>
              <div className="flex items-center gap-4 mb-6 mt-2">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-3xl"
                  style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                  🏆
                </div>
                <div>
                  <h2 className="text-xl font-black" style={{ color: 'var(--color-text)' }}>Cricket Finance</h2>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>Version 1.0.0</p>
                </div>
              </div>
              <div className="space-y-4 text-sm" style={{ color: 'var(--color-muted)' }}>
                <p>
                  Cricket Finance is a premium management platform designed to help local cricket teams track dues, manage expenses, and maintain full transparency without the hassle of WhatsApp groups and manual ledgers.
                </p>
                <p>
                  Built with modern web technologies to ensure real-time synchronization and a seamless mobile-first experience.
                </p>
                <div className="pt-4 border-t border-white/10 text-center text-xs opacity-70">
                  <p>© 2026 Cricket Finance. All rights reserved.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy & Terms Modal */}
      <AnimatePresence>
        {showPrivacy && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowPrivacy(false)}
          >
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass border border-white/10 rounded-3xl p-6 relative max-h-[80vh] flex flex-col"
              style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}
            >
              <button onClick={() => setShowPrivacy(false)} className="absolute right-4 top-4 p-2 bg-white/5 rounded-full text-white/70 hover:text-white transition-colors z-10">
                <X size={20} />
              </button>
              <h2 className="text-xl font-black mb-4 mt-2" style={{ color: 'var(--color-text)' }}>Privacy & Terms</h2>
              
              <div className="overflow-y-auto pr-2 space-y-4 text-sm mb-6" style={{ color: 'var(--color-muted)' }}>
                <div>
                  <h3 className="font-bold text-white mb-1">1. Data Collection</h3>
                  <p>We collect only the information necessary to provide our services: your mobile number, username, and the financial records you create within your teams.</p>
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">2. Team Privacy</h3>
                  <p>Financial data is strictly scoped to the team it belongs to. Only users who have been accepted into a team by its manager can view its ledgers and expenses.</p>
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">3. Payment Processing</h3>
                  <p>Cricket Finance does not directly process payments. We provide UPI deep-linking to securely open your device's installed payment apps. We do not store your banking details.</p>
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">4. User Responsibilities</h3>
                  <p>Users are responsible for accurately marking payments. Managers hold the final authority in verifying or rejecting payment claims.</p>
                </div>
              </div>
              
              <div className="mt-auto">
                <button onClick={() => setShowPrivacy(false)}
                  className="w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95"
                  style={{ background: 'var(--color-primary)' }}>
                  I Understand
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </Layout>
  );
};

export default Menu;
