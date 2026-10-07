import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Calendar, 
  Bell, 
  ArrowRight, 
  ClipboardList, 
  FileText, 
  MessageSquareHeart, 
  Users 
} from 'lucide-react';
import { Notification } from './NotificationBell';

interface ToastProps {
  notification: Notification;
  onClose: (id: string) => void;
  onAction?: (notification: Notification) => void;
}

export function Toast({ notification, onClose, onAction }: ToastProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const duration = 6000;
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

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAction) {
      onAction(notification);
    }
    onClose(notification.id);
  };

  const handleCardClick = () => {
    if (onAction) {
      onAction(notification);
    }
    onClose(notification.id);
  };

  const getIcon = () => {
    const type = notification.type || '';
    const entityType = notification.entity_type || '';

    if (type.includes('event') || entityType === 'event') {
      return <Calendar size={16} />;
    }
    if (type.includes('task') || entityType === 'task') {
      return <ClipboardList size={16} />;
    }
    if (type.includes('leave') || entityType === 'leave') {
      return <FileText size={16} />;
    }
    if (type.includes('eval') || entityType === 'evaluation') {
      return <MessageSquareHeart size={16} />;
    }
    if (type.includes('revert') || entityType === 'revert') {
      return <Users size={16} />;
    }
    return <Bell size={16} />;
  };

  const getTitle = () => {
    if (notification.title) return notification.title;
    switch (notification.type) {
      case 'event_today':
        return 'Event Today';
      case 'event_tomorrow':
        return 'Reminder for Tomorrow';
      case 'evaluation_reminder':
        return 'Peer Evaluation Due';
      case 'task_assigned':
        return 'High Priority Task';
      case 'leave_pending':
        return 'Leave Request';
      case 'revert_mentorship':
        return 'Mentorship Needed';
      default:
        return 'Notification';
    }
  };

  const getActionLabel = () => {
    if (notification.action_label) return notification.action_label;
    if (notification.type === 'event_today') return 'View Events';
    if (notification.type === 'event_tomorrow') return 'View Event';
    if (notification.type === 'evaluation_reminder') return 'Start Evaluation';
    if (notification.type === 'task_assigned') return 'View Task';
    if (notification.type === 'leave_pending') return 'Review Leave';
    if (notification.type === 'revert_mentorship') return 'View Revert';
    return 'View Details';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      onClick={handleCardClick}
      className="pointer-events-auto w-full max-w-sm bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden relative group cursor-pointer hover:shadow-xl transition-shadow"
      role="alert"
    >
      <div className="p-4 flex gap-3">
        <div className="shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
            {getIcon()}
          </div>
        </div>
        
        <div className="flex-1 min-w-0 pt-1">
          <p className="text-[13px] font-bold text-gray-900 leading-tight">
            {getTitle()}
          </p>
          <p className="text-[13px] text-gray-600 mt-1 leading-snug">
            {notification.message.replace(/^(Event Today: |Reminder: |Urgent Task: |Leave Request: |Mentorship Needed: )/, '')}
          </p>
          
          <button 
            type="button"
            className="mt-2 text-[12px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors cursor-pointer py-1 px-1.5 -ml-1.5 rounded hover:bg-orange-50 active:scale-[0.98]"
            onClick={handleActionClick}
          >
            {getActionLabel()} <ArrowRight size={12} />
          </button>
        </div>
        
        <div className="shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose(notification.id);
            }}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1.5 transition-colors focus:outline-none cursor-pointer"
            aria-label="Dismiss notification"
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
  onAction?: (notification: Notification) => void;
}

export function ToastContainer({ toasts, removeToast, onAction }: ToastContainerProps) {
  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-3 pointer-events-none w-full max-w-sm sm:right-6 sm:top-6">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast 
            key={toast.id} 
            notification={toast} 
            onClose={removeToast} 
            onAction={onAction}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
