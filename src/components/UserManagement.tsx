import React, { useState } from 'react';
import { User } from '../types';
import { createUser, updateUser, deleteUser } from '../db';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';

export function UserManagement({ users }: { users: User[] }) {
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [isAdding, setIsAdding] = useState(false);

  const startEdit = (user: User) => {
    setEditingUserId(user.id);
    setEditForm(user);
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditForm({});
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!editForm.firstName || !editForm.fullName || !editForm.ansattNr || !editForm.ressursNr) {
      alert("Alle felt må fylles ut.");
      return;
    }

    try {
      const balance = Number(editForm.balance) || 0;
      if (isAdding) {
        await createUser({
          firstName: editForm.firstName,
          fullName: editForm.fullName,
          ansattNr: editForm.ansattNr,
          ressursNr: editForm.ressursNr,
          balance: balance
        });
      } else if (editingUserId) {
        await updateUser({
          id: editingUserId,
          firstName: editForm.firstName,
          fullName: editForm.fullName,
          ansattNr: editForm.ansattNr,
          ressursNr: editForm.ressursNr,
          balance: balance
        } as User);
      }
      cancelEdit();
    } catch (e: any) {
      alert("Feil ved lagring: " + e.message);
    }
  };

  const handleDelete = async (user: User) => {
      if (confirm(`Er du sikker på at du vil slette ${user.firstName}?`)) {
        try {
          await deleteUser(user.id);
        } catch (e: any) {
          console.error("Feil ved sletting: " + e.message);
        }
      }
  };

  const handleRemoveDuplicates = async () => {
    if (!confirm('Vil du slette alle duplikate brukere (basert på fullt navn)?')) return;
    try {
      const uniqueNames = new Set<string>();
      let deleteCount = 0;
      for (const u of users) {
        if (uniqueNames.has(u.fullName)) {
          await deleteUser(u.id);
          deleteCount++;
        } else {
          uniqueNames.add(u.fullName);
        }
      }
      alert(`Slettet ${deleteCount} duplikate brukere.`);
    } catch (e: any) {
      alert("Feil ved fjerning av duplikater: " + e.message);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium text-slate-800">Administrer Brukere ({users.length})</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleRemoveDuplicates}
            className="flex items-center space-x-2 bg-slate-100 text-slate-700 hover:bg-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 size={16} /> Fjern duplikater
          </button>
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingUserId('new');
              setEditForm({ balance: 0 });
            }}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus size={16} /> Ny bruker
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Fornavn (Visning)</th>
              <th className="px-4 py-3">Fullt Navn</th>
              <th className="px-4 py-3">Ansattnr</th>
              <th className="px-4 py-3">Ressursnr</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3 text-right">Handlinger</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isAdding && (
              <tr className="bg-blue-50">
                <td className="px-4 py-2"><input className="w-full border p-1 rounded" placeholder="Eks: Ola" value={editForm.firstName || ''} onChange={e => setEditForm({...editForm, firstName: e.target.value})} /></td>
                <td className="px-4 py-2"><input className="w-full border p-1 rounded" placeholder="Fullt navn" value={editForm.fullName || ''} onChange={e => setEditForm({...editForm, fullName: e.target.value})} /></td>
                <td className="px-4 py-2"><input className="w-full border p-1 rounded" placeholder="12345" value={editForm.ansattNr || ''} onChange={e => setEditForm({...editForm, ansattNr: e.target.value})} /></td>
                <td className="px-4 py-2"><input className="w-full border p-1 rounded" placeholder="12345" value={editForm.ressursNr || ''} onChange={e => setEditForm({...editForm, ressursNr: e.target.value})} /></td>
                <td className="px-4 py-2 text-right"><input type="number" className="w-20 border p-1 rounded text-right" value={editForm.balance || 0} onChange={e => setEditForm({...editForm, balance: Number(e.target.value)})} /></td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end space-x-2">
                    <button onClick={cancelEdit} className="p-1.5 text-slate-400 hover:text-slate-600"><X size={16} /></button>
                    <button onClick={handleSave} className="p-1.5 text-green-600 hover:text-green-700"><Save size={16} /></button>
                  </div>
                </td>
              </tr>
            )}
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                {editingUserId === u.id && !isAdding ? (
                  <>
                    <td className="px-4 py-2"><input className="w-full border p-1 rounded" value={editForm.firstName || ''} onChange={e => setEditForm({...editForm, firstName: e.target.value})} /></td>
                    <td className="px-4 py-2"><input className="w-full border p-1 rounded" value={editForm.fullName || ''} onChange={e => setEditForm({...editForm, fullName: e.target.value})} /></td>
                    <td className="px-4 py-2"><input className="w-full border p-1 rounded" value={editForm.ansattNr || ''} onChange={e => setEditForm({...editForm, ansattNr: e.target.value})} /></td>
                    <td className="px-4 py-2"><input className="w-full border p-1 rounded" value={editForm.ressursNr || ''} onChange={e => setEditForm({...editForm, ressursNr: e.target.value})} /></td>
                    <td className="px-4 py-2 text-right"><input type="number" className="w-20 border p-1 rounded text-right" value={editForm.balance || 0} onChange={e => setEditForm({...editForm, balance: Number(e.target.value)})} /></td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end space-x-2">
                        <button onClick={cancelEdit} className="p-1.5 text-slate-400 hover:text-slate-600"><X size={16} /></button>
                        <button onClick={handleSave} className="p-1.5 text-green-600 hover:text-green-700"><Save size={16} /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-slate-800">{u.firstName}</td>
                    <td className="px-4 py-3">{u.fullName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{u.ansattNr}</td>
                    <td className="px-4 py-3 font-mono text-xs">{u.ressursNr}</td>
                    <td className="px-4 py-3 text-right font-mono">{u.balance.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => startEdit(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(u)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && !isAdding && (
          <div className="p-8 text-center text-slate-500">
            Ingen brukere funnet.
          </div>
        )}
      </div>
    </div>
  );
}
