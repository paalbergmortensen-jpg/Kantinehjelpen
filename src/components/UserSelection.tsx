import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Search } from 'lucide-react';

interface Props {
  users: User[];
  isLoading?: boolean;
  onSelectUser: (user: User) => void;
}

export function UserSelection({ users, isLoading = false, onSelectUser }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user => 
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    // If we've loaded and there are precisely 0 users, run seed
    if (!isLoading && users.length === 0) {
      let mounted = true;
      import('../db').then(async ({ seedInitialUsers, seedInitialMenu }) => {
        if (!mounted) return;
        try {
          // Add default users and products
          await seedInitialUsers();
          await seedInitialMenu();
        } catch (e) {
          console.error("Auto-seeding failed:", e);
        }
      });
      return () => { mounted = false; };
    }
  }, [users.length, isLoading]);

  return (
    <div className="flex flex-col h-full w-full max-w-7xl mx-auto pt-8 pb-12 px-6 lg:px-10 overflow-x-hidden animate-in fade-in duration-500">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between space-y-6 md:space-y-0 md:space-x-6">
        <div className="flex flex-col space-y-2">
          <span className="text-slate-400 font-bold uppercase tracking-widest text-xs flex items-center space-x-2">
            <span className="w-2 h-2 bg-slate-300 rounded-full"></span> Steg 1
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Hvem er du?</h2>
        </div>
        
        <div className="relative w-full md:w-80 group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-slate-800 transition-colors" />
          </div>
          <input
            type="text"
            className="block w-full pl-14 pr-5 py-4 border border-slate-200 rounded-[1.5rem] bg-white shadow-sm placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 sm:text-base font-medium transition-all"
            placeholder="Søk på navn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 pb-10 content-start">
        <div className="flex flex-wrap -m-2 md:-m-2.5">
          {filteredUsers.map((user) => (
            <div key={user.id} className="w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 2xl:w-1/6 p-2 md:p-2.5">
              <button
                onClick={() => onSelectUser(user)}
                className="w-full aspect-square p-6 rounded-[2rem] bg-white border border-slate-200/60 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-800 transition-all duration-300 flex flex-col justify-center items-center space-y-4 active:scale-95 group"
              >
                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl font-medium text-slate-400 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transform group-hover:scale-105 transition-all duration-300">
                  {user.firstName.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-lg md:text-xl tracking-tight line-clamp-1 w-full truncate leading-tight transition-colors">
                  {user.firstName}
                </span>
              </button>
            </div>
          ))}
        </div>

        {users.length > 0 && filteredUsers.length === 0 && (
          <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400 font-medium text-lg bg-white/50 rounded-[2rem] border border-dashed border-slate-200">
            <span className="text-4xl mb-4 opacity-50"><Search size={40} /></span>
            Ingen brukere funnet
          </div>
        )}
        {users.length === 0 && isLoading && (
          <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400 font-medium text-lg">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4"></div>
            Laster brukere...
          </div>
        )}
        {users.length === 0 && !isLoading && (
          <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400 font-medium text-lg text-center px-4">
            <p className="mb-4">Ingen brukere er registrert eller systemet laster...</p>
          </div>
        )}
      </div>
    </div>
  );
}
