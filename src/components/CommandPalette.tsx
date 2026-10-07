import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Users, DollarSign, ClipboardList, User } from 'lucide-react';
import { createPortal } from 'react-dom';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    reverts: any[];
    donations: any[];
    members: any[];
    tasks: any[];
  };
  onNavigate: (tab: string) => void;
}

export default function CommandPalette({ isOpen, onClose, data, onNavigate }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const q = query.trim().toLowerCase();

  const filteredReverts = (isOpen && q && Array.isArray(data.reverts)) 
    ? data.reverts.filter(r => 
        (r?.name && r.name.toLowerCase().includes(q)) || 
        (r?.emailAddress && r.emailAddress.toLowerCase().includes(q))
      )
    : [];

  const filteredDonations = (isOpen && q && Array.isArray(data.donations))
    ? data.donations.filter(d => 
        (d?.donorName && d.donorName.toLowerCase().includes(q)) ||
        (d?.amount != null && String(d.amount).toLowerCase().includes(q))
      )
    : [];

  const filteredMembers = (isOpen && q && Array.isArray(data.members))
    ? data.members.filter(m => 
        (m?.name && m.name.toLowerCase().includes(q)) ||
        (m?.role && m.role.toLowerCase().includes(q))
      )
    : [];

  const filteredTasks = (isOpen && q && Array.isArray(data.tasks))
    ? data.tasks.filter(t => 
        (t?.title && t.title.toLowerCase().includes(q)) ||
        (t?.description && t.description.toLowerCase().includes(q))
      )
    : [];

  const hasResults = q.length > 0 && (
    filteredReverts.length > 0 || 
    filteredDonations.length > 0 || 
    filteredMembers.length > 0 || 
    filteredTasks.length > 0
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex justify-center items-start pt-[10vh]">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden mx-4"
          >
            {/* Search Input Header */}
            <div className="relative border-b border-gray-100 flex items-center px-4">
              <Search className="text-gray-400" size={24} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search across all modules..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full text-xl p-4 bg-transparent outline-hidden text-gray-800 placeholder-gray-400"
              />
              <button onClick={onClose} className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors">ESC</button>
            </div>

            {/* Results Area */}
            <div className="max-h-[60vh] overflow-y-auto">
              {query.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <p className="text-sm">Start typing to search across the system.</p>
                </div>
              ) : hasResults ? (
                <div className="py-2">
                  {filteredReverts.length > 0 && (
                    <div className="mb-2">
                      <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 uppercase tracking-wider">
                        Reverts
                      </div>
                      {filteredReverts.map(revert => (
                        <div key={revert.id} onClick={() => { onNavigate('reverts'); onClose(); }} className="flex items-center gap-3 p-3 px-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                            <User size={18} />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{revert.name}</div>
                            <div className="text-xs text-gray-500">{revert.emailAddress}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {filteredDonations.length > 0 && (
                    <div className="mb-2">
                      <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 uppercase tracking-wider">
                        Donations
                      </div>
                      {filteredDonations.map(donation => (
                        <div key={donation.id} onClick={() => { onNavigate('history'); onClose(); }} className="flex items-center gap-3 p-3 px-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors">
                          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
                            <DollarSign size={18} />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{donation.donorName}</div>
                            <div className="text-xs text-gray-500">₱{donation.amount.toLocaleString()} - {donation.category}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {filteredMembers.length > 0 && (
                    <div className="mb-2">
                      <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 uppercase tracking-wider">
                        Members
                      </div>
                      {filteredMembers.map(member => (
                        <div key={member.id} onClick={() => { onNavigate('directory'); onClose(); }} className="flex items-center gap-3 p-3 px-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                            <Users size={18} />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{member.name}</div>
                            <div className="text-xs text-gray-500">{member.role}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {filteredTasks.length > 0 && (
                    <div className="mb-2">
                      <div className="px-4 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 uppercase tracking-wider">
                        Tasks
                      </div>
                      {filteredTasks.map(task => (
                        <div key={task.id} onClick={() => { onNavigate('task-board'); onClose(); }} className="flex items-center gap-3 p-3 px-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors">
                          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                            <ClipboardList size={18} />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{task.title}</div>
                            <div className="text-xs text-gray-500 truncate max-w-md">{task.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <p className="text-sm">No results found for "{query}".</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
