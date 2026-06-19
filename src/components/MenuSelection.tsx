import React, { useState, useEffect } from 'react';
import { User, MENU_ITEMS, MenuItem } from '../types';
import { ChevronLeft, ShoppingCart, CheckCircle2, Minus, Plus, Trash2 } from 'lucide-react';
import { createTransaction } from '../db';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  user: User;
  menuItems: MenuItem[];
  threshold: number;
  onCancel: () => void;
  onComplete: () => void;
}

export function MenuSelection({ user, menuItems, threshold, onCancel, onComplete }: Props) {
  const [cart, setCart] = useState<{ item: MenuItem; count: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Track floating +1 animations
  const [animations, setAnimations] = useState<{id: string, itemId: string, x: number, y: number}[]>([]);

  const addItem = (item: MenuItem, event?: React.MouseEvent) => {
    // Add floating animation if event is provided
    if (event) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const animId = Math.random().toString(36).substr(2, 9);
      // Randomize position slightly around the click or center of the element
      const offsetX = typeof event.clientX === 'number' ? event.clientX - rect.left : rect.width / 2;
      setAnimations(prev => [...prev, { id: animId, itemId: item.id, x: offsetX, y: rect.height / 2 }]);
      
      // Auto remove animation
      setTimeout(() => {
        setAnimations(prev => prev.filter(a => a.id !== animId));
      }, 1000);
    }

    setCart((prev) => {
      const existing = prev.find((p) => p.item.id === item.id);
      if (existing) {
        return prev.map((p) =>
          p.item.id === item.id ? { ...p, count: p.count + 1 } : p
        );
      }
      return [...prev, { item, count: 1 }];
    });
  };

  const removeItem = (itemId: string, completely: boolean = false) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.item.id === itemId);
      if (existing && existing.count > 1 && !completely) {
        return prev.map((p) =>
          p.item.id === itemId ? { ...p, count: p.count - 1 } : p
        );
      }
      return prev.filter((p) => p.item.id !== itemId);
    });
  };

  const total = cart.reduce((acc, curr) => acc + curr.item.price * curr.count, 0);

  const handleCheckout = async () => {
    if (total === 0 || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const itemsString = cart.map(c => `${c.count}x ${c.item.name}`).join(', ');
      await createTransaction(user, total, itemsString);
      setShowSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2500);
    } catch (e) {
      console.error(e);
      alert('En feil oppstod. Prøv igjen.');
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full overflow-hidden">
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          className="text-green-500 mb-6"
        >
          <CheckCircle2 size={120} strokeWidth={1.5} />
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl text-slate-800 font-sans tracking-tight font-medium text-center"
        >
          Kjøp registrert!
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl text-slate-500 mt-4"
        >
          {total.toFixed(2)} kr er lagt til din saldo.
        </motion.p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full w-full max-w-7xl mx-auto space-y-6 lg:space-y-0 lg:space-x-10 p-6 lg:px-10 lg:py-8 overflow-x-hidden animate-in fade-in duration-500">
      
      {/* Left side: Menu */}
      <section className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center space-x-3">
            <span className="text-slate-400 font-bold uppercase tracking-widest text-sm flex items-center space-x-2">
               <span className="w-2 h-2 rounded-full bg-slate-300"></span> Steg 2
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight ml-2">Meny</h2>
          </div>
          <button 
            onClick={onCancel}
            className="flex items-center text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2 shadow-sm rounded-full active:scale-95"
          >
            <ChevronLeft size={16} className="mr-1" /> Bytt bruker
          </button>
        </div>

        <div className="flex flex-wrap -m-2 lg:-m-3 overflow-y-auto overflow-x-hidden pb-10 content-start pr-2">
          {menuItems.map(item => {
            const cartItem = cart.find(c => c.item.id === item.id);
            const count = cartItem?.count || 0;
            const isSelected = count > 0;
            const itemAnims = animations.filter(a => a.itemId === item.id);

            return (
              <div key={item.id} className="w-1/2 md:w-1/3 xl:w-1/4 p-2 lg:p-3 relative">
                <div
                  onClick={(e) => addItem(item, e)}
                  className={`relative h-full bg-white rounded-3xl p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer user-select-none active:scale-95
                   ${isSelected ? 'border-2 border-slate-900 shadow-md bg-slate-50/50' : 'border border-slate-200 hover:border-slate-300 hover:shadow-md hover:-translate-y-1'}`}
                >
                  <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                    {/* Floating +1 Animations */}
                    <AnimatePresence>
                      {itemAnims.map(anim => (
                        <motion.div
                          key={anim.id}
                          initial={{ opacity: 1, y: 0, scale: 0.8 }}
                          animate={{ opacity: 0, y: -40, scale: 1.2 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="absolute text-2xl font-black text-slate-900 pointer-events-none z-20 drop-shadow-md"
                          style={{ left: anim.x - 10, top: anim.y - 10 }}
                        >
                          +1
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {isSelected && (
                    <motion.div 
                      key={count}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs sm:text-sm font-bold shadow-md z-10"
                    >
                      {count}
                    </motion.div>
                  )}
                  
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[4rem]">
                    <h3 className={`font-semibold text-base sm:text-lg leading-tight transition-colors ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                      {item.name}
                    </h3>
                    <p className={`font-bold text-lg sm:text-xl mt-1.5 transition-colors ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>{item.price},-</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Right side: Checkout Summary */}
      <section className="w-full lg:w-[400px] flex flex-col h-full shrink-0">
        <div className="mb-8 flex items-center space-x-3 shrink-0">
           <span className="text-slate-400 font-bold uppercase tracking-wider text-sm flex items-center space-x-2">
             <span className="w-2 h-2 rounded-full bg-slate-300"></span> Steg 3
           </span>
           <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight ml-2">Kvittering</h2>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-[2rem] flex-1 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="p-8 pb-4 border-b border-dashed border-gray-200 shrink-0">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Bruker</p>
            <div className="flex justify-between items-center">
              <p className="text-xl font-bold text-slate-800">{user.firstName}</p>
              <div className="text-right">
                <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">Nåværende saldo</p>
                <p className="text-sm font-bold text-slate-600">kr {user.balance.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <div className="p-8 flex-1 overflow-y-auto space-y-4">
            {cart.length === 0 ? (
               <p className="text-slate-400 text-center mt-6 text-sm">
                 Ingen varer valgt
               </p>
            ) : (
              <AnimatePresence mode="popLayout">
                {cart.map((c) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={c.item.id} 
                    className="flex flex-col bg-slate-50 border border-slate-100 rounded-2xl p-4 gap-3"
                  >
                    <div className="flex justify-between items-center text-slate-800">
                      <span className="font-semibold">{c.item.name}</span>
                      <span className="font-bold flex-shrink-0 text-lg">{c.item.price * c.count},-</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-full p-1 shadow-sm">
                        <button onClick={() => removeItem(c.item.id)} className="w-8 h-8 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors active:scale-90">
                          <Minus size={16} />
                        </button>
                        <span className="font-bold w-4 tracking-tighter text-center tabular-nums">{c.count}</span>
                        <button onClick={() => addItem(c.item)} className="w-8 h-8 rounded-full bg-slate-50 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-colors active:scale-90">
                          <Plus size={16} />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeItem(c.item.id, true)} 
                        className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Fjern helt"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <div className="p-8 bg-slate-50/80 backdrop-blur-md border-t border-slate-100 shrink-0">
            <div className="flex justify-between items-end mb-6">
              <span className="text-slate-500 font-medium uppercase tracking-wider text-sm">Å betale</span>
              <span className="text-4xl font-extrabold text-slate-900 tracking-tighter">{total},-</span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={total === 0 || isSubmitting}
              className={`w-full py-5 rounded-[1.5rem] font-bold text-xl transition-all duration-300 ${total > 0 && !isSubmitting ? 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-300 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'}`}
            >
              {isSubmitting ? 'Behandler...' : 'Gjennomfør Kjøp'}
            </button>
          </div>
        </div>

        <div className="mt-6 p-5 bg-slate-100/80 rounded-[1.5rem] flex items-start space-x-3 shrink-0 hidden md:flex">
          <span className="text-xl">💡</span>
          <p className="text-xs leading-relaxed text-slate-500 font-medium tracking-wide">
            Beløpet registreres på din åpne lunsj-saldo.
          </p>
        </div>
      </section>
    </div>
  );
}
