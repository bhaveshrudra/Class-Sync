import { Link } from 'react-router-dom';
import { Calendar, Bell, BookOpen, ArrowRight, ShieldCheck, Clock } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      {/* Navbar */}
      <header className="px-6 py-4 flex items-center justify-between max-w-7xl w-full mx-auto sticky top-0 bg-slate-50/80 backdrop-blur-md z-50 border-b border-slate-200/50">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm">
            <Calendar className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">ClassSync</span>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <Link 
            to="/student/login" 
            className="hidden md:flex items-center px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Student Login
          </Link>
          <Link 
            to="/admin/login" 
            className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all shadow-sm hover:shadow active:scale-95"
          >
            Admin Login
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center max-w-5xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/50 text-blue-700 text-sm font-medium mb-8 border border-blue-200/50 animate-fade-in-up">
          <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
          Your academic life, organized.
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 text-slate-900 leading-tight animate-fade-in-up delay-150">
          Never miss an <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">academic deadline</span> again.
        </h1>
        
        <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl leading-relaxed animate-fade-in-up delay-300">
          One place for assignments, tests, exams, submissions, and important academic dates. 
          Synchronized directly to your Google Calendar.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-fade-in-up delay-500">
          <Link 
            to="/student/login" 
            className="inline-flex justify-center items-center gap-2 px-8 py-4 text-base font-semibold bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            Student Login
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link 
            to="/admin/login" 
            className="sm:hidden inline-flex justify-center items-center gap-2 px-8 py-4 text-base font-semibold bg-slate-200 text-slate-900 rounded-full hover:bg-slate-300 transition-all"
          >
            Admin Login
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8 w-full mt-20 animate-fade-in-up delay-700">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col items-start text-left hover:shadow-md hover:border-slate-300/80 transition-all group">
            <div className="bg-blue-50 p-3.5 rounded-2xl mb-6 text-blue-600 group-hover:scale-110 group-hover:bg-blue-100 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900">Centralized Deadlines</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              All your academic events organized in one single platform, accurately filtered by your specific branch, year, and section.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col items-start text-left hover:shadow-md hover:border-slate-300/80 transition-all group">
            <div className="bg-indigo-50 p-3.5 rounded-2xl mb-6 text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-100 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900">Google Calendar Sync</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Seamlessly connect with Google Calendar to automatically synchronize all your important academic events and dates.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200/60 flex flex-col items-start text-left hover:shadow-md hover:border-slate-300/80 transition-all group">
            <div className="bg-emerald-50 p-3.5 rounded-2xl mb-6 text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-100 transition-transform">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900">Smart Reminders</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Rely on native Google Calendar notifications to remind you across all your devices before deadlines approach.
            </p>
          </div>
        </div>

        {/* Value Props Section */}
        <div className="mt-24 pt-16 border-t border-slate-200/60 w-full text-left">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6 text-slate-900">Designed for student success.</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="mt-1 bg-slate-100 p-2 rounded-lg text-slate-700 h-fit">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg text-slate-900">Secure & Private</h4>
                    <p className="text-slate-600 text-sm mt-1">Your academic schedule is kept private. We only sync to your authorized Google Calendar.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-1 bg-slate-100 p-2 rounded-lg text-slate-700 h-fit">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg text-slate-900">Real-time Updates</h4>
                    <p className="text-slate-600 text-sm mt-1">When an admin updates a deadline, your synced calendar is updated automatically without creating duplicates.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-900 rounded-3xl p-8 md:p-10 text-white shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-slate-900"></div>
                  <div className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-slate-900"></div>
                  <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-slate-900"></div>
                </div>
                <span className="text-sm font-medium text-slate-300">Trusted by students</span>
              </div>
              <blockquote className="text-xl md:text-2xl font-medium leading-snug mb-6">
                "ClassSync keeps all my exam dates and assignments organized so I can actually focus on studying."
              </blockquote>
              <div className="text-sm text-slate-400">
                <strong className="text-white">Student</strong> &mdash; Computer Science Engineering
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto py-8 text-center text-slate-500 text-sm border-t border-slate-200/60 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <Calendar className="w-5 h-5 text-blue-600" />
            ClassSync
          </div>
          <p>&copy; {new Date().getFullYear()} ClassSync. Built for students.</p>
        </div>
      </footer>
    </div>
  );
}
