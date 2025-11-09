import React, { useState } from 'react';
import MapPage from './pages/MapPage';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import AdminPanel from './components/AdminPanel';
import ThemeToggle from './components/ThemeToggle';
import Profile from './components/Profile';
import UserProfile from './components/UserProfile';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProfileToggle({ onShowProfile }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  if (!user) return null;
  
  return (
    <div className="flex items-center space-x-3">
      {user.role === 'admin' && (
        <button
          onClick={() => navigate('/admin')}
          className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
        >
          Админка
        </button>
      )}
      <button
        onClick={onShowProfile}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user.username.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="hidden sm:block text-sm font-medium">Профиль</span>
      </button>
    </div>
  );
}

function AppContent() {
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <header className="p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => navigate('/')}
          className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
        >
          Arch
        </button>
        <div className="flex gap-4 items-center">
          <ThemeToggle />
          <ProfileToggle onShowProfile={() => setShowProfile(true)} />
        </div>
      </header>
      <Routes>
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/" element={<MapPage />} />
        <Route path="/profile/:userId" element={<UserProfile />} /> 
      </Routes>
      
      {showProfile && <Profile onClose={() => setShowProfile(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}