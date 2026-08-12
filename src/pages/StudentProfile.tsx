import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader2, Save, User as UserIcon, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentProfile() {
  const { user } = useAuth();
  
  const [name, setName] = useState('');
  const [year, setYear] = useState('1');
  const [branch, setBranch] = useState('CSE');
  const [section, setSection] = useState('A');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name, year, branch, section')
          .eq('id', user.id)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setName(data.name || '');
          setYear(data.year || '1');
          setBranch(data.branch || 'CSE');
          setSection(data.section || 'A');
        }
      } catch (err: any) {
        console.error("Error loading profile:", err);
        setMessage({ type: 'error', text: 'Failed to load profile data.' });
      } finally {
        setLoading(false);
      }
    }
    
    loadProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          year,
          branch,
          section,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <header className="px-6 py-4 border-b border-slate-200/50 bg-white">
          <div className="max-w-4xl mx-auto flex items-center">
            <Link to="/student" className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-2 font-medium">
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Link>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-blue-200">
      <header className="px-6 py-4 border-b border-slate-200/50 bg-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/student" className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-2 font-medium">
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
          <div className="font-semibold text-slate-900">Student Profile</div>
        </div>
      </header>

      <main className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto">
          
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
              <div className="bg-blue-100 p-4 rounded-full text-blue-600">
                <UserIcon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Your Profile</h1>
                <p className="text-slate-500 text-sm">{user?.email}</p>
              </div>
            </div>

            {message && (
              <div className={`mb-6 p-4 rounded-xl text-sm border ${
                message.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                  : 'bg-red-50 text-red-600 border-red-100'
              }`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="name">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="year">Year</label>
                  <select 
                    id="year" 
                    value={year} 
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-all"
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
