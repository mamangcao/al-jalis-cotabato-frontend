import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Bell, ArrowRight } from 'lucide-react';
import { Notification } from './NotificationBell';

interface ToastProps {
  notification: Notification;
  onClose: (id: string) => void;
}

export function Toast({ notification, onClose }: ToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 5000;
    const interval = 50;
    const step = (interval / duration) * 100;
    
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (progress <= 0) {
      onClose(notification.id);
    }
  }, [progress, notification.id, onClose]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className="pointer-events-auto w-full max-w-sm bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden relative group"
    >
      <div className="p-4 flex gap-3">
        <div className="shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
            {notification.type.includes('event') ? <Calendar size={16} /> : <Bell size={16} />}
          </div>
        </div>
        
        <div className="flex-1 min-w-0 pt-1">
          <p className="text-[13px] font-bold text-gray-900 leading-tight">
            {notification.type === 'event_today' ? 'Event Today' : 
             notification.type === 'event_tomorrow' ? 'Reminder for Tomorrow' : 'Notification'}
          </p>
          <p className="text-[13px] text-gray-600 mt-1 leading-snug">
            {notification.message.replace(/^(Event Today: |Reminder: )/, '')}
          </p>
          
          <button 
            className="mt-2 text-[12px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors"
            onClick={() => onClose(notification.id)}
          >
            View Event <ArrowRight size={12} />
          </button>
        </div>
        
        <div className="shrink-0">
          <button
            onClick={() => onClose(notification.id)}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors focus:outline-none"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-1 w-full bg-gray-50 absolute bottom-0 left-0">
        <motion.div 
          className="h-full bg-orange-500 origin-left"
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: Notification[];
  removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-3 pointer-events-none w-full max-w-sm sm:right-6 sm:top-6">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast key={toast.id} notification={toast} onClose={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
