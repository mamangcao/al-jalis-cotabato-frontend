import React, { useMemo, useState, useEffect } from 'react';
import { 
  Users, 
  Calendar as CalendarIcon, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  ClipboardList, 
  CheckSquare, 
  PlusCircle, 
  DollarSign, 
  CalendarPlus, 
  Pin, 
  Send, 
  Megaphone, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Loader2, 
  User, 
  MessageSquare,
  ArrowRight,
  Search,
  FileText,
  MapPin,
  Sparkles,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { 
  canManageOperations, 
  canAccessReverts, 
  canAccessTaskBoard,
  canAccessNoticeboard,
  canAccessLeaves,
  canAccessCalendar,
  canAccessDonations,
  canCreateOfficialNotice,
  canCreateStaffPost,
  canModerateNotices,
  canManageNotice
} from '../lib/permissions';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { format, isAfter, startOfDay, addMonths, isToday } from 'date-fns';
import { generateInstances } from '../utils/recurrence';
import { isEndOfMonth, isLastWeekOfMonth } from '../utils/evaluations';
import { DateRange } from '../components/DateRangePicker';
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
  leaves?: any[];
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
  leaves = [],
  notices = [],
  setNotices,
  selectedNoticeId = null,
  onClearSelectedNotice,
  onNavigate, 
  dateRange 
}: DashboardProps) {
  const { currentUser } = useAuth();

  // Notice and Announcement Modal States
  const [viewingNotice, setViewingNotice] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isCreateAnnouncementOpen, setIsCreateAnnouncementOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<any | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingNotice, setIsDeletingNotice] = useState(false);
  const [isSubmittingNotice, setIsSubmittingNotice] = useState(false);

  // "View All" Modal States
  const [isViewAllAnnouncementsOpen, setIsViewAllAnnouncementsOpen] = useState(false);
  const [isViewAllNotesOpen, setIsViewAllNotesOpen] = useState(false);
  const [announcementsSearch, setAnnouncementsSearch] = useState('');
  const [notesSearch, setNotesSearch] = useState('');

  // Quick note input (Staff Noticeboard)
  const [quickNote, setQuickNote] = useState('');
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);

  // Announcement creation form data
  const [announcementFormData, setAnnouncementFormData] = useState<{
    title: string;
    content: string;
    department: string;
    is_pinned: boolean;
  }>({
    title: '',
    content: '',
    department: '',
    is_pinned: false
  });

  // Notice edit form data
  const [editFormData, setEditFormData] = useState<{
    title: string;
    content: string;
    type: 'post' | 'notice';
    department: string;
    is_pinned: boolean;
  }>({
    title: '',
    content: '',
    type: 'post',
    department: '',
    is_pinned: false
  });

  // ── Watch for selectedNoticeId to automatically open View Modal ───────────
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
          toast.error('Item not found or no longer available.');
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
      type: isNotice ? 'notice' : 'post',
      department: notice.department || '',
      is_pinned: Boolean(notice.is_pinned)
    });
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  // ── Create Official Announcement ──────────────────────────────────────────
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementFormData.content.trim()) {
      toast.error('Announcement content is required.');
      return;
    }
    if (!canCreateOfficialNotice(currentUser)) {
      toast.error('Unauthorized: Only designated leaders can publish official announcements.');
      return;
    }

    setIsSubmittingNotice(true);
    try {
      const payload = {
        title: announcementFormData.title.trim() || undefined,
        content: announcementFormData.content.trim(),
        type: 'notice',
        audience: 'all_staff',
        department: announcementFormData.department.trim() || currentUser?.department || undefined,
        is_pinned: announcementFormData.is_pinned
      };
      const created = await api.notices.create(payload);
      if (setNotices) {
        setNotices(prev => [created, ...prev]);
      }
      toast.success('Official announcement published successfully.');
      setIsCreateAnnouncementOpen(false);
      setAnnouncementFormData({
        title: '',
        content: '',
        department: '',
        is_pinned: false
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to publish announcement.');
    } finally {
      setIsSubmittingNotice(false);
    }
  };

  // ── Post a Quick Note (Staff Noticeboard) ─────────────────────────────────
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
        department: currentUser?.department || undefined,
        is_pinned: false
      });
      if (setNotices) {
        setNotices(prev => [created, ...prev]);
      }
      setQuickNote('');
      toast.success('Staff note published.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to post note.');
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  // ── Update Existing Notice / Post ─────────────────────────────────────────
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
        type: editFormData.type,
        department: editFormData.department.trim() || undefined,
        is_pinned: editFormData.is_pinned
      };
      const updated = await api.notices.update(editingNotice.id, payload);
      if (setNotices) {
        setNotices(prev => prev.map(n => n.id === editingNotice.id ? updated : n));
      }
      toast.success(editFormData.type === 'notice' ? 'Announcement updated successfully.' : 'Staff post updated successfully.');
      setIsEditModalOpen(false);
      setViewingNotice(updated);
      setIsViewModalOpen(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update item.');
    } finally {
      setIsSubmittingNotice(false);
    }
  };

  // ── Delete Notice / Post ──────────────────────────────────────────────────
  const handleDeleteNotice = async () => {
    if (!viewingNotice) return;
    const isNotice = viewingNotice.type === 'notice' || viewingNotice.type === 'official_notice';
    setIsDeletingNotice(true);
    try {
      await api.notices.delete(viewingNotice.id);
      if (setNotices) {
        setNotices(prev => prev.filter(n => n.id !== viewingNotice.id));
      }
      toast.success(isNotice ? 'Announcement deleted.' : 'Staff post deleted.');
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

  // ── Dashboard Analytics & KPIs Fetching ───────────────────────────────────
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

    // If user has reverts access, fetch comprehensive stats endpoint; otherwise fetch general KPIs
    const fetchPromise = canAccessReverts(currentUser)
      ? api.reverts.getStats(params, { signal: controller.signal })
      : api.dashboard.getKpis(params, { signal: controller.signal });

    fetchPromise
      .then(res => {
        if (isMounted && res) {
          setDashboardStats(res);
        }
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          console.error('Failed to load dashboard metrics:', err);
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
    currentUser,
    dateRange?.preset,
    dateRange?.startDate ? dateRange.startDate.getTime() : null,
    dateRange?.endDate ? dateRange.endDate.getTime() : null,
  ]);

  // ── KPI Summary Cards ─────────────────────────────────────────────────────
  const summaryData = useMemo(() => {
    const isAllTime = dateRange?.preset === 'all_time' || (!dateRange?.startDate && !dateRange?.endDate);

    // 1. Total Reverts / Period Reverts (Date-Dependent Analytics)
    const hasRevertsAccess = canAccessReverts(currentUser);
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

    // 2. Pending Leaves (Current State Backlog)
    const pendingLeavesCount = dashboardStats?.pendingLeaves ?? 
      leaves.filter((l: any) => l.approval?.finance === 'Pending' || l.approval?.director === 'Pending' || l.status === 'Pending' || l.status === 'pending').length;

    // 3. Open Tasks (Current State Backlog)
    const openTasksCount = dashboardStats?.openTasks ?? 
      tasks.filter((t: any) => t.status === 'todo' || t.status === 'in-progress').length;

    // 4. Upcoming Events (Upcoming / Current Data)
    const today = startOfDay(new Date());
    const windowEnd = addMonths(today, 6);
    const instances = generateInstances(events, today, windowEnd);
    const calculatedUpcomingCount = instances.filter(e => isAfter(new Date(e.start), today) || new Date(e.start).getTime() === today.getTime()).length;
    const upcomingEventsCount = dashboardStats?.upcomingEvents ?? calculatedUpcomingCount;

    return [
      { 
        id: 'reverts',
        title: isAllTime ? 'Total Reverts' : 'Reverts in Period', 
        value: hasRevertsAccess ? totalRevertsCount.toString() : '—', 
        subtitle: hasRevertsAccess ? revertsSubtitle : '— Restricted', 
        scope: 'Reporting Period',
        scopeBg: 'bg-orange-50 text-orange-700 border-orange-200',
        icon: Users, 
        color: 'text-orange-600', 
        bgColor: 'bg-orange-50',
        canClick: hasRevertsAccess,
        targetTab: 'reverts'
      },
      { 
        id: 'leaves',
        title: 'Pending Leaves', 
        value: pendingLeavesCount.toString(), 
        subtitle: '— Awaiting HR approval', 
        scope: 'Current State',
        scopeBg: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: FileText, 
        color: 'text-amber-600', 
        bgColor: 'bg-amber-50',
        canClick: canAccessLeaves(currentUser),
        targetTab: 'leaves'
      },
      { 
        id: 'tasks',
        title: 'Open Tasks', 
        value: openTasksCount.toString(), 
        subtitle: '— Active backlog', 
        scope: 'Current State',
        scopeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: ClipboardList, 
        color: 'text-indigo-600', 
        bgColor: 'bg-indigo-50',
        canClick: canAccessTaskBoard(currentUser),
        targetTab: 'task-board'
      },
      { 
        id: 'events',
        title: 'Upcoming Events', 
        value: upcomingEventsCount.toString(), 
        subtitle: '— Scheduled center calendar', 
        scope: 'Upcoming',
        scopeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CalendarIcon, 
        color: 'text-emerald-600', 
        bgColor: 'bg-emerald-50',
        canClick: canAccessCalendar(currentUser),
        targetTab: 'calendar'
      },
    ];
  }, [reverts, tasks, leaves, events, dashboardStats, dateRange, currentUser]);

  // ── Chart Subtitle ────────────────────────────────────────────────────────
  const chartSubtitle = useMemo(() => {
    if (dateRange?.preset === 'all_time' || (!dateRange?.startDate && !dateRange?.endDate)) {
      return 'Showing monthly activity from January 2016 to present (historical total includes all records)';
    }
    if (dateRange?.preset === 'ytd') {
      return 'Showing monthly activity for the current year (Jan 1 – Present)';
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

  // ── Separation: Official Announcements vs. Staff Noticeboard ───────────────
  const officialAnnouncements = useMemo(() => {
    return notices
      .filter(n => n.type === 'notice' || n.type === 'official_notice')
      .sort((a, b) => {
        // Pinned announcements float to the top
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }, [notices]);

  const staffNotes = useMemo(() => {
    return notices
      .filter(n => n.type === 'post' || n.type === 'staff_note')
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [notices]);

  // ── Upcoming Events List ──────────────────────────────────────────────────
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
      {/* Monthly Peer Evaluations Due Banner */}
      {(isLastWeekOfMonth() || isEndOfMonth()) && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-blue-800 font-medium">Monthly Peer Evaluations are Due</h3>
            <p className="text-blue-600 text-sm">The feedback portal is open during the final week of the month. Please submit your anonymous feedback for the center.</p>
          </div>
          <button 
            onClick={() => {
              onNavigate('evaluations');
              window.history.pushState(null, '', '/evaluations');
            }} 
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition shrink-0 cursor-pointer"
          >
            Start Evaluations
          </button>
        </div>
      )}

      {/* Header & Quick Operations */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Operations Command Center</h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live • Cotabato Chapter
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Centralized monitoring of active programs, operational workflows, and official organizational updates.
          </p>
        </div>

        {/* Quick Operations Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {canAccessReverts(currentUser) && (
            <button 
              onClick={() => onNavigate('reverts')}
              className="flex items-center justify-center gap-2 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer active:scale-[0.98]"
            >
              <PlusCircle size={15} />
              Add Revert
            </button>
          )}
          {canAccessDonations(currentUser) && (
            <button 
              onClick={() => onNavigate('campaigns')}
              className="flex items-center justify-center gap-2 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-medium rounded-lg shadow-xs transition-colors cursor-pointer active:scale-[0.98]"
            >
              <DollarSign size={15} className="text-emerald-500" />
              Log Donation
            </button>
          )}
          <button 
            onClick={() => onNavigate('calendar')}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-medium rounded-lg shadow-xs transition-colors cursor-pointer active:scale-[0.98]"
          >
            <CalendarPlus size={15} className="text-blue-500" />
            Schedule Event
          </button>
          <button 
            onClick={() => onNavigate('task-board')}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs sm:text-sm font-medium rounded-lg shadow-xs transition-colors cursor-pointer active:scale-[0.98]"
          >
            <CheckSquare size={15} className="text-indigo-500" />
            Add Task
          </button>
        </div>
      </div>

      {/* ── 1. KPI CARDS ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {summaryData.map((stat) => (
          <div 
            key={stat.id} 
            onClick={() => {
              if (stat.canClick && stat.targetTab) {
                onNavigate(stat.targetTab);
              }
            }}
            className={`bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-custom flex flex-col justify-between transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-gray-300 ${
              stat.canClick ? 'cursor-pointer hover:border-orange-300' : ''
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${stat.bgColor} ${stat.color}`}>
                  <stat.icon size={20} strokeWidth={2.5} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${stat.scopeBg}`}>
                  {stat.scope}
                </span>
              </div>
              <h3 className="text-gray-500 text-[12px] sm:text-[13px] font-semibold tracking-wide uppercase">{stat.title}</h3>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{stat.value}</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span className="truncate">{stat.subtitle}</span>
              {stat.canClick && (
                <ArrowRight size={12} className="text-gray-400 shrink-0 ml-1" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── 2. REVERSIONS OVER TIME (PRIMARY ANALYTICS CHART) ─────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-custom p-6 min-h-[320px] flex flex-col transition-all duration-300 ease-out hover:shadow-xl hover:border-gray-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-orange-500" />
              <h2 className="text-[16px] font-semibold text-gray-900">Reversions Over Time</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                Reporting Context
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{chartSubtitle}</p>
          </div>
          {isLoadingStats && (
            <div className="flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md font-medium shrink-0">
              <Loader2 size={13} className="animate-spin" />
              <span>Updating analytics...</span>
            </div>
          )}
        </div>

        {canAccessReverts(currentUser) ? (
          <div className="w-full h-[300px]" style={{ minHeight: 300, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={300} minWidth={0} minHeight={300}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revertGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#64748B' }} 
                  tickLine={false} 
                  axisLine={false} 
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#64748B' }} 
                  tickLine={false} 
                  axisLine={false} 
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#FF6B00', fontWeight: 600 }}
                  formatter={(value: any) => [`${value} reverts`, 'Reversions']}
                  labelFormatter={(label: any, payload: any) => {
                    const item = payload?.[0]?.payload;
                    return item?.fullName || label;
                  }}
                />
                <Area type="monotone" dataKey="reverts" stroke="#FF6B00" strokeWidth={2.5} fill="url(#revertGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[260px] flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 rounded-lg border border-dashed border-gray-200 text-gray-400">
            <Info size={32} className="mb-2 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">Reverts Analytics Restricted</p>
            <p className="text-xs text-gray-500 mt-1 max-w-md">
              Historical and periodic reversion records are restricted to authorized Da'wah, New Muslim, and Administrative leadership.
            </p>
          </div>
        )}
      </div>

      {/* ── 3. OFFICIAL ANNOUNCEMENTS | UPCOMING EVENTS (TWO-COLUMN) ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OFFICIAL ANNOUNCEMENTS */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-custom p-5 flex flex-col justify-between transition-all duration-300 ease-out hover:shadow-xl hover:border-gray-300">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/80">
                  <Megaphone size={18} />
                </div>
                <div>
                  <h2 className="text-[15px] sm:text-[16px] font-semibold text-gray-900 leading-tight">Official Announcements</h2>
                  <p className="text-[11px] text-gray-500">Authoritative organizational policies & directives</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsViewAllAnnouncementsOpen(true)}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
                >
                  View All →
                </button>
                {canCreateOfficialNotice(currentUser) && (
                  <button
                    type="button"
                    onClick={() => {
                      setAnnouncementFormData({ title: '', content: '', department: currentUser?.department || '', is_pinned: false });
                      setIsCreateAnnouncementOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Post</span>
                  </button>
                )}
              </div>
            </div>

            {/* List: Latest 3-5 announcements, prioritizing pinned */}
            <div className="space-y-2.5">
              {officialAnnouncements.length === 0 ? (
                <div className="py-10 text-center text-gray-400 flex flex-col items-center justify-center">
                  <Megaphone size={30} className="stroke-1 mb-2 text-gray-300" />
                  <p className="text-sm font-medium text-gray-600">No official announcements</p>
                  <p className="text-xs text-gray-400 mt-0.5">Authoritative center directives will appear here.</p>
                </div>
              ) : (
                officialAnnouncements.slice(0, 4).map((announcement) => {
                  const isPinned = Boolean(announcement.is_pinned);
                  return (
                    <div
                      key={announcement.id}
                      onClick={() => {
                        setViewingNotice(announcement);
                        setIsViewModalOpen(true);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer group hover:shadow-xs ${
                        isPinned
                          ? 'bg-amber-50/50 hover:bg-amber-50/80 border-amber-300 border-l-4 border-l-amber-500'
                          : 'bg-white hover:bg-slate-50 border-gray-200 border-l-4 border-l-amber-400'
                      }`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setViewingNotice(announcement);
                          setIsViewModalOpen(true);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isPinned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-300">
                              <Pin size={10} className="fill-amber-900" /> Pinned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                              <Megaphone size={10} /> Official
                            </span>
                          )}
                          {announcement.department && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200/80">
                              {announcement.department}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium shrink-0">
                          {formatNoticeTime(announcement.created_at)}
                        </span>
                      </div>

                      {announcement.title && (
                        <div className="text-[13px] font-semibold text-gray-900 group-hover:text-amber-700 transition-colors line-clamp-1">
                          {announcement.title}
                        </div>
                      )}

                      <div className="text-[12px] text-gray-600 line-clamp-2 mt-1 leading-snug">
                        {announcement.content || announcement.text}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-gray-100/80 flex items-center justify-between text-[11px] text-gray-500">
                        <span className="font-medium text-gray-700">
                          {announcement.author_name || announcement.author || 'Administrative Office'}
                        </span>
                        <span className="text-amber-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1 font-medium">
                          Read details →
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* UPCOMING EVENTS */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-custom p-5 flex flex-col justify-between transition-all duration-300 ease-out hover:shadow-xl hover:border-gray-300">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/80">
                  <CalendarIcon size={18} />
                </div>
                <div>
                  <h2 className="text-[15px] sm:text-[16px] font-semibold text-gray-900 leading-tight">Upcoming Events</h2>
                  <p className="text-[11px] text-gray-500">Scheduled center programs, classes, & meetings</p>
                </div>
              </div>

              <button 
                onClick={() => onNavigate('calendar')} 
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              >
                View Calendar →
              </button>
            </div>

            <div className="space-y-2">
              {upcomingEvents.length === 0 ? (
                <div className="py-10 text-center text-gray-400 flex flex-col items-center justify-center">
                  <CalendarIcon size={30} className="stroke-1 mb-2 text-gray-300" />
                  <p className="text-sm font-medium text-gray-600">No upcoming events scheduled</p>
                  <p className="text-xs text-gray-400 mt-0.5">Upcoming center classes and gatherings will appear here.</p>
                </div>
              ) : (
                upcomingEvents.map((item, idx) => {
                  const eventDate = new Date(item.start);
                  const day = format(eventDate, 'dd');
                  const month = format(eventDate, 'MMM').toUpperCase();
                  
                  return (
                    <div 
                      key={idx} 
                      onClick={() => onNavigate('calendar', item.id)}
                      className="flex items-center gap-3.5 p-2.5 hover:bg-blue-50/50 rounded-xl transition-all cursor-pointer group border border-gray-100 hover:border-blue-200"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onNavigate('calendar', item.id);
                        }
                      }}
                    >
                      <div className="bg-blue-50 group-hover:bg-blue-100 text-blue-700 rounded-lg w-11 h-11 flex flex-col items-center justify-center shrink-0 transition-colors border border-blue-200/70">
                        <span className="text-[11px] font-extrabold leading-none">{day}</span>
                        <span className="text-[9px] font-bold leading-none mt-1 uppercase text-blue-600">{month}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[13px] text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="capitalize font-medium text-gray-700">{item.type || 'Event'}</span>
                          <span>•</span>
                          <span>{item.allDay ? 'All Day' : format(eventDate, 'h:mm a')}</span>
                          {item.location && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 text-gray-600 truncate">
                                <MapPin size={10} />
                                {item.location}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 mr-1" />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. STAFF NOTICEBOARD (INFORMAL STAFF BULLETIN) ────────────────── */}
      {canAccessNoticeboard(currentUser) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-custom p-6 transition-all duration-300 ease-out hover:shadow-xl hover:border-gray-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-sky-50 text-sky-700 border border-sky-200/80">
                <MessageSquare size={19} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[16px] sm:text-[17px] font-semibold text-gray-900 leading-tight">Staff Noticeboard</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {staffNotes.length} notes
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Informal staff updates, quick team notes, and daily coordination</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setIsViewAllNotesOpen(true)}
                className="text-xs font-semibold text-sky-700 hover:text-sky-800 transition-colors cursor-pointer mr-1"
              >
                View Noticeboard →
              </button>
            </div>
          </div>

          {/* Quick Note Composer */}
          {canCreateStaffPost(currentUser) && (
            <form onSubmit={handleQuickPost} className="mb-6 p-3 bg-gray-50/80 border border-gray-200 rounded-xl flex gap-2">
              <input 
                type="text" 
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Share a quick note, reminder, or availability update with staff..."
                disabled={isQuickSubmitting}
                className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-hidden focus:border-sky-500 transition-colors text-gray-900 shadow-2xs"
              />
              <button 
                type="submit"
                disabled={!quickNote.trim() || isQuickSubmitting}
                className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs sm:text-sm font-medium rounded-lg disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
              >
                {isQuickSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Post a Note</span>
              </button>
            </form>
          )}

          {/* Grid of Recent Staff Notes (Exclude official announcements!) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {staffNotes.length === 0 ? (
              <div className="col-span-full py-12 text-center text-gray-400 flex flex-col items-center justify-center">
                <MessageSquare size={32} className="stroke-1 mb-2 text-gray-300" />
                <p className="text-sm font-medium text-gray-600">No staff notes posted yet</p>
                <p className="text-xs text-gray-400 mt-0.5">Use the box above to post a quick note to your colleagues.</p>
              </div>
            ) : (
              staffNotes.slice(0, 6).map((note) => {
                const authorInitial = (note.author_name || note.author || 'S').trim().charAt(0).toUpperCase();
                return (
                  <div
                    key={note.id}
                    onClick={() => {
                      setViewingNotice(note);
                      setIsViewModalOpen(true);
                    }}
                    className="p-4 rounded-xl border border-gray-200 bg-white hover:border-sky-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setViewingNotice(note);
                        setIsViewModalOpen(true);
                      }
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 font-bold text-[11px] flex items-center justify-center shrink-0">
                            {authorInitial}
                          </div>
                          <span className="text-[12px] font-semibold text-gray-800 truncate">
                            {note.author_name || note.author || 'Staff Member'}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium shrink-0">
                          {formatNoticeTime(note.created_at)}
                        </span>
                      </div>

                      {note.title && (
                        <div className="text-[13px] font-semibold text-gray-900 group-hover:text-sky-700 transition-colors line-clamp-1 mb-1">
                          {note.title}
                        </div>
                      )}

                      <div className="text-[12px] text-gray-600 line-clamp-3 leading-relaxed">
                        {note.content || note.text}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                      {note.department ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                          {note.department}
                        </span>
                      ) : (
                        <span className="text-gray-400">All Staff</span>
                      )}
                      <span className="text-sky-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
                        View note →
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── MODALS: VIEW DETAILS (READ-ONLY FIRST) ─────────────────────────── */}
      <AnimatePresence>
        {isViewModalOpen && viewingNotice && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
              onClick={handleCloseViewModal}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white shadow-xl w-[95%] sm:w-[520px] max-h-[90vh] overflow-y-auto mx-auto rounded-xl flex flex-col z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#F9FAFB]">
                <div className="flex items-center gap-2 flex-wrap">
                  {viewingNotice.type === 'official_notice' || viewingNotice.type === 'notice' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                      <Megaphone size={12} /> Official Announcement
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-300">
                      <MessageSquare size={12} /> Staff Note
                    </span>
                  )}
                  {viewingNotice.is_pinned && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-300">
                      <Pin size={11} className="fill-amber-900" /> Pinned
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

              {/* Footer with Edit / Delete actions respecting RBAC */}
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

      {/* ── CREATE OFFICIAL ANNOUNCEMENT MODAL ─────────────────────────────── */}
      <AnimatePresence>
        {isCreateAnnouncementOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setIsCreateAnnouncementOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white shadow-xl w-[95%] sm:w-[520px] max-h-[90vh] overflow-y-auto mx-auto rounded-xl flex flex-col z-10"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#F9FAFB]">
                <div className="flex items-center gap-2">
                  <Megaphone size={18} className="text-amber-600" />
                  <h3 className="text-[16px] font-semibold text-gray-900">Publish Official Announcement</h3>
                </div>
                <button onClick={() => setIsCreateAnnouncementOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateAnnouncement} className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Title (Optional)</label>
                  <input 
                    type="text" 
                    value={announcementFormData.title} 
                    onChange={e => setAnnouncementFormData({ ...announcementFormData, title: e.target.value })} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:bg-white outline-hidden transition-all text-gray-900" 
                    placeholder="e.g. Center Policy Update, Eid Holiday Schedule, Ramadan Hours" 
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Department Attribution</label>
                  <input 
                    type="text" 
                    value={announcementFormData.department} 
                    onChange={e => setAnnouncementFormData({ ...announcementFormData, department: e.target.value })} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:bg-white outline-hidden transition-all text-gray-900" 
                    placeholder="e.g. Admin, Executive Office, Da'wah" 
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Announcement Content <span className="text-red-500">*</span></label>
                  <textarea 
                    rows={5} 
                    required
                    value={announcementFormData.content} 
                    onChange={e => setAnnouncementFormData({ ...announcementFormData, content: e.target.value })} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-amber-500 focus:bg-white outline-hidden transition-all text-gray-900 resize-none" 
                    placeholder="Write authoritative directive, details, or official guidelines..." 
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="pin_checkbox"
                    checked={announcementFormData.is_pinned}
                    onChange={e => setAnnouncementFormData({ ...announcementFormData, is_pinned: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor="pin_checkbox" className="text-xs font-semibold text-gray-700 cursor-pointer flex items-center gap-1">
                    <Pin size={12} className="text-amber-600" />
                    Pin to top as an Important Directive
                  </label>
                </div>

                <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setIsCreateAnnouncementOpen(false)} 
                    disabled={isSubmittingNotice}
                    className="px-4 py-2 text-[13px] font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmittingNotice || !announcementFormData.content.trim()}
                    className="px-4 py-2 text-[13px] font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingNotice && <Loader2 size={14} className="animate-spin" />}
                    <span>Publish Announcement</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── EDIT NOTICE / ANNOUNCEMENT MODAL ──────────────────────────────── */}
      <AnimatePresence>
        {isEditModalOpen && editingNotice && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => {
                setIsEditModalOpen(false);
                setIsViewModalOpen(true);
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white shadow-xl w-[95%] sm:w-[520px] max-h-[90vh] overflow-y-auto mx-auto rounded-xl flex flex-col z-10"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#F9FAFB]">
                <h3 className="text-[16px] font-semibold text-gray-900">
                  {editFormData.type === 'notice' ? 'Edit Official Announcement' : 'Edit Staff Note'}
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
                        onClick={() => setEditFormData({ ...editFormData, type: 'post', is_pinned: false })}
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          editFormData.type === 'post'
                            ? 'bg-sky-50 border-sky-400 text-sky-800 ring-2 ring-sky-100'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <MessageSquare size={14} />
                        Staff Note
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
                        Official Announcement
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
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Department</label>
                  <input 
                    type="text" 
                    value={editFormData.department} 
                    onChange={e => setEditFormData({ ...editFormData, department: e.target.value })} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white outline-hidden transition-all text-gray-900" 
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Content <span className="text-red-500">*</span></label>
                  <textarea 
                    rows={5} 
                    required
                    value={editFormData.content} 
                    onChange={e => setEditFormData({ ...editFormData, content: e.target.value })} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:bg-white outline-hidden transition-all text-gray-900 resize-none" 
                  />
                </div>

                {editFormData.type === 'notice' && canCreateOfficialNotice(currentUser) && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="edit_pin_checkbox"
                      checked={editFormData.is_pinned}
                      onChange={e => setEditFormData({ ...editFormData, is_pinned: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="edit_pin_checkbox" className="text-xs font-semibold text-gray-700 cursor-pointer flex items-center gap-1">
                      <Pin size={12} className="text-amber-600" />
                      Pin to top as an Important Directive
                    </label>
                  </div>
                )}

                <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
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

      {/* ── MODAL: VIEW ALL OFFICIAL ANNOUNCEMENTS ─────────────────────────── */}
      <AnimatePresence>
        {isViewAllAnnouncementsOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setIsViewAllAnnouncementsOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white shadow-xl w-[95%] sm:w-[650px] max-h-[85vh] overflow-hidden mx-auto rounded-xl flex flex-col z-10"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#F9FAFB]">
                <div className="flex items-center gap-2">
                  <Megaphone size={18} className="text-amber-600" />
                  <h3 className="text-[16px] font-semibold text-gray-900">All Official Announcements</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    {officialAnnouncements.length}
                  </span>
                </div>
                <button onClick={() => setIsViewAllAnnouncementsOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-gray-100 bg-white">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={announcementsSearch}
                    onChange={e => setAnnouncementsSearch(e.target.value)}
                    placeholder="Search announcements by title or content..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:border-amber-500 focus:bg-white outline-hidden transition-all text-gray-900"
                  />
                </div>
              </div>

              <div className="p-6 overflow-y-auto space-y-3 flex-1">
                {officialAnnouncements
                  .filter(a => {
                    if (!announcementsSearch.trim()) return true;
                    const q = announcementsSearch.toLowerCase();
                    return (a.title && a.title.toLowerCase().includes(q)) || 
                           (a.content && a.content.toLowerCase().includes(q)) ||
                           (a.department && a.department.toLowerCase().includes(q));
                  })
                  .map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setViewingNotice(item);
                        setIsViewModalOpen(true);
                      }}
                      className="p-4 rounded-xl border border-gray-200 bg-white hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          {item.is_pinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900">
                              <Pin size={10} className="fill-amber-900" /> Pinned
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                            {item.department || 'All Staff'}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {formatNoticeTime(item.created_at)}
                        </span>
                      </div>
                      {item.title && (
                        <h4 className="font-semibold text-sm text-gray-900 mb-1">{item.title}</h4>
                      )}
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{item.content || item.text}</p>
                      <div className="mt-2 text-[11px] text-gray-500 flex items-center justify-between">
                        <span>Posted by {item.author_name || 'Administrative Office'}</span>
                        <span className="text-amber-600 font-medium">View full announcement →</span>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setIsViewAllAnnouncementsOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: VIEW ALL STAFF NOTES ───────────────────────────────────── */}
      <AnimatePresence>
        {isViewAllNotesOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
              onClick={() => setIsViewAllNotesOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white shadow-xl w-[95%] sm:w-[650px] max-h-[85vh] overflow-hidden mx-auto rounded-xl flex flex-col z-10"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#F9FAFB]">
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-sky-600" />
                  <h3 className="text-[16px] font-semibold text-gray-900">Staff Noticeboard Bulletin</h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                    {staffNotes.length}
                  </span>
                </div>
                <button onClick={() => setIsViewAllNotesOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-gray-100 bg-white">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={notesSearch}
                    onChange={e => setNotesSearch(e.target.value)}
                    placeholder="Search staff notes by author or text..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm focus:border-sky-500 focus:bg-white outline-hidden transition-all text-gray-900"
                  />
                </div>
              </div>

              <div className="p-6 overflow-y-auto space-y-3 flex-1">
                {staffNotes
                  .filter(n => {
                    if (!notesSearch.trim()) return true;
                    const q = notesSearch.toLowerCase();
                    return (n.title && n.title.toLowerCase().includes(q)) || 
                           (n.content && n.content.toLowerCase().includes(q)) ||
                           (n.author_name && n.author_name.toLowerCase().includes(q));
                  })
                  .map(item => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setViewingNotice(item);
                        setIsViewModalOpen(true);
                      }}
                      className="p-4 rounded-xl border border-gray-200 bg-white hover:border-sky-300 hover:shadow-xs transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-gray-800">
                            {item.author_name || item.author || 'Staff Member'}
                          </span>
                          {item.department && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                              {item.department}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {formatNoticeTime(item.created_at)}
                        </span>
                      </div>
                      {item.title && (
                        <h4 className="font-semibold text-xs text-gray-900 mb-1">{item.title}</h4>
                      )}
                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{item.content || item.text}</p>
                    </div>
                  ))}
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setIsViewAllNotesOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteNotice}
        title="Delete Item?"
        message="Are you sure you want to delete this item? This action cannot be undone."
        isDeleting={isDeletingNotice}
      />
    </div>
  );
}
