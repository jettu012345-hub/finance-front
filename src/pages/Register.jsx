import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import { Trophy, User, Phone, KeyRound, ArrowRight, Loader, RefreshCw, Clock, Lock } from 'lucide-react';

const OTP_SECONDS = 30;

const Register = () => {
  const [step, setStep] = useState('form'); // form | otp
  const [form, setForm] = useState({ mobile: '', username: '', otp: '' });
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockMsg, setLockMsg] = useState('');
  const { register } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const startOTPFlow = (newOtp) => {
    setDevOtp(newOtp);
    setForm(f => ({ ...f, otp: '' }));
    setCountdown(OTP_SECONDS);
    setStep('otp');
  };

  const sendOTP = async () => {
    if (!form.mobile || !form.username) return toast.error('All fields required');
    if (form.mobile.length < 10) return toast.error('Enter valid 10-digit mobile number');
    setLoading(true);
    try {
      const res = await authService.registerSendOTP(form.mobile);
      toast.success('OTP sent!');
      startOTPFlow(res.data.otp);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP';
      toast.error(msg);
      if (err.response?.status === 403) { setLocked(true); setLockMsg(msg); }
    } finally { setLoading(false); }
  };

  const resendOTP = async () => {
    setLoading(true);
    try {
      const res = await authService.resendOTP(form.mobile);
      toast.success('New OTP sent!');
      startOTPFlow(res.data.otp);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed';
      toast.error(msg);
      if (err.response?.status === 403) { setLocked(true); setLockMsg(msg); }
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (form.otp.length < 6) return toast.error('Enter 6-digit OTP');
    setLoading(true);
    const result = await register({ mobile: form.mobile, username: form.username, otp: form.otp });
    setLoading(false);
    if (result.success) {
      toast.success('Account created! 🏏');
      navigate('/dashboard');
    } else {
      toast.error(result.message);
      if (result.invalidated) {
        setForm(f => ({ ...f, otp: '' }));
        setDevOtp('');
        setCountdown(0);
      }
      if (result.locked) { setLocked(true); setLockMsg(result.message); }
    }
  };

  const inputStyle = {
    background: 'transparent', outline: 'none',
    color: 'var(--color-text)', flex: 1,
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1f1a 50%, #0a0f1e 100%)' }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: '#10b981', top: '-10%', right: '-20%' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 0 30px rgba(16,185,129,0.3)' }}>
            <Trophy size={28} color="white" />
          </div>
          <h1 className="text-2xl font-black gradient-text">Create Account</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Join Cricket Finance</p>
        </div>

        <div className="glass p-6 rounded-2xl">
          <AnimatePresence mode="wait">
            {step === 'form' ? (
              <motion.div key="form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-muted)' }}>Username</label>
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <User size={16} color="#10b981" />
                      <input type="text" style={inputStyle} placeholder="Your name" value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--color-muted)' }}>Mobile Number</label>
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <Phone size={16} color="#10b981" />
                      <span className="text-sm font-medium" style={{ color: '#10b981' }}>+91</span>
                      <input type="tel" maxLength={10} style={inputStyle} placeholder="9876543210" value={form.mobile}
                        onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })} />
                    </div>
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={sendOTP} disabled={loading}
                    className="py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white' }}>
                    {loading ? <Loader size={18} className="animate-spin" /> : <><span>Send OTP</span><ArrowRight size={18} /></>}
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound size={18} color="#10b981" />
                  <h2 className="font-bold" style={{ color: 'var(--color-text)' }}>Verify OTP</h2>
                </div>
                <p className="text-sm mb-3" style={{ color: 'var(--color-muted)' }}>Sent to +91 {form.mobile}</p>

                {devOtp && (
                  <div className="p-2 rounded-lg mb-3 text-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
                    <p className="text-xs" style={{ color: '#f59e0b' }}>🔧 Dev OTP: <strong>{devOtp}</strong></p>
                  </div>
                )}

                {locked ? (
                  <div className="p-3 rounded-xl mb-4 flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <Lock size={14} color="#ef4444" />
                    <p className="text-xs" style={{ color: '#ef4444' }}>{lockMsg}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Clock size={14} color={countdown > 0 ? '#10b981' : 'var(--color-muted)'} />
                      {countdown > 0
                        ? <span className="text-sm font-medium" style={{ color: '#10b981' }}>OTP valid for {countdown}s</span>
                        : <span className="text-sm" style={{ color: 'var(--color-muted)' }}>OTP expired</span>
                      }
                    </div>

                    <input type="tel" maxLength={6} value={form.otp}
                      disabled={countdown === 0}
                      onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, '') })}
                      placeholder="------"
                      className="w-full p-3 rounded-xl text-center text-2xl font-bold tracking-widest mb-4 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${countdown > 0 ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.3)'}`, color: 'var(--color-text)', letterSpacing: '0.5em', opacity: countdown === 0 ? 0.5 : 1 }} />

                    {countdown > 0 ? (
                      <motion.button whileTap={{ scale: 0.97 }} onClick={handleRegister} disabled={loading || form.otp.length < 6}
                        className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 mb-3"
                        style={{ background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', opacity: form.otp.length < 6 ? 0.6 : 1 }}>
                        {loading ? <Loader size={18} className="animate-spin" /> : 'Create Account 🏏'}
                      </motion.button>
                    ) : (
                      <motion.button whileTap={{ scale: 0.97 }} onClick={resendOTP} disabled={loading}
                        className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 mb-3"
                        style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                        {loading ? <Loader size={18} className="animate-spin" /> : <><RefreshCw size={16} /><span>Regenerate OTP</span></>}
                      </motion.button>
                    )}
                  </>
                )}

                <button onClick={() => setStep('form')} className="w-full text-sm py-2" style={{ color: 'var(--color-muted)' }}>
                  ← Back
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-sm mt-4" style={{ color: 'var(--color-muted)' }}>
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="font-semibold" style={{ color: '#10b981' }}>Login</button>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
