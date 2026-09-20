import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const FEATURES = [
  {
    title: 'Log from anywhere',
    desc: 'Onshore or offshore, staff log daily hours against projects from any device.',
  },
  {
    title: 'Structured approvals',
    desc: 'Line manager and department sign-off, every step of the way.',
  },
  {
    title: 'Full visibility',
    desc: 'Every submission, every status, every week tracked in one place.',
  },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [, setLocation] = useLocation();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      setLocation('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await api.forgotPassword(forgotEmail);
      setForgotMsg(data.message);
    } catch (err: any) {
      setForgotMsg(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ── Left panel: dark teal brand ─────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] bg-navy-900 relative overflow-hidden">
        {/* soft radial accents */}
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-navy-700/40 blur-3xl" />
        <div className="absolute bottom-0 -left-24 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-4">
            <img
              src="/oriental-logo.jpg"
              alt="Oriental Energy Resources Limited"
              className="h-16 w-auto rounded-md bg-white/95 p-1.5 shadow-lg"
            />
          </div>

          <div className="space-y-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[2px] text-gray-400 mb-4">
                Time Management System
              </p>
              <h1 className="text-4xl font-bold text-white leading-tight mb-5">
                Every hour logged.<br />Every approval tracked.<br />Every week closed on time.
              </h1>
              <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
                The single source of truth for time across all Oriental Energy operations.
              </p>
            </div>

            <div className="space-y-5">
              {FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-gold-500/20 flex items-center justify-center">
                    <CheckCircle className="h-3.5 w-3.5 text-gold-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{f.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-gray-500 text-xs">© 2026 Oriental Energy Resources Limited. Confidential.</p>
        </div>
      </div>

      {/* ── Right panel: form ───────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img src="/oriental-logo.jpg" alt="Oriental Energy" className="h-14 w-auto rounded-md" />
          </div>

          {!showForgot ? (
            <>
              <h2 className="page-header-title">Sign in</h2>
              <p className="page-header-sub mb-8">Company email and password.</p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-3 bg-danger-bg border border-danger/20 rounded-lg text-danger text-sm font-medium"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="field-label">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@oriental-er.com"
                      className="input-base pl-11 py-3"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="input-base pl-11 pr-12 py-3"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy-900 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs font-semibold text-navy-700 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  disabled={isLoading}
                  className="btn-solid w-full py-3"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {isLoading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="page-header-title">Reset password</h2>
              <p className="page-header-sub mb-8">We'll send a reset link to your company email.</p>

              {forgotMsg && (
                <div className="mb-6 p-3 bg-success-bg border border-success/20 rounded-lg text-success text-sm font-medium">
                  {forgotMsg}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@oriental-er.com"
                    className="input-base pl-11 py-3"
                    required
                  />
                </div>
                <button type="submit" className="btn-solid w-full py-3">
                  Send Reset Link
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setForgotMsg(''); }}
                  className="w-full text-sm font-semibold text-gray-500 hover:text-navy-900 transition-colors"
                >
                  ← Back to Sign In
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
