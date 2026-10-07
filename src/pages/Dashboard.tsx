import React, { useMemo, useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserMinus, 
  BookOpen, 
  Calendar as CalendarIcon, 
  Clock, 
  MoreVertical,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  ClipboardList,
  CheckCircle2,
  PlusCircle,
  DollarSign,
  CalendarPlus,
  Pin,
  Send,
  CheckSquare,
  Megaphone,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  User,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { 
  canManageOperations, 
  canAccessReverts, 
  canAccessTaskBoard,
  canAccessNoticeboard,
  canCreateOfficialNotice,
  canCreateStaffPost,
  canCreateStaffNote,
  canModerateNotices,
  canManageNotice
} from '../lib/permissions';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays, parseISO, subMonths, isSameMonth, addMonths, isSameDay, addDays, isToday } from 'date-fns';
import { generateInstances } from '../utils/recurrence';
import { calculateTrend } from '../utils/trends';
import { isEndOfMonth, isLastWeekOfMonth } from '../utils/evaluations';
import DateRangePicker, { DateRange } from '../components/DateRangePicker';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { formatDisplayDate } from '../utils/dateUtils';
import { api } from '../services/api';

function formatNoticeTime(createdAt?: string | Date): string {
  if (!createdAt) return 'Recently';
  try {
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return String(createdAt);
    if (isToday(d)) {
      return `Today at ${format(d, 'h:mm a')}`;
    }
    return formatDisplayDate(d);
  } catch {
    return 'Recently';
  }
}

interface DashboardProps {
  reverts?: any[];
  events?: any[];
  tasks?: any[];
  notices?: any[];
  setNotices?: React.Dispatch<React.SetStateAction<any[]>>;
  selectedNoticeId?: string | number | null;
  onClearSelectedNotice?: () => void;
  onNavigate: (tab: string, entityId?: string | number) => void;
  dateRange: DateRange;
}

