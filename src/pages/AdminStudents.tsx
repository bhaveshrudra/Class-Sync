import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LogOut, 
  Users, 
  LayoutDashboard, 
  Calendar, 
  PlusCircle, 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  Mail,
  Loader2,
  Filter
} from 'lucide-react';
import { mockStudents, type MockStudent } from '../data/mockStudents';

export default function AdminStudents() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [sectionFilter, setSectionFilter] = useState<string>('All');

  const [students, setStudents] = useState<MockStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudents() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, roll_number, year, branch, section, role')
          .eq('role', 'student');

        if (!error && data && data.length > 0) {
          // Map to match the interface
          const dbStudents = data.map(p => ({
            id: p.id,
            name: p.name || 'Unknown Student',
            email: p.email || '',
            roll_number: p.roll_number || 'N/A',
            year: p.year || '1',
            branch: p.branch || 'CSE',
            section: p.section || 'A',
            status: 'Active' as const
          }));
          setStudents(dbStudents);
        } else {
          // Fallback to mock if empty or error (demo mode)
          setStudents(mockStudents);
        }
      } catch {
        setStudents(mockStudents);
      } finally {
        setLoading(false);
      }
    }
    loadStudents();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const filteredStudents = students.filter((s) => {
    // Search
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.roll_number.toLowerCase().includes(q) ||
      s.branch.toLowerCase().includes(q);

    // Filters
    const matchesYear = yearFilter === 'All' || s.year === yearFilter;
    const matchesBranch = branchFilter === 'All' || s.branch === branchFilter;
    const matchesSection = sectionFilter === 'All' || s.section === sectionFilter;

    return matchesSearch && matchesYear && matchesBranch && matchesSection;
  });

  const years = ['All', '1', '2', '3', '4'];
  const branches = ['All', 'CSE', 'ECE', 'EEE', 'ME', 'CIVIL'];
  const sections = ['All', 'A', 'B', 'C'];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-base text-slate-900 leading-tight block">ClassSync Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleLogout} 
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-900 block leading-tight">ClassSync</span>
            <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">Faculty Portal</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 flex flex-col gap-2">
          <Link 
            to="/admin" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link 
            to="/admin/events" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors"
          >
            <Calendar className="w-5 h-5" />
            Events
          </Link>
          <Link 
            to="/admin/events/create" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors"
          >
            <PlusCircle className="w-5 h-5" />
            Create Event
          </Link>
          <Link 
            to="/admin/students" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-semibold transition-colors shadow-2xs"
          >
            <Users className="w-5 h-5" />
            Students
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-100 flex flex-col gap-3">
          <div className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs font-bold text-slate-800 truncate">{user?.email || 'admin@classsync.com'}</div>
            <div className="text-[10px] text-slate-500 font-medium">Administrator</div>
          </div>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full pb-24 md:pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Enrolled Students
            </h1>
            <p className="text-slate-500 text-sm md:text-base mt-0.5">
              Review enrolled students receiving target academic notices and events.
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/80 mb-6 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search students by name, email, roll number, or branch..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              >
                <option value="All">All Years</option>
                {years.filter(y => y !== 'All').map(y => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              >
                <option value="All">All Branches</option>
                {branches.filter(b => b !== 'All').map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              >
                <option value="All">All Sections</option>
                {sections.filter(s => s !== 'All').map(s => (
                  <option key={s} value={s}>Section {s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-3">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2">
              <Users className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-900 font-bold">No students registered yet.</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200/80 shadow-2xs text-center space-y-3">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2">
              <Search className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-900 font-bold">No students found.</p>
            <p className="text-slate-500 text-sm">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Roll Number</th>
                  <th className="py-3.5 px-4">Year & Branch</th>
                  <th className="py-3.5 px-4">Section</th>
                  <th className="py-3.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{s.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {s.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700">
                      {s.roll_number}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                      Year {s.year} · {s.branch}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                      Section {s.section}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden divide-y divide-slate-100">
            {filteredStudents.map((s) => (
              <div key={s.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{s.name}</h3>
                    <p className="text-xs text-slate-500">{s.email}</p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                    {s.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                  <span className="font-mono">{s.roll_number}</span>
                  <span>Year {s.year} · {s.branch} ({s.section})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Link 
          to="/admin" 
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600"
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Dashboard</span>
        </Link>
        <Link 
          to="/admin/events" 
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600"
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-medium">Events</span>
        </Link>
        <Link 
          to="/admin/events/create" 
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600"
        >
          <PlusCircle className="w-5 h-5" />
          <span className="text-[10px] font-medium">Create</span>
        </Link>
        <Link 
          to="/admin/students" 
          className="flex flex-col items-center gap-1 text-indigo-600 font-bold"
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">Students</span>
        </Link>
        <button 
          onClick={handleLogout} 
          className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </nav>
    </div>
  );
}
