import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useAuth } from '../AuthContext';

const quranVerses = [
  { verse: "So remember Me; I will remember you.", reference: "Quran 2:152" },
  { verse: "And He found you lost and guided [you].", reference: "Quran 93:7" },
  { verse: "Indeed, with hardship [will be] ease.", reference: "Quran 94:6" },
  { verse: "Allah does not burden a soul beyond that it can bear.", reference: "Quran 2:286" },
  { verse: "If you are grateful, I will surely increase you [in favor].", reference: "Quran 14:7" },
  { verse: "And whoever relies upon Allah - then He is sufficient for him.", reference: "Quran 65:3" },
  { verse: "He knows what is in every heart.", reference: "Quran 67:13" },
  { verse: "Call upon Me; I will respond to you.", reference: "Quran 40:60" }
];

const demoAccounts = [
  { role: 'Director', email: 'admin@aljalis.org', desc: 'Center Director' },
  { role: 'Finance', email: 'finance@aljalis.org', desc: 'Brother Ali' },
  { role: 'HR', email: 'hr@aljalis.org', desc: 'Aisha Santos' },
  { role: 'Staff', email: 'staff@aljalis.org', desc: 'Omar Hassan' },
];

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [verse, setVerse] = useState(quranVerses[0]);
  const [email, setEmail] = useState('admin@aljalis.org');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { setCurrentUser } = useAuth();

  useEffect(() => {
    const randomVerse = quranVerses[Math.floor(Math.random() * quranVerses.length)];
    setVerse(randomVerse);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await api.auth.login(email.trim(), password);
      if (res?.user) {
        setCurrentUser(res.user);
      }
      toast.success(`Welcome, ${res.user?.name || 'User'}!`);
      onLogin();
    } catch (err: any) {
      const msg = err.message || 'Invalid email or password. Please verify your credentials.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDemoAccount = (accEmail: string) => {
    setEmail(accEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex font-sans">
      {/* Left Area - Motivational / Quran Verse */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#FF6B00] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
           <svg className="absolute -top-24 -left-24 w-96 h-96" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path fill="#ffffff" d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,81.3,-46.3C90.8,-33.5,96.8,-18,97.6,-2.3C98.4,13.4,94,29.3,84.1,41.9C74.3,54.5,59,63.9,43.3,71.3C27.6,78.7,11.5,84.1,-4,89.5C-19.5,94.9,-35,100.3,-48.7,96.3C-62.4,92.3,-74.3,78.9,-83.4,63.6C-92.5,48.3,-98.9,31,-98.5,14.2C-98.1,-2.6,-90.9,-18.9,-81.1,-32.2C-71.3,-45.5,-58.9,-55.8,-45.6,-63.4C-32.3,-71,-18.1,-75.9,-2.4,-72.6C13.3,-69.3,28.6,-57.8,44.7,-76.4Z" transform="translate(100 100)" />
            </svg>
            <svg className="absolute top-1/2 -right-24 w-80 h-80" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path fill="#ffffff" d="M51.9,-61.7C65.5,-51.2,73.5,-32.6,77.1,-13.3C80.7,6,79.9,26.1,69.5,41.2C59.1,56.3,39.1,66.4,18.7,70.5C-1.7,74.6,-22.5,72.7,-40.8,63.6C-59.1,54.5,-74.9,38.2,-81.9,19C-88.9,-0.2,-87,-22.3,-76.3,-39.6C-65.6,-56.9,-46.1,-69.4,-27,-73.4C-7.9,-77.4,10.8,-72.9,28.2,-67.2C45.6,-61.5,49.9,-54.6,51.9,-61.7Z" transform="translate(100 100)" />
            </svg>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
            <div className="w-4 h-4 bg-[#FF6B00] rounded-sm"></div>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[20px] font-bold tracking-tight">Al-Jalis As-Salih</span>
            <span className="text-[10px] text-white/80 uppercase tracking-wider font-semibold hover:text-white transition-colors cursor-default">Cotabato Chapter</span>
          </div>
        </div>
        
        <div className="relative z-10 max-w-lg mb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={verse.verse}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-4xl font-serif font-medium leading-[1.3] mb-6">&ldquo;{verse.verse}&rdquo;</h2>
              <p className="text-white/80 font-medium tracking-wide flex items-center gap-3 text-sm">
                <span className="w-8 h-[2px] bg-white/40"></span>
                {verse.reference}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative z-10 text-white/80 text-sm font-medium">
          &copy; {new Date().getFullYear()} Al-Jalis As-Salih Cotabato Chapter
        </div>
      </div>

      {/* Right Area - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 bg-white relative">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3 text-[#FF6B00] tracking-tight mb-8">
            <div className="w-8 h-8 bg-[#FF6B00] rounded-lg flex items-center justify-center shrink-0">
                <div className="w-4 h-4 bg-white rounded-sm"></div>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[20px] font-bold">Al-Jalis As-Salih</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Cotabato Chapter</span>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-[#111827]">مرحبًا بعودتك</h1>
            <p className="text-[#6B7280] mt-2 text-[15px]">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#111827]">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FFF0E6] outline-hidden transition-all text-[#111827]" 
                placeholder="admin@aljalis.org" 
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-[#111827]">Password</label>
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm focus:bg-white focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FFF0E6] outline-hidden transition-all text-[#111827]" 
                placeholder="••••••••" 
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-[15px] font-semibold text-white bg-[#FF6B00] hover:bg-[#E66000] transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Quick Demo Sign-in Helpers */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
              Quick Sign In (Test Accounts):
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectDemoAccount(acc.email)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                    email === acc.email 
                      ? 'border-[#FF6B00] bg-[#FFF8F3] text-[#FF6B00] font-semibold' 
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{acc.role}</div>
                  <div className="text-[11px] text-gray-500 truncate">{acc.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
