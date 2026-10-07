import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, BellRing, Calendar, ClipboardList, FileText, MessageSquareHeart, Users, Megaphone, Pin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isToday, isTomorrow, format } from 'date-fns';
import { ToastContainer } from './Toast';
import { isEndOfMonth, isLastWeekOfMonth } from '../utils/evaluations';
import { formatDisplayDate } from '../utils/dateUtils';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';
import { 
  AppNotification, 
  resolveNotificationDestination 
} from '../utils/notificationRouter';
import { 
  canManageFinance, 
  canManagePersonnel, 
  canAccessReverts,
  canAccessNoticeboard
} from '../lib/permissions';

export type Notification = AppNotification;

interface NotificationBellProps {
  events: any[];
  tasks?: any[];
  leaves?: any[];
  reverts?: any[];
  notices?: any[];
  onNavigate?: (tab: string, entityId?: string | number) => void;
}

const STORAGE_KEY_READ_NOTIFS = 'al_jalis_read_notifications';
const SESSION_KEY_DISMISSED_TOASTS = 'al_jalis_session_dismissed_toasts';

function getStoredReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_READ_NOTIFS);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveStoredReadIds(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY_READ_NOTIFS, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore storage quota errors
  }
}

function getSessionDismissedToastIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_DISMISSED_TOASTS);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveSessionDismissedToastIds(ids: Set<string>): void {
  try {
    sessionStorage.setItem(SESSION_KEY_DISMISSED_TOASTS, JSON.stringify(Array.from(ids)));
  } catch {
    // Ignore
  }
}

