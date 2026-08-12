import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

export default function StudentDashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 mt-10">
        <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">Student Dashboard</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/student/profile')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              Profile
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
        
        <p className="text-slate-600 mb-4">
          Welcome to the Student Dashboard placeholder.
        </p>
        <p className="text-sm text-slate-500 bg-slate-100 p-4 rounded-xl font-mono break-all">
          Logged in as: {user?.email}
        </p>
        
        <div className="mt-8 p-4 bg-blue-50 text-blue-700 rounded-xl text-sm">
          Full student features (events, profile, calendar sync) will be implemented in subsequent phases.
        </div>
      </div>
    </div>
  );
}
