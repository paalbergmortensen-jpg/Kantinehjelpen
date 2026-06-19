import React, { useState, useEffect } from 'react';
import { User, MenuItem, Report } from '../types';
import { ChevronLeft, Mail, RefreshCw, CheckCircle, Database, Users, Calculator, Coffee, Settings, Archive } from 'lucide-react';
import { resetUserBalances, reseedAllUsers, subscribeToReports } from '../db';
import { motion } from 'motion/react';
import { UserManagement } from './UserManagement';
import { MenuManagement } from './MenuManagement';
import { SettingsManagement } from './SettingsManagement';
import { initAuth, googleSignIn, getAccessToken } from '../lib/auth';

interface Props {
  users: User[];
  menuItems: MenuItem[];
  threshold: number;
  onUpdateThreshold: (val: number) => void;
  onBack: () => void;
}

export function AdminPanel({ users, menuItems, threshold, onUpdateThreshold, onBack }: Props) {
  const [emailGenerated, setEmailGenerated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'oppgjor' | 'brukere' | 'meny' | 'innstillinger' | 'arkiv'>('oppgjor');
  const [showReseedConfirm, setShowReseedConfirm] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const [showProcessConfirm, setShowProcessConfirm] = useState(false);
  const [invoicedUsersSnapshot, setInvoicedUsersSnapshot] = useState<User[]>([]);
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);
  const [thresholdInput, setThresholdInput] = useState(threshold.toString());
  const [reports, setReports] = useState<Report[]>([]);

  // Workspace Auth State
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const unsubscribeReports = subscribeToReports(setReports);
    const unsubscribeAuth = initAuth(
      (_user, token) => setNeedsAuth(false),
      () => setNeedsAuth(true)
    );
    return () => {
      unsubscribeReports();
      unsubscribeAuth();
    };
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Filter users who are above or equal to threshold
  const usersToInvoice = sortedUsers(users.filter(u => u.balance >= threshold));
  const otherUsers = sortedUsers(users.filter(u => u.balance < threshold && u.balance > 0));

  function sortedUsers(list: User[]) {
    return [...list].sort((a, b) => b.balance - a.balance);
  }

  const generateEmailText = () => {
    let text = "Hei lønnsavdeling,\n\nHer er trekk for kantine denne måneden:\n\n";
    (emailGenerated ? invoicedUsersSnapshot : usersToInvoice).forEach(u => {
      text += `Ansattnr: ${u.ansattNr} | Ressursnr: ${u.ressursNr} | Navn: ${u.fullName} | Beløp: kr ${u.balance.toFixed(2)}\n`;
    });
    text += "\nMvh Kantinesystemet";
    return text;
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const idsToReset = usersToInvoice.map(u => u.id);
      setInvoicedUsersSnapshot(usersToInvoice);
      await resetUserBalances(idsToReset);
      setEmailGenerated(true);
      setShowProcessConfirm(false);
      setFeedbackMessage(null);
    } catch (e) {
      console.error(e);
      setFeedbackMessage({ text: 'En feil oppstod ved oppgjør.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto p-6 md:p-10 bg-white shadow-xl rounded-2xl animate-in slide-in-from-bottom-8 my-8 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors shrink-0"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-wrap bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('oppgjor')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'oppgjor' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <Calculator size={16} /> Oppgjør
            </button>
            <button
              onClick={() => setActiveTab('brukere')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'brukere' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <Users size={16} /> Brukerhåndtering
            </button>
            <button
              onClick={() => setActiveTab('meny')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'meny' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <Coffee size={16} /> Meny
            </button>
            <button
              onClick={() => setActiveTab('innstillinger')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'innstillinger' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <Settings size={16} /> Oppsett
            </button>
            <button
              onClick={() => setActiveTab('arkiv')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all ${activeTab === 'arkiv' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
              <Archive size={16} /> Arkiv
            </button>
          </div>
        </div>
        
        {activeTab === 'oppgjor' && (
          <div className="flex flex-col items-end space-y-2 shrink-0 ml-auto">
            {!showReseedConfirm ? (
              <button
                onClick={() => setShowReseedConfirm(true)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-orange-100 text-orange-800 text-sm font-medium rounded-lg hover:bg-orange-200 transition-colors"
              >
                <Database size={16} /> Reseed brukere
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">Slette alt?</span>
                <button
                  onClick={() => setShowReseedConfirm(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Avbryt
                </button>
                <button
                  onClick={async () => {
                    try {
                      setIsProcessing(true);
                      await reseedAllUsers();
                      setFeedbackMessage({ text: 'Brukere er nå lastet inn på nytt!', type: 'success' });
                    } catch (e: any) {
                      console.error(e);
                      setFeedbackMessage({ text: 'Feil ved innlasting.', type: 'error' });
                    } finally {
                      setIsProcessing(false);
                      setShowReseedConfirm(false);
                    }
                  }}
                  disabled={isProcessing}
                  className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${isProcessing ? 'bg-red-200 text-red-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                >
                  {isProcessing ? 'Laster...' : 'Slett'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 flex flex-col space-y-8 pb-10">
        
        {feedbackMessage && (
          <div className={`p-4 rounded-lg flex justify-between items-center ${feedbackMessage.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
            <span className="font-medium">{feedbackMessage.text}</span>
            <button onClick={() => setFeedbackMessage(null)} className="text-xl leading-none">&times;</button>
          </div>
        )}

        {needsAuth && activeTab === 'oppgjor' ? (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Logg inn for månedsoppgjør</h2>
            <p className="text-slate-600 mb-6 max-w-md">For å opprette regneark i Google Sheets og sende dette via Gmail til lønnsavdelingen må du logge på med felleskontoen.</p>
            <button className="gsi-material-button" onClick={handleLogin} disabled={isLoggingIn}>
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{display: 'block'}}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents">{isLoggingIn ? 'Logger inn...' : 'Sjekk av med Google'}</span>
                <span style={{display: 'none'}}>Sjekk av med Google</span>
              </div>
            </button>
          </div>
        ) : activeTab === 'brukere' ? (
          <UserManagement users={users} />
        ) : activeTab === 'meny' ? (
          <MenuManagement menuItems={menuItems} />
        ) : activeTab === 'innstillinger' ? (
          <SettingsManagement />
        ) : activeTab === 'arkiv' ? (
          <div>
            <h2 className="text-xl font-medium text-slate-800 mb-4">Tidligere oppgjør</h2>
            {reports.length === 0 ? (
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-slate-500 text-center">
                Ingen tidligere oppgjør funnet i databasen.
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map(report => (
                  <div key={report.id} className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                    <div>
                      <h3 className="font-semibold text-slate-800">{report.title}</h3>
                      <p className="text-sm text-slate-500">Opprettet: {new Date(report.createdAt).toLocaleString('nb-NO')}</p>
                      <p className="text-sm text-slate-500">Antall ansatte trukket: {report.userCount}</p>
                    </div>
                    <a href={report.url} target="_blank" rel="noreferrer" className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors">
                      Åpne regneark
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : emailGenerated ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-green-50 rounded-xl p-8 border border-green-100 text-center">
            <CheckCircle className="text-green-500 w-16 h-16 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Oppgjør fullført!</h2>
            <p className="text-green-700 mb-6">Saldo for valgte brukere er nullstilt. Kopier teksten under og send til lønnsavdelingen.</p>
            
            <div className="bg-white p-6 rounded-lg border border-green-200 text-left font-mono text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
              {generateEmailText()}
            </div>
          </motion.div>
        ) : (
          <>
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-4 sm:space-y-0 sm:space-x-4">
                <h2 className="text-xl font-medium text-slate-800 flex items-center space-x-2">
                  Brukere over grensen
                  {isEditingThreshold ? (
                    <div className="flex items-center space-x-1 rounded-lg bg-slate-100 p-1">
                      <input 
                        type="number" 
                        className="w-16 px-2 py-1 text-sm border rounded bg-white" 
                        value={thresholdInput} 
                        onChange={(e) => setThresholdInput(e.target.value)} 
                        autoFocus
                      />
                      <button 
                        onClick={() => {
                          const val = parseInt(thresholdInput, 10);
                          if (!isNaN(val) && val >= 0) onUpdateThreshold(val);
                          setIsEditingThreshold(false);
                        }}
                        className="px-2 py-1 text-xs font-bold bg-slate-800 text-white rounded"
                      >✓</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => { setThresholdInput(threshold.toString()); setIsEditingThreshold(true); }}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-bold flex items-center space-x-1 transition-colors"
                      title="Endre grense"
                    >
                      kr {threshold},- 
                    </button>
                  )}
                  <span className="ml-2 bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                    Trekk:{' '}
                    {usersToInvoice.length > 0 ? usersToInvoice.reduce((a,c) => a + c.balance, 0).toFixed(2) : '0.00'}
                  </span>
                </h2>
                <div className="flex flex-col items-end space-y-2 w-full sm:w-auto">
                  {!showProcessConfirm ? (
                    <button
                      onClick={() => setShowProcessConfirm(true)}
                      disabled={usersToInvoice.length === 0 || isProcessing}
                      className={`w-full sm:w-auto flex justify-center items-center space-x-2 px-5 py-2.5 rounded-xl font-medium transition-colors ${
                        usersToInvoice.length > 0 && !isProcessing
                          ? 'bg-slate-800 text-white hover:bg-slate-900'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Mail size={18} />
                      {isProcessing ? 'Prosesserer...' : 'Send e-post & Nullstill Saldo'}
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center justify-end border border-slate-200 bg-white p-2 rounded-xl shadow-sm w-full sm:w-auto mt-2">
                      <span className="text-sm font-medium text-slate-600 px-2 w-full text-center sm:text-left sm:w-auto pb-2 sm:pb-0">Sende e-post og nullstille all saldo over {threshold}kr?</span>
                      <div className="flex space-x-2 w-full sm:w-auto justify-end">
                        <button onClick={() => setShowProcessConfirm(false)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium flex-1 sm:flex-none">Avbryt</button>
                        <button 
                          onClick={async () => {
                            setIsProcessing(true);
                            const emailText = generateEmailText();
                            const emailHtml = emailText.replace(/\n/g, '<br>');
                            try {
                              const token = await getAccessToken();
                              if (!token) throw new Error("Du må logge inn først.");

                              // First try to send the email
                              const res = await fetch('/api/trigger-monthly-email', { 
                                method: 'POST',
                                headers: { 
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}` 
                                },
                                body: JSON.stringify({
                                  subject: `Kantineoppgjør for trekk`,
                                  text: emailText,
                                  html: `<div style="font-family: sans-serif;">${emailHtml}</div>`
                                })
                              });
                              
                              if (!res.ok) {
                                const data = await res.json();
                                const errObj = data.error;
                                const errorMsg = errObj?.message || (typeof errObj === 'string' ? errObj : 'Kunne ikke sende e-post.');
                                throw new Error(errorMsg);
                              }

                              // Email sent successfully, proceed with resetting balances!
                              const idsToReset = usersToInvoice.map(u => u.id);
                              setInvoicedUsersSnapshot(usersToInvoice);
                              await resetUserBalances(idsToReset);
                              
                              setEmailGenerated(true);
                              setShowProcessConfirm(false);
                              setFeedbackMessage({ text: 'E-post sendt og saldo er nullstilt!', type: 'success' });
                            } catch (e: any) {
                              console.error(e);
                              setFeedbackMessage({ text: 'Oppgjør feilet: ' + e.message, type: 'error' });
                            } finally {
                              setIsProcessing(false);
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-800 text-white hover:bg-slate-900 rounded-lg text-sm font-medium flex-1 sm:flex-none"
                        >
                          Bekreft Oppgjør
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {usersToInvoice.length === 0 ? (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-slate-500 text-center">
                  Ingen brukere har saldo over {threshold} kr.
                </div>
              ) : (
                <div className="flex flex-wrap -m-2">
                  {usersToInvoice.map(u => (
                    <div key={u.id} className="w-full md:w-1/2 p-2">
                     <div className="flex justify-between h-full p-4 bg-white border border-red-200 rounded-xl shadow-sm">
                      <div className="flex items-center">
                        <div className="font-semibold text-slate-800">{u.firstName}</div>
                      </div>
                      <div className="font-mono text-red-600 font-bold self-center text-lg">
                        kr {u.balance.toFixed(2)}
                      </div>
                     </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {otherUsers.length > 0 && (
              <div className="pt-6 border-t border-slate-100 opacity-60 mt-4">
                <h2 className="text-lg font-medium text-slate-800 mb-4 tracking-tight">Andre brukere med saldo (under grensen)</h2>
                <div className="flex flex-wrap -m-1.5">
                  {otherUsers.map(u => (
                    <div key={u.id} className="w-full sm:w-1/2 md:w-1/3 p-1.5">
                     <div className="flex justify-between h-full p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm">
                      <div className="truncate pr-2">
                        <div className="font-medium text-slate-700 truncate">{u.firstName}</div>
                      </div>
                      <div className="font-mono text-slate-500 font-medium whitespace-nowrap">
                        kr {u.balance.toFixed(2)}
                      </div>
                     </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

