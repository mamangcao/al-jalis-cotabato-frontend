import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, MessageSquareHeart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isToday, isTomorrow, format } from 'date-fns';
import { ToastContainer } from './Toast';
import { isEndOfMonth, isLastWeekOfMonth } from '../utils/evaluations';
import { formatDisplayDate } from '../utils/dateUtils';

export interface Notification {
  id: string;
  type: 'event_today' | 'event_tomorrow' | 'system';
  message: string;
  timestamp: Date;
  isRead: boolean;
}

interface NotificationBellProps {
  events: any[];
  onNavigate?: (tab: string) => void;
}

export default function NotificationBell({ events, onNavigate }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Toast state
  const [activeToasts, setActiveToasts] = useState<Notification[]>([]);
  const isFirstRender = useRef(true);

  useEffect(() => {
    setNotifications((prev) => {
      const existingReadIds = new Set(prev.filter(n => n.isRead).map(n => n.id));
      const previousIds = new Set(prev.map(n => n.id));
      const newNotifications: Notification[] = [];
      const newToasts: Notification[] = [];
      
      events.forEach(event => {
        // Ensure event start is a Date object
        const eventDate = new Date(event.start);
        
        if (isToday(eventDate)) {
          const id = `today-${event.id}`;
          const notification: Notification = {
            id,
            type: 'event_today',
            message: `Event Today: ${event.title} starts at ${format(eventDate, 'h:mm a')}`,
            timestamp: new Date(),
            isRead: existingReadIds.has(id)
          };
          newNotifications.push(notification);
          if (!previousIds.has(id)) newToasts.push(notification);
        } else if (isTomorrow(eventDate)) {
          const id = `tomorrow-${event.id}`;
          const notification: Notification = {
            id,
            type: 'event_tomorrow',
            message: `Reminder: ${event.title} is scheduled for tomorrow.`,
            timestamp: new Date(),
            isRead: existingReadIds.has(id)
          };
          newNotifications.push(notification);
          if (!previousIds.has(id)) newToasts.push(notification);
        }
      });

      // End-of-Month / Last Week Anonymous Peer Evaluation reminder
      if (isLastWeekOfMonth() || isEndOfMonth()) {
        const now = new Date();
        const evalId = `eom-eval-reminder-${now.getFullYear()}-${now.getMonth()}`;
        const evalNotification: Notification = {
          id: evalId,
          type: 'system',
          message: "Monthly Peer Evaluations are Due: The feedback portal is now open for the final week of the month.",
          timestamp: now,
          isRead: existingReadIds.has(evalId)
        };
        newNotifications.push(evalNotification);
        if (!previousIds.has(evalId)) newToasts.push(evalNotification);
      }
      
      // Trigger toasts for newly added notifications, only after initial load
      if (!isFirstRender.current && newToasts.length > 0) {
        setActiveToasts(currentToasts => {
          const combined = [...currentToasts, ...newToasts];
          // Limit to max 3 visible toasts
          return combined.slice(-3);
        });
      }
      
      // Sort: unread first, then by timestamp (newest first)
      return newNotifications.sort((a, b) => {
        if (a.isRead === b.isRead) {
          return b.timestamp.getTime() - a.timestamp.getTime();
        }
        return a.isRead ? 1 : -1;
      });
    });
    
    isFirstRender.current = false;
  }, [events]);

  const removeToast = (id: string) => {
    setActiveToasts(current => current.filter(t => t.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };
  
  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <>
      <div className="relative print:hidden" ref={dropdownRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 ? (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : isEndOfMonth() ? (
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          ) : null}
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-50 flex flex-col max-h-[400px]"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10">
                <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-all duration-200 ease-in-out hover:opacity-80 active:scale-[0.97]"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                      <BellRing size={20} className="text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">You're all caught up!</p>
                    <p className="text-xs text-gray-400 mt-1">No upcoming events right now.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        onClick={() => {
                          setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
                          if (notification.id.startsWith('eom-eval')) {
                            onNavigate?.('evaluations');
                            window.history.pushState(null, '', '/evaluations');
                            setIsOpen(false);
                          }
                        }}
                        className={`px-4 py-3.5 flex gap-3 transition-colors duration-200 ease-in-out cursor-pointer ${notification.isRead ? 'bg-white hover:bg-gray-50' : 'bg-orange-50/40 hover:bg-orange-50/60'}`}
                      >
                        <div className="shrink-0 mt-1">
                          <div className={`w-2 h-2 rounded-full ${notification.isRead ? 'bg-transparent' : 'bg-orange-500 shadow-sm shadow-orange-500/20'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] leading-snug ${notification.isRead ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                            {notification.message}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-1.5 font-medium">
                            {formatDisplayDate(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <ToastContainer toasts={activeToasts} removeToast={removeToast} />
    </>
  );
}

