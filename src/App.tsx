import React, { useEffect, useState } from 'react';
import { auth, loginWithGoogle, logout } from './firebase';
import { User, MenuItem } from './types';
import { subscribeToUsers, subscribeToMenuItems } from './db';
import { UserSelection } from './components/UserSelection';
import { MenuSelection } from './components/MenuSelection';
import { AdminPanel } from './components/AdminPanel';
import { Settings } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';

type ViewState = 'login' | 'app';

export default function App() {
  const [view, setView] = useState<ViewState>('login');
  const [users, setUsers] = useState<User[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [threshold, setThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('invoiceThreshold');
    return saved ? parseInt(saved, 10) : 300;
  });

  const path = window.location.pathname;
  const isAdminRoute = path === '/admin';

  const handleUpdateThreshold = (val: number) => {
    setThreshold(val);
    localStorage.setItem('invoiceThreshold', val.toString());
  };

  useEffect(() => {
    const handleErr = (event: ErrorEvent) => {
      setErrorMsg(`Error: ${event.message}`);
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      setErrorMsg(`Rejection: ${event.reason}`);
    };
    window.addEventListener('error', handleErr);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleErr);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  useEffect(() => {
    let unsubUsers: (() => void) | undefined;
    let unsubMenu: (() => void) | undefined;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setIsAuthChecking(false);
      if (user || !isAdminRoute) { // Allow app view if authenticated OR not admin route
        setView('app');
      } else {
        setView('login');
      }
    });

    if (!unsubUsers) {
      unsubUsers = subscribeToUsers((data) => {
        setUsers(data);
        setIsLoadingUsers(false);
      }, (error) => {
        setIsLoadingUsers(false);
      });
    }
    if (!unsubMenu) {
      unsubMenu = subscribeToMenuItems((data) => {
        setMenuItems(data);
      });
    }

    return () => {
      unsubAuth();
      if (unsubUsers) unsubUsers();
      if (unsubMenu) unsubMenu();
    };
  }, []);

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
  };

  const cancelMenu = () => {
    setSelectedUser(null);
  };

  const completeCheckout = () => {
    setSelectedUser(null);
  };

  if (isAuthChecking) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Laster...</div>
  }

  // Login View - For setting up the kiosk
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-10 rounded-2xl shadow-lg text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Settings size={32} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800 mb-2">Kantine Kiosk</h1>
          <p className="text-slate-500 mb-8">Logg inn med Google for å aktivere terminalen. Dette kreves kun én gang.</p>
          <button 
            onClick={loginWithGoogle}
            className="w-full bg-slate-800 text-white font-medium py-3 rounded-xl hover:bg-slate-900 transition-colors"
          >
            Logg inn 
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#fdfdfd] flex flex-col font-sans overflow-hidden text-slate-900">
      {errorMsg && (
        <div className="absolute top-0 left-0 w-full bg-red-500 text-white p-4 z-50 text-sm overflow-auto">
          {errorMsg}
        </div>
      )}
      {/* Main Views */}
      <main className="flex-1 w-full overflow-hidden flex items-center justify-center">
        {!isAdminRoute && !selectedUser && (
          <UserSelection users={users} isLoading={isLoadingUsers} onSelectUser={handleSelectUser} />
        )}
        {!isAdminRoute && selectedUser && (
          <MenuSelection 
            user={selectedUser} 
            menuItems={menuItems}
            threshold={threshold}
            onCancel={cancelMenu} 
            onComplete={completeCheckout} 
          />
        )}
        {isAdminRoute && (
          <AdminPanel 
            users={users} 
            menuItems={menuItems}
            threshold={threshold}
            onUpdateThreshold={handleUpdateThreshold}
            onBack={() => { window.location.href = '/'; }} 
          />
        )}
      </main>

    </div>
  );
}
