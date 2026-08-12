import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Loader2 } from 'lucide-react';

export default function StudentLogin() {
  const [isLogin, setIsLogin] = useState(true);
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Signup fields
  const [name, setName] = useState('');
  const [year, setYear] = useState('1');
  const [branch, setBranch] = useState('CSE');
  const [section, setSection] = useState('A');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const { session } = useAuth();

  // If already logged in, redirect to student dashboard
  if (session) {
    navigate('/student', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw new Error('Invalid email or password.');
        navigate('/student', { replace: true });
      } else {
        // Pass profile fields as metadata — the DB trigger reads them to create the profiles row.
        // Role is hardcoded server-side in the trigger; the frontend cannot elevate it to 'admin'.
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              year,
              branch,
              section,
              role: 'student',
            },
          },
        });

        if (error) throw new Error('Account creation failed. ' + error.message);

        if (data.session) {
          // Session available immediately (email confirmation disabled)
          navigate('/student', { replace: true });
        } else {
          setMessage(
            'Account created! Please verify your email and then log in.'
          );
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 selection:bg-blue-200">
      <Link to="/" className="flex items-center gap-2 mb-8 text-slate-900 hover:opacity-80 transition-opacity">
        <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
          <Calendar className="w-5 h-5" />
        </div>
        <span className="text-xl font-bold tracking-tight">ClassSync</span>
      </Link>
      
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 max-w-md w-full animate-fade-in-up">
        <h2 className="text-2xl font-bold mb-2 text-slate-900">
          {isLogin ? 'Student Login' : 'Create Student Account'}
        </h2>
        <p className="text-slate-600 text-sm mb-6">
          {isLogin ? 'Welcome back! Please enter your details.' : 'Sign up to manage your academic deadlines.'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl border border-emerald-100">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="name">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="student@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {!isLogin && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="year">Year</label>
                <select 
                  id="year" 
                  value={year} 
                  onChange={(e) => setYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="branch">Branch</label>
                <select 
                  id="branch" 
                  value={branch} 
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="ME">ME</option>
                  <option value="CIVIL">CIVIL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="section">Section</label>
                <select 
                  id="section" 
                  value={section} 
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setMessage(null);
            }}
            className="text-blue-600 font-semibold hover:underline"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
}
