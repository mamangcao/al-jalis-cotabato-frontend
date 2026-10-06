import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, title, message }: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white shadow-xl w-[95%] sm:w-[500px] md:max-w-2xl max-h-[90vh] overflow-y-auto mx-auto rounded-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={20} />
            <h3 className="text-[16px] font-semibold text-gray-900">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer hover:opacity-80 p-1"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-[14px] text-gray-600 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-[14px] font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200 ease-in-out hover:opacity-80 active:scale-[0.97] cursor-pointer"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className="px-4 py-2 text-[14px] font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all duration-200 ease-in-out hover:opacity-90 active:scale-[0.97] cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  , document.body);
}
