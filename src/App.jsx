import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { X, CheckCircle, AlertCircle, Info, Sparkles } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Attendance from './pages/Attendance';
import SessionMaterial from './pages/SessionMaterial';
import Feedback from './pages/Feedback';

const ProtectedRoute = ({ token, children }) => {
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('cc_token'));
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('cc_user_email'));
  const [courses, setCourses] = useState(() => {
    const saved = localStorage.getItem('cc_courses');
    return saved ? JSON.parse(saved) : [];
  });
  const [showWelcome, setShowWelcome] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message: '' }

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLoginSuccess = (data) => {
    setToken(data.token);
    setUserEmail(data.faculty_email);
    setCourses(data.courses);
    localStorage.setItem('cc_token', data.token);
    localStorage.setItem('cc_user_email', data.faculty_email);
    localStorage.setItem('cc_courses', JSON.stringify(data.courses));
    setShowWelcome(true);
  };

  const handleLogout = useCallback(async () => {
    try {
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL}/clear-all`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error("Failed to clear materials on logout", err);
    }

    setToken(null);
    setUserEmail(null);
    setCourses([]);
    localStorage.removeItem('cc_token');
    localStorage.removeItem('cc_user_email');
    localStorage.removeItem('cc_courses');
  }, [token]);

  // Initial Check: Verify token on mount if it exists
  useEffect(() => {
    if (token) {
      fetch(`${import.meta.env.VITE_API_URL}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => {
        if (res.status === 401) {
          handleLogout();
        }
      }).catch(err => {
        console.error("Token verification failed", err);
      });
    }
  }, []); // Only on initial mount

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900 font-sans selection:bg-teal-accent/30">
      {token && <Sidebar userEmail={userEmail} onLogout={handleLogout} />}

      {/* Toast Notifications */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-center space-x-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right-10 duration-300 ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'
          }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-rose-500" />}
          <p className="font-bold text-sm tracking-tight">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <main className={`flex-1 flex flex-col min-h-screen overflow-x-hidden overflow-y-auto transition-all duration-300 ${token ? 'md:pl-72' : ''}`}>

        {/* Welcome Banner */}
        {showWelcome && token && (
          <div className="w-full bg-navy p-6 flex flex-col md:flex-row items-center justify-between border-b border-white/10 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-accent/10 to-transparent pointer-events-none" />
            <div className="flex items-center space-x-4 relative z-10 text-center md:text-left">
              <div className="bg-teal-accent/20 p-3 rounded-2xl">
                <Sparkles className="w-6 h-6 text-teal-accent animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Welcome back, {userEmail?.split('@')[0].replace('.', ' ')}!</h2>
                <p className="text-gray-400 text-sm font-medium">You have {courses.length} courses across {new Set(courses.map(c => c.division)).size} divisions active today.</p>
              </div>
            </div>
            <button
              onClick={() => setShowWelcome(false)}
              className="mt-4 md:mt-0 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all relative z-10"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8">
          <Routes>
            <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute token={token}>
                  <Attendance token={token} courses={courses} showToast={showToast} onLogout={handleLogout} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/material"
              element={
                <ProtectedRoute token={token}>
                  <SessionMaterial token={token} courses={courses} showToast={showToast} onLogout={handleLogout} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feedback"
              element={
                <ProtectedRoute token={token}>
                  <Feedback token={token} courses={courses} showToast={showToast} onLogout={handleLogout} />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to={token ? "/attendance" : "/login"} replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
