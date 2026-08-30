import React, { useState, useEffect } from 'react';
import { FileText, Send, Trash2, User, Clock, Shield } from 'lucide-react';
import { Customer, CustomerNote } from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { useApp } from '../../../context/AppContext';
import { 
  subscribeCustomerNotes, 
  createCustomerNoteInFirestore, 
  deleteCustomerNoteInFirestore 
} from '../../../services/firestoreService';

interface NotesTabProps {
  customer: Customer;
}

export const NotesTab: React.FC<NotesTabProps> = ({ customer }) => {
  const { currentUser } = useAuth();
  const { addToast } = useApp();
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!customer?.id) {
      setNotes([]);
      setIsLoading(false);
      return;
    }

    const unsub = subscribeCustomerNotes(customer.id, (list) => {
      setNotes(list);
      setIsLoading(false);
    });

    return () => unsub();
  }, [customer?.id]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      const res = await createCustomerNoteInFirestore(
        {
          customerId: customer.id,
          note: newNoteText.trim()
        },
        currentUser
      );

      if (res.success) {
        setNewNoteText('');
        addToast({
          type: 'success',
          title: 'Note Added',
          message: 'Internal note saved to customer profile.'
        });
      } else {
        addToast({
          type: 'error',
          title: 'Could Not Save Note',
          message: res.error || 'Failed to save note.'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!currentUser) return;
    if (!window.confirm('Are you sure you want to remove this internal note?')) return;

    const res = await deleteCustomerNoteInFirestore(noteId, currentUser);
    if (res.success) {
      addToast({
        type: 'info',
        title: 'Note Removed',
        message: 'The internal note was deleted.'
      });
    } else {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: res.error || 'Could not delete note.'
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Add Note Form */}
      <form onSubmit={handleAddNote} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 uppercase tracking-wide">
          <FileText className="w-4 h-4 text-[#0F766E]" />
          <span>Add Internal Operational Note</span>
        </div>

        <textarea
          rows={3}
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          placeholder="Record payment commitments, customer preferences, delivery requirements, or risk observations (internal staff only)..."
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#0F766E] outline-hidden resize-none"
          required
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-500">
            Visible to Admin and Sales Representatives only.
          </span>
          <button
            type="submit"
            disabled={isSubmitting || !newNoteText.trim()}
            className="px-4 py-2 bg-[#0F766E] hover:bg-[#0D655E] disabled:bg-slate-300 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Saving...' : 'Post Note'}</span>
          </button>
        </div>
      </form>

      {/* Notes Stream */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Internal Notes History ({notes.length})
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
            Loading notes...
          </div>
        ) : notes.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No internal notes recorded for this customer yet. Use the form above to add the first note.
          </div>
        ) : (
          <div className="space-y-2.5">
            {notes.map((n) => {
              const canDelete = currentUser?.role === 'admin' || n.createdBy === currentUser?.uid;
              return (
                <div
                  key={n.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full bg-teal-50 text-[#0F766E] flex items-center justify-center font-bold text-xs">
                        {n.createdByName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">{n.createdByName || 'Staff User'}</span>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                          <span className="capitalize font-semibold text-slate-600">{n.createdByRole || 'Staff'}</span>
                          <span>•</span>
                          <span>{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(n.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {n.note}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
