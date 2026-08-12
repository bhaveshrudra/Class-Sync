import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: UserRole;
}

export default function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { session, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    // If not logged in, send them to the appropriate login based on the intended role if specified
    if (allowedRole === 'admin') {
      return <Navigate to="/admin/login" replace />;
    }
    return <Navigate to="/student/login" replace />;
  }

  // If the route requires a specific role and the user has a different role (or no role yet due to incomplete profile)
  // we redirect them to a generic unauthorized page or their appropriate dashboard.
  // Exception: if role is null (profile not created yet), we might still want to let them see the dashboard to create it in Phase 3.
  if (allowedRole && role !== null && role !== allowedRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Access Denied</h2>
          <p className="text-slate-600 mb-6">You do not have permission to access this page.</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="text-blue-600 hover:underline"
          >
            &larr; Back to Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
