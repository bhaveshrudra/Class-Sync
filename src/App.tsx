import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { EventsProvider } from './contexts/EventsContext';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import StudentLogin from './pages/StudentLogin';
import AdminLogin from './pages/AdminLogin';

// Student Pages
import StudentDashboard from './pages/StudentDashboard';
import StudentUpcoming from './pages/StudentUpcoming';
import StudentCalendar from './pages/StudentCalendar';
import StudentEventDetails from './pages/StudentEventDetails';
import StudentProfile from './pages/StudentProfile';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminEvents from './pages/AdminEvents';
import AdminCreateEvent from './pages/AdminCreateEvent';
import AdminEditEvent from './pages/AdminEditEvent';
import AdminStudents from './pages/AdminStudents';

function App() {
  return (
    <AuthProvider>
      <EventsProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* Protected Student Routes */}
            <Route 
              path="/student" 
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/upcoming" 
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentUpcoming />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/calendar" 
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentCalendar />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/events/:id" 
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentEventDetails />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/profile" 
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentProfile />
                </ProtectedRoute>
              } 
            />
            
            {/* Protected Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/events" 
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminEvents />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/events/create" 
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminCreateEvent />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/events/:id/edit" 
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminEditEvent />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin/students" 
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminStudents />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </BrowserRouter>
      </EventsProvider>
    </AuthProvider>
  );
}

export default App;
