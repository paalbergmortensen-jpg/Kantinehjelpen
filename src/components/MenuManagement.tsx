import React, { useState } from 'react';
import { MenuItem } from '../types';
import { createMenuItem, updateMenuItem, deleteMenuItem } from '../db';
import { Plus, Edit2, Trash2, X, Save } from 'lucide-react';

export function MenuManagement({ menuItems }: { menuItems: MenuItem[] }) {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MenuItem>>({});
  const [isAdding, setIsAdding] = useState(false);

  const startEdit = (item: MenuItem) => {
    setEditingItemId(item.id);
    setEditForm(item);
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    setEditForm({});
    setIsAdding(false);
  };

  const handleSave = async () => {
    if (!editForm.name || editForm.price === undefined) {
      alert("Alle felt må fylles ut.");
      return;
    }

    try {
      const price = Number(editForm.price) || 0;
      if (isAdding) {
        await createMenuItem({
          name: editForm.name,
          price: price
        });
      } else if (editingItemId) {
        await updateMenuItem({
          id: editingItemId,
          name: editForm.name,
          price: price
        } as MenuItem);
      }
      cancelEdit();
    } catch (e: any) {
      alert("Feil ved lagring: " + e.message);
    }
  };

  const handleDelete = async (item: MenuItem) => {
      if (confirm(`Er du sikker på at du vil slette ${item.name}?`)) {
        try {
          await deleteMenuItem(item.id);
        } catch (e: any) {
          console.error("Feil ved sletting: " + e.message);
        }
      }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium text-slate-800">Administrer Meny ({menuItems.length})</h2>
        <button
          onClick={() => {
            setIsAdding(true);
            setEditingItemId('new');
            setEditForm({ price: 0 });
          }}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={16} /> Ny vare
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Produktnavn</th>
              <th className="px-4 py-3 text-right">Pris (kr)</th>
              <th className="px-4 py-3 text-right">Handlinger</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isAdding && (
              <tr className="bg-blue-50">
                <td className="px-4 py-2"><input className="w-full border p-1 rounded" placeholder="Eks: Eple" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} /></td>
                <td className="px-4 py-2 text-right"><input type="number" className="w-24 border p-1 rounded text-right" value={editForm.price || 0} onChange={e => setEditForm({...editForm, price: Number(e.target.value)})} /></td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end space-x-2">
                    <button onClick={cancelEdit} className="p-1.5 text-slate-400 hover:text-slate-600"><X size={16} /></button>
                    <button onClick={handleSave} className="p-1.5 text-green-600 hover:text-green-700"><Save size={16} /></button>
                  </div>
                </td>
              </tr>
            )}
            {menuItems.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                {editingItemId === item.id && !isAdding ? (
                  <>
                    <td className="px-4 py-2"><input className="w-full border p-1 rounded" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} /></td>
                    <td className="px-4 py-2 text-right"><input type="number" className="w-24 border p-1 rounded text-right" value={editForm.price || 0} onChange={e => setEditForm({...editForm, price: Number(e.target.value)})} /></td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end space-x-2">
                        <button onClick={cancelEdit} className="p-1.5 text-slate-400 hover:text-slate-600"><X size={16} /></button>
                        <button onClick={handleSave} className="p-1.5 text-green-600 hover:text-green-700"><Save size={16} /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                    <td className="px-4 py-3 text-right font-mono">{item.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => startEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(item)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {menuItems.length === 0 && !isAdding && (
          <div className="p-8 text-center text-slate-500">
            Ingen menyelementer funnet.
          </div>
        )}
      </div>
    </div>
  );
}