export default function NotificationBell({ 
  events = [], 
  tasks = [], 
  leaves = [], 
  reverts = [], 
  notices = [],
  onNavigate 
}: NotificationBellProps) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Toast state
  const [activeToasts, setActiveToasts] = useState<Notification[]>([]);
  const dismissedToastIdsRef = useRef<Set<string>>(getSessionDismissedToastIds());
  const hasTriggeredInitialToastsRef = useRef(false);

  // ── Compute Notifications ──────────────────────────────────────────────────
  useEffect(() => {
    const readIds = getStoredReadIds();
    const newNotifications: Notification[] = [];
    const toastsToTrigger: Notification[] = [];

    // 1. Scheduled Events (Today & Tomorrow)
    events.forEach(event => {
      if (!event.start) return;
      const eventDate = new Date(event.start);
      if (isNaN(eventDate.getTime())) return;
      
      if (isToday(eventDate)) {
        const id = `today-${event.id}`;
        const notif: Notification = {
          id,
          type: 'event_today',
          entity_type: 'event',
          entity_id: event.id,
          title: 'Event Today',
          message: `Event Today: ${event.title} starts at ${format(eventDate, 'h:mm a')}`,
          timestamp: eventDate,
          isRead: readIds.has(id),
          target_tab: 'calendar',
          action_url: '/calendar',
          action_label: 'View Events',
          metadata: { eventTitle: event.title }
        };
        newNotifications.push(notif);
        if (!dismissedToastIdsRef.current.has(id)) {
          toastsToTrigger.push(notif);
        }
      } else if (isTomorrow(eventDate)) {
        const id = `tomorrow-${event.id}`;
        const notif: Notification = {
          id,
          type: 'event_tomorrow',
          entity_type: 'event',
          entity_id: event.id,
          title: 'Reminder for Tomorrow',
          message: `Reminder: ${event.title} is scheduled for tomorrow.`,
          timestamp: eventDate,
          isRead: readIds.has(id),
          target_tab: 'calendar',
          action_url: '/calendar',
          action_label: 'View Event',
          metadata: { eventTitle: event.title }
        };
        newNotifications.push(notif);
      }
    });

    // 2. End-of-Month / Last Week Anonymous Peer Evaluation reminder
    if (isLastWeekOfMonth() || isEndOfMonth()) {
      const now = new Date();
      const evalId = `eom-eval-reminder-${now.getFullYear()}-${now.getMonth()}`;
      const evalNotification: Notification = {
        id: evalId,
        type: 'evaluation_reminder',
        entity_type: 'evaluation',
        title: 'Peer Evaluations Due',
        message: "Monthly Peer Evaluations are Due: The feedback portal is now open for the final week of the month.",
        timestamp: now,
        isRead: readIds.has(evalId),
        target_tab: 'evaluations',
        action_url: '/evaluations',
        action_label: 'Start Evaluation'
      };
      newNotifications.push(evalNotification);
      if (!dismissedToastIdsRef.current.has(evalId) && !hasTriggeredInitialToastsRef.current) {
        toastsToTrigger.push(evalNotification);
      }
    }

    // 3. High Priority Pending Tasks for the User
    if (tasks.length > 0 && currentUser?.id) {
      tasks.forEach(task => {
        const isAssigned = String(task.assignee_user_id || '') === String(currentUser.id) ||
                           String(task.assignee || '') === String(currentUser.id) ||
                           String(task.assignee || '') === String(currentUser.member_id || '');
        const isHighPriority = task.priority === 'High';
        const isPending = task.status === 'todo' || task.status === 'in-progress';

        if (isAssigned && isHighPriority && isPending) {
          const taskId = `task-high-${task.id}`;
          newNotifications.push({
            id: taskId,
            type: 'task_assigned',
            entity_type: 'task',
            entity_id: task.id,
            title: 'High Priority Task',
            message: `Urgent Task: ${task.title} (${task.priority} Priority)`,
            timestamp: new Date(task.updated_at || task.created_at || Date.now()),
            isRead: readIds.has(taskId),
            target_tab: 'task-board',
            action_url: '/task-board',
            action_label: 'View Task'
          });
        }
      });
    }

    // 4. Pending Leave Requests (for HR / Director / Finance)
    const canReviewLeaves = canManagePersonnel(currentUser?.role) || canManageFinance(currentUser?.role);
    if (canReviewLeaves && leaves.length > 0) {
      leaves.forEach(leave => {
        const isPending = leave.approval?.director === 'Pending' || leave.approval?.finance === 'Pending';
        if (isPending) {
          const leaveId = `leave-pending-${leave.id}`;
          newNotifications.push({
            id: leaveId,
            type: 'leave_pending',
            entity_type: 'leave',
            entity_id: leave.id,
            title: 'Pending Leave Request',
            message: `Leave Request: ${leave.employeeName} filed ${leave.leaveType}`,
            timestamp: new Date(leave.dateFiled || Date.now()),
            isRead: readIds.has(leaveId),
            target_tab: 'leaves',
            action_url: '/leaves',
            action_label: 'Review Leave'
          });
        }
      });
    }

    // 5. Reverts needing mentorship
    if (canAccessReverts(currentUser) && reverts.length > 0) {
      const pendingReverts = reverts.filter(r => r.mentorshipStatus === 'Pending Assignment');
      if (pendingReverts.length > 0) {
        const first = pendingReverts[0];
        const revertId = `revert-mentorship-summary-${pendingReverts.length}`;
        newNotifications.push({
          id: revertId,
          type: 'revert_mentorship',
          entity_type: 'revert',
          entity_id: first.id,
          title: 'Mentorship Needed',
          message: pendingReverts.length === 1
            ? `Mentorship Needed: ${first.name} needs a mentor assignment.`
            : `Mentorship Needed: ${pendingReverts.length} reverts require mentor assignment.`,
          timestamp: new Date(),
          isRead: readIds.has(revertId),
          target_tab: 'reverts',
          action_url: '/reverts',
          action_label: 'View Reverts'
        });
      }
    }

    // 6. Staff Noticeboard Notices & Posts
    if (canAccessNoticeboard(currentUser) && notices && notices.length > 0) {
      notices.forEach(item => {
        // Exclude items authored by current user (prevent self-notifications)
        const isAuthor = Boolean(
          (currentUser?.id && String(item.created_by_user_id || '') === String(currentUser.id)) ||
          (currentUser?.name && item.author_name && item.author_name.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
        );
        if (isAuthor) {
          return;
        }

        const isNotice = item.type === 'notice' || item.type === 'official_notice';
        const notifId = `noticeboard-${item.id}`;
        const title = isNotice ? 'Official Announcement' : 'Staff Post';
        const displaySnippet = item.title || item.content || item.text || 'New update posted';
        const message = isNotice 
            ? `Official Announcement: ${displaySnippet}`
            : `Staff Post from ${item.author_name || 'Staff'}: ${displaySnippet}`;

        const createdAt = item.created_at ? new Date(item.created_at) : new Date();

        const notif: Notification = {
          id: notifId,
          type: isNotice ? 'notice' : 'staff_post',
          entity_type: isNotice ? 'notice' : 'post',
          entity_id: item.id,
          title,
          message,
          timestamp: isNaN(createdAt.getTime()) ? new Date() : createdAt,
          isRead: readIds.has(notifId),
          target_tab: 'dashboard',
          action_url: '/',
          action_label: isNotice ? 'View Announcement' : 'View Note',
          metadata: { itemId: item.id, itemType: item.type }
        };

        newNotifications.push(notif);

        // In-app toast for recent (within last 24h), unread official announcements not yet dismissed in session
        const isRecent = (Date.now() - (isNaN(createdAt.getTime()) ? Date.now() : createdAt.getTime())) < 24 * 60 * 60 * 1000;
        if (isNotice && !readIds.has(notifId) && !dismissedToastIdsRef.current.has(notifId) && isRecent && !hasTriggeredInitialToastsRef.current) {
          toastsToTrigger.push(notif);
        }
      });
    }

    // Trigger toasts (limit to max 3)
    if (toastsToTrigger.length > 0) {
      setActiveToasts(currentToasts => {
        const existingIds = new Set(currentToasts.map(t => t.id));
        const added = toastsToTrigger.filter(t => !existingIds.has(t.id));
        if (added.length === 0) return currentToasts;
        const combined = [...currentToasts, ...added];
        return combined.slice(-3);
      });
    }

    hasTriggeredInitialToastsRef.current = true;

    // Sort: unread first, then by timestamp (newest first)
    newNotifications.sort((a, b) => {
      if (a.isRead === b.isRead) {
        return b.timestamp.getTime() - a.timestamp.getTime();
      }
      return a.isRead ? 1 : -1;
    });

    setNotifications(newNotifications);
  }, [events, tasks, leaves, reverts, notices, currentUser]);

  // ── Mark as Read ──────────────────────────────────────────────────────────
  const markAsRead = useCallback((id: string) => {
    const currentRead = getStoredReadIds();
    currentRead.add(id);
    saveStoredReadIds(currentRead);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    const allIds = getStoredReadIds();
    notifications.forEach(n => allIds.add(n.id));
    saveStoredReadIds(allIds);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, [notifications]);

  // ── Handle Action & Navigation ─────────────────────────────────────────────
  const handleNotificationAction = useCallback((notification: Notification) => {
    // 1. Mark notification as read
    markAsRead(notification.id);

    // 2. Resolve destination with whitelist & RBAC validation
    const dest = resolveNotificationDestination(notification, currentUser);

    // 3. Authorization check
    if (!dest.isAuthorized) {
      toast.error(dest.unauthorizedMessage || 'You do not have access to view this resource.');
      setIsOpen(false);
      return;
    }

    // 4. Close dropdown / modal
    setIsOpen(false);

    // 5. Navigate to destination
    if (onNavigate) {
      onNavigate(dest.tab, dest.entityId);
    }
  }, [currentUser, markAsRead, onNavigate]);

  // ── Toast Dismissal ───────────────────────────────────────────────────────
  const removeToast = useCallback((id: string) => {
    dismissedToastIdsRef.current.add(id);
    saveSessionDismissedToastIds(dismissedToastIdsRef.current);
    setActiveToasts(current => current.filter(t => t.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // ── Close dropdown when clicking outside ─────────────────────────────────
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

  const getNotificationIcon = (notification: Notification) => {
    const type = notification.type || '';
    const entityType = notification.entity_type || '';

    if (type.includes('event') || entityType === 'event') {
      return <Calendar size={16} className="text-orange-500" />;
    }
    if (type.includes('task') || entityType === 'task') {
      return <ClipboardList size={16} className="text-amber-500" />;
    }
    if (type.includes('leave') || entityType === 'leave') {
      return <FileText size={16} className="text-blue-500" />;
    }
    if (type.includes('eval') || entityType === 'evaluation') {
      return <MessageSquareHeart size={16} className="text-indigo-500" />;
    }
    if (type.includes('revert') || entityType === 'revert') {
      return <Users size={16} className="text-emerald-500" />;
    }
    if (type.includes('notice') || entityType === 'notice') {
      return <Megaphone size={16} className="text-amber-600" />;
    }
    if (type.includes('post') || entityType === 'post') {
      return <Pin size={16} className="text-blue-600" />;
    }
    return <Bell size={16} className="text-gray-500" />;
  };

  return (
    <>
      <div className="relative print:hidden" ref={dropdownRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors focus:outline-none cursor-pointer"
          aria-label="Notifications"
          type="button"
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
              className="absolute right-0 mt-2 w-84 sm:w-96 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-50 flex flex-col max-h-[460px]"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="text-[11px] font-semibold bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    type="button"
                    className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors cursor-pointer"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              
              <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                {notifications.length === 0 ? (
                  <div className="px-4 py-10 text-center flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                      <BellRing size={20} className="text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">You're all caught up!</p>
                    <p className="text-xs text-gray-400 mt-1">No notifications right now.</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      onClick={() => handleNotificationAction(notification)}
                      className={`px-4 py-3.5 flex gap-3 transition-colors duration-150 ease-in-out cursor-pointer group ${
                        notification.isRead ? 'bg-white hover:bg-gray-50' : 'bg-orange-50/40 hover:bg-orange-50/70'
                      }`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleNotificationAction(notification);
                        }
                      }}
                    >
                      <div className="shrink-0 mt-0.5">
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                          {getNotificationIcon(notification)}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <p className={`text-[12px] font-semibold ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                            {notification.title || (notification.type === 'event_today' ? 'Event Today' : 'Notification')}
                          </p>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {formatDisplayDate(notification.timestamp)}
                          </span>
                        </div>
                        <p className={`text-[12px] leading-snug line-clamp-2 ${notification.isRead ? 'text-gray-500' : 'text-gray-800'}`}>
                          {notification.message}
                        </p>
                        
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-orange-600 group-hover:underline flex items-center gap-0.5">
                            {notification.action_label || 'View'} &rarr;
                          </span>
                          {!notification.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <ToastContainer 
        toasts={activeToasts} 
        removeToast={removeToast} 
        onAction={handleNotificationAction}
      />
    </>
  );
}
