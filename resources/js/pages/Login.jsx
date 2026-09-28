import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  AlertCircle,
  UserCog,
  UserCheck,
  Smartphone,
  Wrench,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import temuLogo from '../assets/temu-logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const fillDemoCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  const demoAccounts = [
    {
      role: 'Admin',
      email: 'admin@temu.gov.ph',
      password: 'password123',
      icon: UserCog,
      description: 'Full access to all features',
      accent: '#16233F',
      tint: '#E9ECF2',
    },
    {
      role: 'Staff',
      email: 'staff.juanito@temu.gov.ph',
      password: 'password123',
      icon: UserCheck,
      description: 'View-only access',
      accent: '#92600A',
      tint: '#FBF1DC',
    },
  ];

  const pillars = [
    { label: 'Engineering', icon: Wrench },
    { label: 'Education', icon: GraduationCap },
    { label: 'Enforcement', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen flex bg-[#F5F6F8]">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-[44%] relative bg-[#16233F] flex-col justify-between overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(115deg, transparent, transparent 70px, #F0B429 70px, #F0B429 72px)',
          }}
        />
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-12 text-center">
          <img
            src={temuLogo}
            alt="City of El Salvador Seal"
            className="w-36 h-36 mb-8"
          />
          <p className="uppercase tracking-[0.35em] text-xs text-[#F0B429] font-['Inter'] mb-3">
            City of El Salvador
          </p>
          <h1 className="text-6xl font-['Oswald'] font-semibold text-white tracking-tight mb-4">
            TEMU
          </h1>
          <p className="text-[#C7CEDB] font-['Inter'] max-w-xs leading-relaxed">
            Traffic Enforcement and Management Unit
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-3 border-t border-white/10">
          {pillars.map((p, i) => (
            <div
              key={p.label}
              className={`flex flex-col items-center gap-2 py-6 ${i < 2 ? 'border-r border-white/10' : ''}`}
            >
              <p.icon className="w-5 h-5 text-[#F0B429]" />
              <span className="text-[11px] uppercase tracking-wider text-[#C7CEDB] font-['Inter']">
                {p.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile-only brand header */}
          <div className="lg:hidden flex flex-col items-center text-center mb-8">
            <img src={temuLogo} alt="City of El Salvador Seal" className="w-20 h-20 mb-3" />
            <h1 className="text-3xl font-['Oswald'] font-semibold text-[#16233F]">TEMU</h1>
            <p className="text-sm text-[#64748B] font-['Inter']">
              Traffic Enforcement and Management Unit
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-['Oswald'] font-medium text-[#1F2937]">Sign in</h2>
            <p className="text-sm text-[#64748B] font-['Inter'] mt-1">
              Enter your credentials to access the system.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-[#FBE7E9] text-[#C8202F] p-3 rounded-md flex items-center gap-2 text-sm border border-[#F3C6CA]">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1 block text-[#1F2937] font-['Inter']">
                Email address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@temu.gov.ph"
                required
                className="w-full focus-visible:ring-[#F0B429]"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block text-[#1F2937] font-['Inter']">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full focus-visible:ring-[#F0B429]"
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#1E8449] hover:bg-[#186B3B] text-white font-['Inter'] font-medium"
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
{/* 
          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-[#F5F6F8] text-[#64748B] font-['Inter'] uppercase tracking-wider">
                Demo accounts
              </span>
            </div>
          </div> */}

          <div className="space-y-3">
            {demoAccounts.map((demo) => (
              <button
                key={demo.role}
                type="button"
                onClick={() => fillDemoCredentials(demo.email, demo.password)}
                className="w-full p-4 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all duration-150 text-left group"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="p-2 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: demo.tint, color: demo.accent }}
                  >
                    <demo.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold font-['Inter']" style={{ color: demo.accent }}>
                        {demo.role}
                      </h3>
                      <span className="text-xs text-gray-400 group-hover:text-gray-600 font-['Inter']">
                        Use this →
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] font-['Inter'] mt-0.5">
                      {demo.description}
                    </p>
                    <div className="mt-1.5 text-xs font-['JetBrains_Mono'] text-[#64748B]">
                      {demo.email}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* <div className="mt-6 p-3 rounded-lg border border-[#FBE2A8] bg-[#FBF1DC]">
            <p className="text-xs text-[#92600A] text-center font-['Inter']">
              <strong>Note:</strong> Enforcer accounts cannot access the web system — mobile app
              only.
            </p>
          </div> */}

          <p className="text-center text-xs text-[#94A3B8] font-['Inter'] mt-8">
            &copy; {new Date().getFullYear()} TEMU · El Salvador City, Philippines
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;