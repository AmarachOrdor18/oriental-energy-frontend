import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const FEATURES = [
  {
    title: 'Log from anywhere',
    desc:  'Onshore or offshore, staff log daily hours against projects from any device.',
  },
  {
    title: 'Structured approvals',
    desc:  'Line manager and department sign-off, every step of the way.',
  },
  {
    title: 'Full visibility',
    desc:  'Every submission, every status, every week tracked in one place.',
  },
];

export default function Login() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [isLoading, setIsLoading]       = useState(false);
  const [showForgot, setShowForgot]     = useState(false);
  const [forgotEmail, setForgotEmail]   = useState('');
  const [forgotMsg, setForgotMsg]       = useState('');
  const [, setLocation]                 = useLocation();
  const { login }                       = useAuth();

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
    <div className="min-h-screen bg-background flex">

      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[46%] bg-sidebar relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">

          {/* Brand */}
          <div className="flex items-center gap-4">
            <img
              src="/oriental-logo.jpg"
              alt="Oriental Energy Resources Limited"
              className="h-20 w-auto rounded-md"
            />
          </div>

          {/* Headline + features */}
          <div className="space-y-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-4">
                Time Management System
              </p>
              <h1 className="text-4xl font-bold text-accent leading-tight mb-5">
                Every hour logged.<br />Every approval tracked.<br />Every week closed on time.
              </h1>
              <p className="text-white/60 text-sm max-w-xs leading-relaxed">
                The single source of truth for time across all Oriental Energy operations
              </p>
            </div>

            {/* Feature list — replaces stats grid */}
            <div className="space-y-5">
              {FEATURES.map(f => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-accent/20 flex items-center justify-center">
                    <CheckCircle className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{f.title}</p>
                    <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/30 text-xs">© 2026 Oriental Energy Resources Limited. Confidential.</p>
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img
              src="/oriental-logo.jpg"
              alt="Oriental Energy Resources Limited"
              className="h-14 w-auto rounded-md"
            />
          </div>

          {!showForgot ? (
            <>
              <h2 className="text-2xl font-bold text-text_primary mb-1">Sign in</h2>
              <p className="text-sm text-text_secondary mb-8">Company email and password.</p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 dark:text-red-400 text-sm font-medium"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-text_secondary uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text_secondary" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@oriental-er.com"
                      className="w-full bg-surface border border-border rounded-lg pl-11 pr-4 py-3 text-sm text-text_primary placeholder:text-text_secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text_secondary uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text_secondary" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-surface border border-border rounded-lg pl-11 pr-12 py-3 text-sm text-text_primary placeholder:text-text_secondary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text_secondary hover:text-text_primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary_dark text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <ArrowRight className="h-4 w-4" />}
                  {isLoading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-text_primary mb-1">Reset password</h2>
              <p className="text-sm text-text_secondary mb-8">We'll send a reset link to your company email.</p>

              {forgotMsg && (
                <div className="mb-6 p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm font-medium">
                  {forgotMsg}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text_secondary" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="name@oriental-er.com"
                    className="w-full bg-surface border border-border rounded-lg pl-11 pr-4 py-3 text-sm text-text_primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary_dark text-white font-semibold py-3 rounded-lg transition-all shadow-lg shadow-primary/20"
                >
                  Send Reset Link
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForgot(false); setForgotMsg(''); }}
                  className="w-full text-sm font-semibold text-text_secondary hover:text-text_primary transition-colors"
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
