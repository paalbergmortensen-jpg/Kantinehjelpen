import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, Mail } from 'lucide-react';

export function SettingsManagement() {
  const [cronDay, setCronDay] = useState<number>(1);
  const [emails, setEmails] = useState<string[]>([]);
  const [productionNumber, setProductionNumber] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setCronDay(data.cronDay || 1);
        setEmails(data.recipients || []);
        setProductionNumber(data.productionNumber || '');
      })
      .catch(err => {
        console.error("Feil ved henting av settings:", err);
      });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cronDay, recipients: emails, productionNumber })
      });
      if (res.ok) {
        setMessage({ text: 'Innstillinger lagret.', type: 'success' });
      } else {
        const err = await res.json();
        const errObj = err.error;
        const errMsg = errObj?.message || (typeof errObj === 'string' ? errObj : 'Kunne ikke lagre.');
        setMessage({ text: 'Feil: ' + errMsg, type: 'error' });
      }
    } catch (e: any) {
      setMessage({ text: 'Nettverksfeil: ' + e.message, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.includes('@')) return;
    if (!emails.includes(newEmail.trim())) {
      setEmails([...emails, newEmail.trim()]);
    }
    setNewEmail('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter(e => e !== emailToRemove));
  };

  return (
    <div className="flex flex-col space-y-8 max-w-2xl">
      <div>
        <h2 className="text-xl font-medium text-slate-800 mb-6 flex items-center space-x-2">
          Automatiske utsendinger (Innstillinger)
        </h2>

        {message && (
          <div className={`p-4 rounded-lg mb-6 flex justify-between items-center ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
            <span className="font-medium">{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-xl leading-none">&times;</button>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Produksjonsnummer
          </label>
          <div className="flex items-center space-x-3 mb-2">
            <input 
              type="text" 
              value={productionNumber} 
              onChange={e => setProductionNumber(e.target.value)}
              placeholder="F.eks. 12345"
              className="w-48 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <p className="text-slate-500 text-sm">
            Dette nummeret inkluderes automatisk i Excel/CSV-filen som sendes til lønn.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Hvilken dag i måneden skal oppgjøret sendes? (1-28)
          </label>
          <div className="flex items-center space-x-3">
            <input 
              type="number" 
              min="1" 
              max="28" 
              value={cronDay} 
              onChange={e => setCronDay(parseInt(e.target.value, 10))}
              className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-slate-500 text-sm">
              E-posten vil bli sendt kl 08:00 på denne dagen hver måned.
            </span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-4">
            Mottakere for oppgjøret (lønnsansvarlig, etc.)
          </label>
          
          <div className="flex flex-col space-y-3 mb-4">
            {emails.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Ingen e-postadresser lagt til.</p>
            ) : (
              emails.map(email => (
                <div key={email} className="flex justify-between items-center bg-white border border-slate-200 px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-3 text-slate-700">
                    <Mail size={16} className="text-slate-400" />
                    <span>{email}</span>
                  </div>
                  <button onClick={() => handleRemoveEmail(email)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddEmail} className="flex space-x-2">
            <input 
              type="email" 
              placeholder="lennart@bedrift.no"
              value={newEmail} 
              onChange={e => setNewEmail(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button 
              type="submit"
              disabled={!newEmail}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 disabled:bg-slate-300 transition-colors flex items-center space-x-2"
            >
              <Plus size={16} /> Legg til
            </button>
          </form>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <Save size={18} />
            {isSaving ? 'Lagrer...' : 'Lagre innstillinger'}
          </button>
        </div>

      </div>
    </div>
  );
}