export default function Dashboard({ 
  reverts = [], 
  events = [], 
  tasks = [], 
  notices = [],
  setNotices,
  selectedNoticeId = null,
  onClearSelectedNotice,
  onNavigate, 
  dateRange 
}: DashboardProps) {
  const { currentUser } = useAuth();

  // Noticeboard states
  const [viewingNotice, setViewingNotice] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<any | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingNotice, setIsDeletingNotice] = useState(false);
  const [isSubmittingNotice, setIsSubmittingNotice] = useState(false);

  // Quick note input
  const [quickNote, setQuickNote] = useState('');
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);

  // Notice creation form data (for + Post Notice modal)
  const [noticeFormData, setNoticeFormData] = useState<{
    title: string;
    content: string;
  }>({
    title: '',
    content: ''
  });

  // Notice edit form data
  const [editFormData, setEditFormData] = useState<{
    title: string;
    content: string;
    type: 'post' | 'notice';
  }>({
    title: '',
    content: '',
    type: 'post'
  });

  // Watch for selectedNoticeId to automatically open View Notice / View Post modal
  useEffect(() => {
    if (!selectedNoticeId) return;

    const found = notices.find(n => String(n.id) === String(selectedNoticeId));
    if (found) {
      setViewingNotice(found);
      setIsViewModalOpen(true);
    } else {
      api.notices.get(selectedNoticeId)
        .then(data => {
          if (data) {
            setViewingNotice(data);
            setIsViewModalOpen(true);
          }
        })
        .catch(() => {
          toast.error('Notice not found or no longer available.');
        });
    }
  }, [selectedNoticeId, notices]);

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingNotice(null);
    onClearSelectedNotice?.();
  };

  const handleOpenEditModal = (notice: any) => {
    const isNotice = notice.type === 'notice' || notice.type === 'official_notice';
    setEditingNotice(notice);
    setEditFormData({
      title: notice.title || '',
      content: notice.content || notice.text || '',
      type: isNotice ? 'notice' : 'post'
    });
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeFormData.content.trim()) {
      toast.error('Notice content is required.');
      return;
    }
    setIsSubmittingNotice(true);
    try {
      const payload = {
        title: noticeFormData.title.trim() || undefined,
        content: noticeFormData.content.trim(),
        type: 'notice',
        audience: 'all_staff',
        department: currentUser?.department || undefined
      };
      const created = await api.notices.create(payload);
      if (setNotices) {
        setNotices(prev => [created, ...prev]);
      }
      toast.success('Official notice published.');
      setIsCreateModalOpen(false);
      setNoticeFormData({
        title: '',
        content: ''
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to post notice.');
    } finally {
      setIsSubmittingNotice(false);
    }
  };

  const handleQuickPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;
    if (!canCreateStaffPost(currentUser)) {
      toast.error('Unauthorized to post staff updates.');
      return;
    }
    setIsQuickSubmitting(true);
    try {
      const created = await api.notices.create({
        content: quickNote.trim(),
        type: 'post',
        audience: 'all_staff',
        department: currentUser?.department || undefined
      });
      if (setNotices) {
        setNotices(prev => [created, ...prev]);
      }
      setQuickNote('');
      toast.success('Staff post published.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to post staff update.');
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  const handleUpdateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotice) return;
    if (!editFormData.content.trim()) {
      toast.error('Content is required.');
      return;
    }
    setIsSubmittingNotice(true);
    try {
      const payload = {
        title: editFormData.title.trim() || undefined,
        content: editFormData.content.trim(),
        type: editFormData.type
      };
      const updated = await api.notices.update(editingNotice.id, payload);
      if (setNotices) {
        setNotices(prev => prev.map(n => n.id === editingNotice.id ? updated : n));
      }
      toast.success(editFormData.type === 'notice' ? 'Notice updated successfully.' : 'Post updated successfully.');
      setIsEditModalOpen(false);
      setViewingNotice(updated);
      setIsViewModalOpen(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update item.');
    } finally {
      setIsSubmittingNotice(false);
    }
  };

  const handleDeleteNotice = async () => {
    if (!viewingNotice) return;
    const isNotice = viewingNotice.type === 'notice' || viewingNotice.type === 'official_notice';
    setIsDeletingNotice(true);
    try {
      await api.notices.delete(viewingNotice.id);
      if (setNotices) {
        setNotices(prev => prev.filter(n => n.id !== viewingNotice.id));
      }
      toast.success(isNotice ? 'Notice deleted successfully.' : 'Post deleted successfully.');
      setIsDeleteConfirmOpen(false);
      setIsViewModalOpen(false);
      setViewingNotice(null);
      onClearSelectedNotice?.();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete item.');
    } finally {
      setIsDeletingNotice(false);
    }
  };

  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    setIsLoadingStats(true);

    const params: Record<string, string> = {
      preset: dateRange?.preset || 'all_time',
    };
    if (dateRange?.startDate) {
      params.startDate = format(dateRange.startDate, 'yyyy-MM-dd');
    }
    if (dateRange?.endDate) {
      params.endDate = format(dateRange.endDate, 'yyyy-MM-dd');
    }

    api.reverts.getStats(params, { signal: controller.signal })
      .then(res => {
        if (isMounted && res) {
          setDashboardStats(res);
        }
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          console.error('Failed to load dashboard stats:', err);
        }
      })
      .finally(() => {
        if (isMounted && !controller.signal.aborted) {
          setIsLoadingStats(false);
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [
    dateRange?.preset,
    dateRange?.startDate ? dateRange.startDate.getTime() : null,
    dateRange?.endDate ? dateRange.endDate.getTime() : null,
  ]);

  const summaryData = useMemo(() => {
    const isAllTime = dateRange?.preset === 'all_time' || (!dateRange?.startDate && !dateRange?.endDate);

    // 1. Total Reverts / Reverts in Period
    const totalRevertsCount = isAllTime 
      ? (dashboardStats?.totalReverts ?? reverts.length)
      : (dashboardStats?.periodReverts ?? 0);

    let revertsSubtitle = '— All time';
    if (!isAllTime) {
      if (dateRange?.preset === 'ytd') revertsSubtitle = '— Year to Date';
      else if (dateRange?.preset === 'mtd') revertsSubtitle = '— Month to Date';
      else if (dateRange?.preset === 'last_30_days') revertsSubtitle = '— Last 30 Days';
      else if (dateRange?.preset === 'last_7_days') revertsSubtitle = '— Last 7 Days';
      else if (dateRange?.preset === 'today') revertsSubtitle = '— Today';
      else revertsSubtitle = '— Selected period';
    }

    // 2. New This Month / Period
    const shahadahsThisMonth = dashboardStats?.shahadahsThisMonth ?? 0;
    const periodReverts = dashboardStats?.periodReverts ?? 0;

    let newCount = shahadahsThisMonth;
    let newSubtitle = '— Current month';
    let newTitle = 'New This Month';

    if (dateRange?.preset === 'mtd') {
      newTitle = 'New This Month';
      newCount = periodReverts;
      newSubtitle = '— Month to Date';
    } else if (
      dateRange?.preset === 'last_30_days' || 
      dateRange?.preset === 'last_7_days' || 
      dateRange?.preset === 'today' || 
      dateRange?.preset === 'custom'
    ) {
      newTitle = 'Recent Reverts';
      newCount = periodReverts;
      newSubtitle = revertsSubtitle;
    }

    // 3. Pending Mentorship (Unfiltered current operational backlog)
    const pendingMentorship = dashboardStats?.pendingMentorship ?? reverts.filter(r => r.mentorshipStatus === 'Pending Assignment').length;

    // 4. Open Tasks (Unfiltered current operational backlog)
    const openTasks = dashboardStats?.openTasks ?? tasks.filter(t => t.status === 'todo' || t.status === 'in-progress').length;

    return [
      { 
        title: isAllTime ? 'Total Reverts' : 'Reverts in Period', 
        value: totalRevertsCount.toString(), 
        subtitle: revertsSubtitle, 
        icon: Users, 
        color: 'text-gray-600', 
        bgColor: 'bg-gray-100' 
      },
      { 
        title: newTitle, 
        value: newCount.toString(), 
        subtitle: newSubtitle, 
        icon: TrendingUp, 
        color: 'text-emerald-600', 
        bgColor: 'bg-emerald-50' 
      },
      { 
        title: 'Needs Mentor', 
        value: pendingMentorship.toString(), 
        subtitle: '— Action required', 
        icon: AlertCircle, 
        color: 'text-red-500', 
        bgColor: 'bg-red-50' 
      },
      { 
        title: 'Active Tasks', 
        value: openTasks.toString(), 
        subtitle: '— Across all depts', 
        icon: ClipboardList, 
        color: 'text-slate-600', 
        bgColor: 'bg-slate-100' 
      },
    ];
  }, [reverts, tasks, dashboardStats, dateRange]);

  const chartSubtitle = useMemo(() => {
    if (dateRange?.preset === 'all_time' || (!dateRange?.startDate && !dateRange?.endDate)) {
      return 'Showing activity from 2016 to present';
    }
    if (dateRange?.preset === 'ytd') {
      return 'Showing monthly activity for the current year (Jan – Present)';
    }
    if (dateRange?.preset === 'mtd') {
      return 'Showing daily activity for the current month';
    }
    if (dateRange?.preset === 'last_30_days') {
      return 'Showing daily activity for the last 30 days';
    }
    if (dateRange?.preset === 'last_7_days') {
      return 'Showing daily activity for the last 7 days';
    }
    if (dateRange?.preset === 'today') {
      return 'Showing activity for today';
    }
    if (dateRange?.startDate && dateRange?.endDate) {
      return `Showing activity from ${formatDisplayDate(dateRange.startDate)} to ${formatDisplayDate(dateRange.endDate)}`;
    }
    return 'Showing activity for selected period';
  }, [dateRange]);

  const chartData = useMemo(() => {
    return dashboardStats?.chartData || [];
  }, [dashboardStats]);

  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());
    const windowEnd = addMonths(today, 6);
    const instances = generateInstances(events, today, windowEnd);
    return instances
      .filter(e => isAfter(new Date(e.start), today) || new Date(e.start).getTime() === today.getTime())
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 4);
  }, [events]);

  return (
    <div className="space-y-6">
      {(isLastWeekOfMonth() || isEndOfMonth()) && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-blue-800 font-medium">Monthly Peer Evaluations are Due</h3>
            <p className="text-blue-600 text-sm">The feedback portal is open during the final week of the month. Please take a moment to submit anonymous feedback for your team.</p>
          </div>
          <button 
            onClick={() => {
              onNavigate('evaluations');
              window.history.pushState(null, '', '/evaluations');
            }} 
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition shrink-0"
          >
            Start Evaluations
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 shrink-0">Dashboard Overview</h1>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full lg:w-auto">
          {canAccessReverts(currentUser) && (
            <button 
              onClick={() => onNavigate('reverts')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer active:scale-[0.98]"
            >
              <PlusCircle size={16} className="text-white" />
              Add Revert
            </button>
          )}
          <button 
            onClick={() => onNavigate('campaigns')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer active:scale-[0.98]"
          >
            <DollarSign size={16} className="text-emerald-500" />
            Log Donation
          </button>
          <button 
            onClick={() => onNavigate('calendar')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer active:scale-[0.98]"
          >
            <CalendarPlus size={16} className="text-blue-500" />
            Schedule Event
          </button>
          <button 
            onClick={() => onNavigate('task-board')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer active:scale-[0.98]"
          >
            <CheckSquare size={16} className="text-slate-500" />
            Add Task
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {summaryData.map((stat, idx) => {
          const isRevertsCard = stat.title === 'Total Reverts' || stat.title === 'New This Month' || stat.title === 'Needs Mentor';
          const isTasksCard = stat.title === 'Active Tasks';
          const canClick = (isRevertsCard && canAccessReverts(currentUser)) || (isTasksCard && canAccessTaskBoard(currentUser));
          const targetTab = isRevertsCard ? 'reverts' : isTasksCard ? 'task-board' : null;

          return (
            <div 
              key={idx} 
              onClick={() => {
                if (canClick && targetTab) {
                  onNavigate(targetTab);
                }
              }}
              className={`bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-custom flex flex-col transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-gray-300 ${
                canClick ? 'cursor-pointer hover:border-orange-300' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${stat.bgColor} ${stat.color}`}>
                  <stat.icon size={20} strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <h3 className="text-gray-500 text-[13px] font-semibold tracking-wide uppercase">{stat.title}</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{stat.value}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[12px] font-medium text-gray-500">{stat.subtitle}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-custom p-6 min-h-[300px] flex flex-col transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-gray-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[16px] font-semibold text-gray-900">Reversions Over Time</h2>
              <p className="text-xs text-gray-500 mt-0.5">{chartSubtitle}</p>
            </div>
            {isLoadingStats && (
              <div className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md font-medium">
                <Loader2 size={13} className="animate-spin" />
                <span>Updating...</span>
              </div>
            )}
          </div>
          <div className="w-full h-[300px]" style={{ minHeight: 300, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#6B7280' }} 
                  tickLine={false} 
                  axisLine={false} 
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#6B7280' }} 
                  tickLine={false} 
                  axisLine={false} 
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                  itemStyle={{ color: '#FF6B00' }}
                  formatter={(value: any) => [`${value} reverts`, 'Count']}
                  labelFormatter={(label: any, payload: any) => {
                    const item = payload?.[0]?.payload;
                    return item?.fullName || label;
                  }}
                />
                <Area type="monotone" dataKey="reverts" stroke="#FF6B00" strokeWidth={3} fill="#FFF0E6" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Schedule/Calendar Widget Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-custom p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-gray-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-semibold text-gray-900">Upcoming Events</h2>
            <button onClick={() => onNavigate('calendar')} className="text-[12px] font-semibold text-orange-500 hover:text-orange-600 transition-all duration-200 ease-in-out hover:opacity-90 active:scale-[0.97] cursor-pointer">
              View All
            </button>
          </div>
          
          <div className="space-y-1">
            {upcomingEvents.length === 0 ? (
              <div className="py-6 text-center text-[13px] text-gray-500">
                No upcoming events scheduled.
              </div>
            ) : upcomingEvents.map((item, idx) => {
              const eventDate = new Date(item.start);
              const day = format(eventDate, 'dd');
              const month = format(eventDate, 'MMM').toUpperCase();
              
              return (
                <div 
                  key={idx} 
                  onClick={() => onNavigate('calendar', item.id)}
                  className="flex gap-3 py-2.5 px-2 hover:bg-orange-50/60 rounded-lg transition-colors cursor-pointer group border-b border-gray-50 last:border-0"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNavigate('calendar', item.id);
                    }
                  }}
                >
                  <div className="bg-orange-50 group-hover:bg-orange-100 text-orange-500 rounded-md w-10 h-10 flex flex-col items-center justify-center shrink-0 transition-colors">
                    <span className="text-[10px] font-bold leading-none">{day}</span>
                    <span className="text-[10px] font-bold leading-none mt-0.5">{month}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">{item.title}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5 capitalize">{item.type} • {item.allDay ? 'All Day' : format(eventDate, 'h:mm a')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Noticeboard Widget */}
        {canAccessNoticeboard(currentUser) && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-custom p-5 flex flex-col h-[400px] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-gray-300">
            <div className="flex items-center justify-between gap-2 mb-4 shrink-0 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Pin size={18} className="text-orange-500" />
                <h2 className="text-[16px] font-semibold text-gray-900">Staff Noticeboard</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {notices.length}
                </span>
              </div>
              {canCreateOfficialNotice(currentUser) && (
                <button
                  type="button"
                  onClick={() => {
                    setNoticeFormData({ title: '', content: '' });
                    setIsCreateModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Post Official Notice</span>
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
              {notices.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-400">
                  <Megaphone size={28} className="stroke-1 mb-2 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">No notices posted yet</p>
                  <p className="text-xs text-gray-400 mt-0.5">Notices and announcements will appear here.</p>
                </div>
              ) : (
                notices.map((notice) => {
                  const isOfficial = notice.type === 'official_notice' || notice.type === 'notice';
                  return (
                    <div 
                      key={notice.id} 
                      onClick={() => {
                        setViewingNotice(notice);
                        setIsViewModalOpen(true);
                      }}
                      className={`group flex flex-col p-3 rounded-lg border transition-all cursor-pointer shadow-2xs hover:shadow-xs ${
                        isOfficial
                          ? 'bg-amber-50/40 hover:bg-amber-50/70 border-amber-200/80 border-l-4 border-l-amber-500'
                          : 'bg-white hover:bg-slate-50 border-gray-100 hover:border-gray-200 border-l-4 border-l-blue-400'
                      }`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setViewingNotice(notice);
                          setIsViewModalOpen(true);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isOfficial ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                              <Megaphone size={10} /> Notice
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200">
                              <MessageSquare size={10} /> Post
                            </span>
                          )}
                          {notice.department && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-200/70 text-gray-700">
                              {notice.department}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium shrink-0">
                          {formatNoticeTime(notice.created_at)}
                        </span>
                      </div>

                      {notice.title && (
                        <div className="text-[13px] font-semibold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                          {notice.title}
                        </div>
                      )}
                      
                      <div className="text-[12px] text-gray-600 leading-snug line-clamp-2 mt-0.5">
                        {notice.content || notice.text}
                      </div>

                      <div className="mt-2 text-[11px] text-gray-500 flex items-center gap-1.5">
                        <span className="font-medium text-gray-700">
                          {notice.author_name || notice.author || 'Staff Member'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Post Composer at bottom */}
            {canCreateStaffPost(currentUser) && (
              <form onSubmit={handleQuickPost} className="flex gap-2 mt-3 pt-3 border-t border-gray-100 shrink-0 w-full">
                <input 
                  type="text" 
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  placeholder="Share a quick update with staff..."
                  disabled={isQuickSubmitting}
                  className="w-full text-xs sm:text-sm pl-3 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-orange-500 focus:bg-white transition-colors"
                />
                <button 
                  type="submit"
                  disabled={!quickNote.trim() || isQuickSubmitting}
                  className="px-3 sm:px-4 py-2 bg-gray-900 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  {isQuickSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span className="hidden sm:inline">Post</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Dedicated View Notice Modal (Read-Only first) */}
      <AnimatePresence>
        {isViewModalOpen && viewingNotice && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={handleCloseViewModal}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white shadow-xl w-[95%] sm:w-[500px] md:max-w-xl max-h-[90vh] overflow-y-auto mx-auto rounded-xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#F9FAFB]">
                <div className="flex items-center gap-2 flex-wrap">
                  {viewingNotice.type === 'official_notice' || viewingNotice.type === 'notice' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                      <Megaphone size={12} /> Official Notice
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200">
                      <MessageSquare size={12} /> Staff Post
                    </span>
                  )}
                  {viewingNotice.department && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                      {viewingNotice.department}
                    </span>
                  )}
                </div>
                <button 
                  onClick={handleCloseViewModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 overflow-y-auto space-y-4">
                {viewingNotice.title && (
                  <h3 className="text-lg font-bold text-gray-900 leading-snug">
                    {viewingNotice.title}
                  </h3>
                )}

                <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-100 font-normal">
                  {viewingNotice.content || viewingNotice.text}
                </div>

                <div className="pt-2 border-t border-gray-100 flex flex-col gap-1.5 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-400" />
                    <span>
                      Posted by <strong className="text-gray-700 font-semibold">{viewingNotice.author_name || viewingNotice.author || 'Staff Member'}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gray-400" />
                    <span>
                      {formatDisplayDate(viewingNotice.created_at)}
                      {viewingNotice.created_at && !isNaN(new Date(viewingNotice.created_at).getTime()) && ` at ${format(new Date(viewingNotice.created_at), 'h:mm a')}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-[#F9FAFB] flex justify-between items-center gap-3">
                <div>
                  {canManageNotice(viewingNotice, currentUser) && (
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => setIsDeleteConfirmOpen(true)}
                        className="px-3 py-2 text-[13px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleOpenEditModal(viewingNotice)}
                        className="px-3 py-2 text-[13px] font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit size={15} />
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  type="button" 
                  onClick={handleCloseViewModal}
                  className="px-4 py-2 text-[13px] font-semibold text-gray-700 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Notice Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsCreateModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white shadow-xl w-[95%] sm:w-[500px] md:max-w-xl max-h-[90vh] overflow-y-auto mx-auto rounded-xl flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#F9FAFB]">
                <div className="flex items-center gap-2">
                  <Megaphone size={18} className="text-amber-600" />
                  <h3 className="text-[16px] font-semibold text-gray-900">Post Official Notice</h3>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateNotice} className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Title (Optional)</label>
                  <input 
                    type="text" 
                    value={noticeFormData.title} 
                    onChange={e => setNoticeFormData({ ...noticeFormData, title: e.target.value })} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white outline-hidden transition-all text-gray-900" 
                    placeholder="e.g. Office Closure, Policy Update, or All-Staff Meeting" 
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Notice Content <span className="text-red-500">*</span></label>
                  <textarea 
                    rows={4} 
                    required
                    value={noticeFormData.content} 
                    onChange={e => setNoticeFormData({ ...noticeFormData, content: e.target.value })} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white outline-hidden transition-all text-gray-900 resize-none" 
                    placeholder="Write your official announcement details here..." 
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setIsCreateModalOpen(false)} 
                    disabled={isSubmittingNotice}
                    className="px-4 py-2 text-[13px] font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmittingNotice || !noticeFormData.content.trim()}
                    className="px-4 py-2 text-[13px] font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingNotice && <Loader2 size={14} className="animate-spin" />}
                    <span>+ Post Notice</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Notice Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingNotice && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setIsEditModalOpen(false);
                setIsViewModalOpen(true);
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white shadow-xl w-[95%] sm:w-[500px] md:max-w-xl max-h-[90vh] overflow-y-auto mx-auto rounded-xl flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#F9FAFB]">
                <h3 className="text-[16px] font-semibold text-gray-900">
                  {editFormData.type === 'notice' ? 'Edit Official Notice' : 'Edit Staff Post'}
                </h3>
                <button 
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setIsViewModalOpen(true);
                  }} 
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateNotice} className="px-6 py-4 space-y-4">
                {canCreateOfficialNotice(currentUser) && (
                  <div>
                    <label className="block text-[13px] font-medium text-gray-700 mb-1.5">Classification</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, type: 'post' })}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          editFormData.type === 'post'
                            ? 'bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-100'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <MessageSquare size={14} />
                        Staff Post
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, type: 'notice' })}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          editFormData.type === 'notice'
                            ? 'bg-amber-50 border-amber-400 text-amber-800 ring-2 ring-amber-100'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Megaphone size={14} />
                        Official Notice
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Title (Optional)</label>
                  <input 
                    type="text" 
                    value={editFormData.title} 
                    onChange={e => setEditFormData({ ...editFormData, title: e.target.value })} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white outline-hidden transition-all text-gray-900" 
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Notice Content <span className="text-red-500">*</span></label>
                  <textarea 
                    rows={4} 
                    required
                    value={editFormData.content} 
                    onChange={e => setEditFormData({ ...editFormData, content: e.target.value })} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white outline-hidden transition-all text-gray-900 resize-none" 
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setIsViewModalOpen(true);
                    }} 
                    disabled={isSubmittingNotice}
                    className="px-4 py-2 text-[13px] font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmittingNotice || !editFormData.content.trim()}
                    className="px-4 py-2 text-[13px] font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingNotice && <Loader2 size={14} className="animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DeleteConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteNotice}
        title="Delete Notice?"
        message="Are you sure you want to delete this notice? This action cannot be undone."
        isDeleting={isDeletingNotice}
      />
    </div>
  );
}
