import React, { useMemo, useState } from 'react';
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
  CheckSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';
import { canManageOperations } from '../lib/permissions';
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
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays, parseISO, subMonths, isSameMonth, addMonths, isSameDay, addDays } from 'date-fns';
import { generateInstances } from '../utils/recurrence';
import { calculateTrend } from '../utils/trends';
import { isEndOfMonth, isLastWeekOfMonth } from '../utils/evaluations';
import DateRangePicker, { DateRange } from '../components/DateRangePicker';

export default function Dashboard({ reverts = [], events = [], tasks = [], onNavigate, dateRange }: { reverts?: any[], events?: any[], tasks?: any[], onNavigate: (tab: string) => void, dateRange: DateRange }) {
  const { currentUser } = useAuth();
  const [notices, setNotices] = useState([
    { id: 1, text: 'Please remind Friday volunteers to arrive by 11:30 AM', author: 'Admin User', time: '2 hours ago' },
    { id: 2, text: 'The new sound system will be installed tomorrow after Dhuhr', author: 'Operations Team', time: '5 hours ago' }
  ]);
  const [newNotice, setNewNotice] = useState('');

  const handleAddNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageOperations(currentUser.role)) {
      toast.error("Unauthorized: Operations access required.");
      return;
    }
    if (!newNotice.trim()) return;
    setNotices([{
      id: Date.now(),
      text: newNotice,
      author: 'Admin User',
      time: 'Just now'
    }, ...notices]);
    setNewNotice('');
  };

  const summaryData = useMemo(() => {
    // 1. Total Reverts (Raw count of all reverts)
    const totalRevertsCount = reverts.length;

    // 2. Shahadahs This Month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const shahadahsThisMonth = reverts.filter(r => {
      if (!r.reversionDate) return false;
      const revDate = new Date(r.reversionDate);
      return revDate.getMonth() === currentMonth && revDate.getFullYear() === currentYear;
    }).length;

    // 3. Pending Mentorship
    const pendingMentorship = reverts.filter(r => r.mentorshipStatus === 'Pending Assignment').length;

    // 4. Open Tasks
    const openTasks = tasks.filter(t => t.status === 'todo' || t.status === 'in-progress').length;

    return [
      { 
        title: 'Total Reverts', 
        value: totalRevertsCount.toString(), 
        subtitle: '— All time', 
        icon: Users, 
        color: 'text-gray-600', 
        bgColor: 'bg-gray-100' 
      },
      { 
        title: 'New This Month', 
        value: shahadahsThisMonth.toString(), 
        subtitle: '— Current month', 
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
  }, [reverts, tasks]);

  const chartData = useMemo(() => {
    if (!dateRange.startDate) {
      // All time - show last 6 months
      const months = [];
      for (let i = 5; i >= 0; i--) {
        months.push(subMonths(new Date(), i));
      }
      return months.map(month => {
        const count = reverts.filter(r => {
          if (!r.reversionDate) return false;
          const revDate = new Date(r.reversionDate);
          return isSameMonth(revDate, month);
        }).length;
        
        return { name: format(month, 'MMM'), reverts: count };
      });
    }

    const currentEnd = dateRange.endDate || new Date();
    const durationMs = currentEnd.getTime() - dateRange.startDate.getTime();
    const days = Math.round(durationMs / (1000 * 60 * 60 * 24));

    if (days <= 31) {
      // Show daily data
      const data = [];
      for (let i = 0; i <= days; i++) {
        const day = addDays(dateRange.startDate, i);
        if (isAfter(day, currentEnd)) break;
        
        const count = reverts.filter(r => {
          if (!r.reversionDate) return false;
          return isSameDay(new Date(r.reversionDate), day);
        }).length;

        data.push({
          name: format(day, 'MMM d'),
          reverts: count
        });
      }
      return data;
    } else {
      // Show monthly data within range
      const data = [];
      let currentMonth = new Date(dateRange.startDate);
      while (isBefore(currentMonth, currentEnd) || isSameMonth(currentMonth, currentEnd)) {
        const count = reverts.filter(r => {
          if (!r.reversionDate) return false;
          const revDate = new Date(r.reversionDate);
          return isSameMonth(revDate, currentMonth) && 
                 (isAfter(revDate, dateRange.startDate) || isSameDay(revDate, dateRange.startDate)) &&
                 (isBefore(revDate, currentEnd) || isSameDay(revDate, currentEnd));
        }).length;
        
        data.push({
          name: format(currentMonth, 'MMM yy'),
          reverts: count
        });
        currentMonth = addMonths(currentMonth, 1);
      }
      return data;
    }
  }, [reverts, dateRange]);

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
          <button 
            onClick={() => {
              toast.success('Action completed successfully');
              onNavigate('reverts');
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <PlusCircle size={16} className="text-white" />
            Add Revert
          </button>
          <button 
            onClick={() => {
              toast.success('Action completed successfully');
              onNavigate('campaigns');
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <DollarSign size={16} className="text-emerald-500" />
            Log Donation
          </button>
          <button 
            onClick={() => {
              toast.success('Action completed successfully');
              onNavigate('calendar');
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <CalendarPlus size={16} className="text-blue-500" />
            Schedule Event
          </button>
          <button 
            onClick={() => {
              toast.success('Action completed successfully');
              onNavigate('task-board');
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-colors whitespace-nowrap"
          >
            <CheckSquare size={16} className="text-slate-500" />
            Add Task
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {summaryData.map((stat, idx) => (
            <div key={idx} className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-custom flex flex-col transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-gray-300">
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
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-custom p-6 min-h-[300px] flex flex-col transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-gray-300">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[16px] font-semibold text-gray-900">Reversions Over Time</h2>
          </div>
          <div className="flex-1 w-full h-[300px] min-h-[300px] relative">
            <div className="absolute inset-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '12px' }}
                    itemStyle={{ color: '#FF6B00' }}
                  />
                  <Area type="monotone" dataKey="reverts" stroke="#FF6B00" strokeWidth={3} fill="#FFF0E6" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Schedule/Calendar Widget Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-custom p-5 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-gray-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-semibold text-gray-900">Upcoming Events</h2>
            <button onClick={() => onNavigate('calendar')} className="text-[12px] font-semibold text-orange-500 hover:text-orange-600 transition-all duration-200 ease-in-out hover:opacity-90 active:scale-[0.97]">
              View All
            </button>
          </div>
          
          <div className="space-y-0">
            {upcomingEvents.length === 0 ? (
              <div className="py-6 text-center text-[13px] text-gray-500">
                No upcoming events scheduled.
              </div>
            ) : upcomingEvents.map((item, idx) => {
              const eventDate = new Date(item.start);
              const day = format(eventDate, 'dd');
              const month = format(eventDate, 'MMM').toUpperCase();
              
              return (
                <div key={idx} className="flex gap-3 py-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="bg-orange-50 text-orange-500 rounded-md w-10 h-10 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold leading-none">{day}</span>
                    <span className="text-[10px] font-bold leading-none mt-0.5">{month}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-[13px] text-gray-900 line-clamp-1">{item.title}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5 capitalize">{item.type} • {item.allDay ? 'All Day' : format(eventDate, 'h:mm a')}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Noticeboard Widget */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col h-[400px]">
          <div className="flex items-center gap-2 mb-4 shrink-0 border-b border-gray-100 pb-3">
            <Pin size={18} className="text-gray-500" />
            <h2 className="text-[16px] font-semibold text-gray-900">Staff Noticeboard</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {notices.map((notice) => (
              <div key={notice.id} className="flex flex-col p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-800 leading-snug">{notice.text}</div>
                <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                  <span>{notice.author}</span>
                  <span>•</span>
                  <span>{notice.time}</span>
                </div>
              </div>
            ))}
          </div>

          {canManageOperations(currentUser.role) && (
            <form onSubmit={handleAddNotice} className="flex gap-2 mt-4 shrink-0 w-full">
              <input 
                type="text" 
                value={newNotice}
                onChange={(e) => setNewNotice(e.target.value)}
                placeholder="Post a quick note..."
                className="w-full text-sm pl-3 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-gray-300 focus:bg-white transition-colors"
              />
              <button 
                type="submit"
                disabled={!newNotice.trim()}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors shrink-0"
              >
                Post
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
