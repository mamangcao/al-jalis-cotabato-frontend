/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar as CalendarIcon, 
  Search, 
  Bell,
  Menu,
  X,
  LogOut,
  Briefcase,
  Settings,
  User,
  ChevronDown,
  ChevronRight,
  Heart,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageSquareHeart
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import CommandPalette from './components/CommandPalette';
import ProfileModal from './components/ProfileModal';
import Dashboard from './pages/Dashboard';
import Reverts from './pages/Reverts';
import CalendarPage from './pages/CalendarPage';
import Operations from './pages/Operations';
import Donations from './pages/Donations';
import SettingsPage from './pages/Settings';
import LeaveManagement from './pages/LeaveManagement';
import EvaluationsPage from './pages/EvaluationsPage';
import Login from './pages/Login';
import NotificationBell from './components/NotificationBell';
import DateRangePicker, { DateRange } from './components/DateRangePicker';
import { AuthProvider, useAuth } from './AuthContext';
import ForcePasswordChangeModal from './components/ForcePasswordChangeModal';
import { 
  canManagePersonnel, 
  canAccessReverts, 
  canAccessDonations, 
  canAccessDirectory, 
  canAccessTaskBoard,
  canAccessCalendar,
  canAccessLeaves,
  canAccessNoticeboard
} from './lib/permissions';
import { initialReverts, initialEvents, initialMembers, mockTasks, mockCampaigns, mockDonations, initialLeaves } from './data';
import { api } from './services/api';

function MainApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('auth_token'));
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      toast.error('Session expired. Please sign in again.');
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | number | null>(null);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isOperationsOpen, setIsOperationsOpen] = useState(false);
  const [isDonationsOpen, setIsDonationsOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Global state for sharing between tabs
  const [reverts, setReverts] = useState(initialReverts);
  const [events, setEvents] = useState(initialEvents);
  const [members, setMembers] = useState(initialMembers);
  const [tasks, setTasks] = useState(mockTasks);
  const [campaigns, setCampaigns] = useState(mockCampaigns);
  const [donations, setDonations] = useState(mockDonations);
  const [leaves, setLeaves] = useState(initialLeaves);
  const [notices, setNotices] = useState<any[]>([]);
  
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null
  });

  // Load live data from Laravel backend when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;
    const fetchBackendData = () => {
      // Fetch each resource independently so each UI module populates immediately as soon as its data returns
      api.notices.getAll()
        .then(data => { if (isMounted && Array.isArray(data)) setNotices(data); })
        .catch(() => {});

      api.events.getAll()
        .then(data => {
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setEvents(data.map((ev: any) => ({
              ...ev,
              start: new Date(ev.start),
              end: ev.end ? new Date(ev.end) : new Date(ev.start),
            })));
          }
        })
        .catch(() => {});

      api.tasks.getAll()
        .then(data => { if (isMounted && Array.isArray(data) && data.length > 0) setTasks(data); })
        .catch(() => {});

      api.leaves.getAll()
        .then(data => { if (isMounted && Array.isArray(data) && data.length > 0) setLeaves(data); })
        .catch(() => {});

      api.members.getAll()
        .then(data => { if (isMounted && Array.isArray(data) && data.length > 0) setMembers(data); })
        .catch(() => {});

      api.reverts.getAll()
        .then(data => { if (isMounted && Array.isArray(data) && data.length > 0) setReverts(data); })
        .catch(() => {});

      api.campaigns.getAll()
        .then(data => { if (isMounted && Array.isArray(data) && data.length > 0) setCampaigns(data); })
        .catch(() => {});

      api.donations.getAll()
        .then(data => { if (isMounted && Array.isArray(data) && data.length > 0) setDonations(data); })
        .catch(() => {});
    };

    fetchBackendData();
    return () => { isMounted = false; };
  }, [isAuthenticated]);

  interface NavTab {
    id: string;
    label: string;
    icon: any;
    hidden?: boolean;
    adminOnly?: boolean;
    subItems?: { id: string; label: string }[];
  }

  const isEvalOnly = currentUser.account_type === 'evaluation_only' || currentUser.role === 'evaluation_only';

  const operationsSubItems = [
    ...(canAccessDirectory(currentUser) ? [{ id: 'directory', label: 'Directory' }] : []),
    ...(canAccessTaskBoard(currentUser) ? [{ id: 'task-board', label: 'Task Board' }] : []),
  ];

  const tabs: NavTab[] = isEvalOnly
    ? [{ id: 'evaluations', label: 'Peer Evaluations', icon: MessageSquareHeart }]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ...(canAccessReverts(currentUser) ? [{ id: 'reverts', label: 'Reverts', icon: Users }] : []),
        { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
        ...(operationsSubItems.length > 0 ? [{ 
          id: 'operations', 
          label: 'Operations', 
          icon: Briefcase,
          subItems: operationsSubItems
        }] : []),
        ...(canAccessDonations(currentUser) ? [{
          id: 'donations',
          label: 'Donations',
          icon: Heart,
          subItems: [
            { id: 'campaigns', label: 'Campaigns' },
            { id: 'history', label: 'History' }
          ]
        }] : []),
        { id: 'leaves', label: 'Leaves', icon: FileText },
        { id: 'evaluations', label: 'Peer Evaluations', icon: MessageSquareHeart },
        { id: 'settings', label: 'System Settings', icon: Settings, adminOnly: true }
      ];

  // Centralized navigation handler with RBAC validation and history sync
  const handleNavigate = (tab: string, entityId?: string | number) => {
    if (isEvalOnly && tab !== 'evaluations') {
      toast.error('Evaluation-only accounts can only access Peer Evaluations.');
      return;
    }
    if (tab === 'reverts' && !canAccessReverts(currentUser)) {
      toast.error('You do not have access to the Reverts module.');
      return;
    }
    if (tab === 'directory' && !canAccessDirectory(currentUser)) {
      toast.error('You do not have access to the Directory.');
      return;
    }
    if ((tab === 'donations' || tab === 'campaigns' || tab === 'history') && !canAccessDonations(currentUser)) {
      toast.error('You do not have access to Donations.');
      return;
    }
    if (tab === 'calendar' && !canAccessCalendar(currentUser)) {
      toast.error('You do not have access to the Calendar.');
      return;
    }
    if (tab === 'task-board' && !canAccessTaskBoard(currentUser)) {
      toast.error('You do not have access to the Task Board.');
      return;
    }
    if (tab === 'leaves' && !canAccessLeaves(currentUser)) {
      toast.error('You do not have access to Leaves.');
      return;
    }

    setActiveTab(tab);
    if (tab === 'calendar' && entityId) {
      setSelectedEventId(entityId);
    }
    if (tab === 'dashboard' && entityId) {
      setSelectedNoticeId(entityId);
    }
    const targetPath = tab === 'dashboard' ? '/' : `/${tab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  // RBAC safety navigation guard: ensure users cannot stay on tabs they cannot access
  useEffect(() => {
    if (isEvalOnly && activeTab !== 'evaluations') {
      setActiveTab('evaluations');
    } else if (activeTab === 'directory' && !canAccessDirectory(currentUser)) {
      setActiveTab('task-board');
    } else if (activeTab === 'reverts' && !canAccessReverts(currentUser)) {
      setActiveTab('dashboard');
    } else if ((activeTab === 'donations' || activeTab === 'campaigns' || activeTab === 'history') && !canAccessDonations(currentUser)) {
      setActiveTab('dashboard');
    }
  }, [currentUser, activeTab, isEvalOnly]);

  // Listen for manual URL navigation, direct page loads, or hash navigation
  useEffect(() => {
    const handleUrlCheck = () => {
      const rawPath = window.location.pathname.toLowerCase().replace(/^\/+|\/+$/g, '');
      const rawHash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
      const route = rawHash || rawPath;

      if (!route || route === 'dashboard') {
        setActiveTab('dashboard');
      } else if (route === 'calendar') {
        setActiveTab('calendar');
      } else if (route === 'task-board' || route === 'tasks') {
        setActiveTab('task-board');
      } else if (route === 'directory') {
        setActiveTab('directory');
      } else if (route === 'reverts') {
        setActiveTab('reverts');
      } else if (route === 'campaigns') {
        setActiveTab('campaigns');
      } else if (route === 'donations' || route === 'history') {
        setActiveTab('history');
      } else if (route === 'leaves') {
        setActiveTab('leaves');
      } else if (route === 'evaluations') {
        setActiveTab('evaluations');
      } else if (route === 'settings') {
        setActiveTab('settings');
      }
    };
    handleUrlCheck();
    window.addEventListener('popstate', handleUrlCheck);
    window.addEventListener('hashchange', handleUrlCheck);
    return () => {
      window.removeEventListener('popstate', handleUrlCheck);
      window.removeEventListener('hashchange', handleUrlCheck);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Use exact timezone for Philippines
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      setCurrentDateTime(formatter.format(now));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans print:h-auto print:overflow-visible">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden print:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        className={`fixed lg:static inset-y-0 left-0 z-[60] bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out flex flex-col pt-6 pb-6 print:hidden
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isDesktopSidebarCollapsed ? 'lg:w-0 lg:overflow-hidden lg:opacity-0 lg:border-r-0' : 'lg:w-[220px] w-[220px] lg:opacity-100'}
        `}
      >
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="flex items-center justify-between px-6 pb-8 min-w-[220px]">
          <div className="flex items-center gap-3 text-orange-500 tracking-tight">
            <div className="w-8 h-8 bg-orange-500 rounded-lg shrink-0"></div>
            <div className="flex flex-col leading-tight">
              <span className="text-[14px] font-bold">Al-Jalis As-Salih</span>
              <span className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Cotabato Chapter</span>
            </div>
          </div>
          <button className="lg:hidden text-gray-500" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 flex flex-col min-w-[220px]">
          {tabs.filter(t => !t.hidden && (t.id !== 'settings' || canManagePersonnel(currentUser.role)) && (!t.adminOnly || currentUser.role.startsWith('admin'))).map((tab) => {
            const isActive = activeTab === tab.id || (tab.subItems && tab.subItems.some(sub => sub.id === activeTab));
            
            const navButton = (
              <button
                onClick={() => {
                  if (tab.subItems) {
                    if (tab.id === 'operations') setIsOperationsOpen(!isOperationsOpen);
                    if (tab.id === 'donations') setIsDonationsOpen(!isDonationsOpen);
                    if (!isActive) {
                      handleNavigate(tab.subItems[0].id);
                    }
                  } else {
                    handleNavigate(tab.id);
                    setIsSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center justify-between px-6 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-orange-50 text-orange-500 border-r-3 border-orange-500' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-r-3 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <tab.icon size={18} className={isActive ? 'text-orange-500' : 'text-gray-500'} />
                  {tab.label}
                </div>
                {tab.subItems && (
                  <ChevronDown size={16} className={`transition-transform duration-300 ${(tab.id === 'operations' && isOperationsOpen) || (tab.id === 'donations' && isDonationsOpen) ? 'rotate-180' : ''}`} />
                )}
              </button>
            );

            if (tab.id === 'settings') {
              return canManagePersonnel(currentUser.role) ? (
                <div key={tab.id} className="flex flex-col">
                  {navButton}
                </div>
              ) : null;
            }

            return (
              <div key={tab.id} className="flex flex-col">
                {navButton}
                {tab.subItems && (
                  <div className={`grid transition-all duration-300 ease-in-out ${(tab.id === 'operations' && isOperationsOpen) || (tab.id === 'donations' && isDonationsOpen) ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden flex flex-col py-1">
                      {tab.subItems.map((subItem) => (
                        <button
                          key={subItem.id}
                          onClick={() => {
                            handleNavigate(subItem.id);
                            setIsSidebarOpen(false);
                          }}
                          className={`w-full text-left pl-[52px] pr-6 py-2.5 text-[13px] font-medium transition-colors ${
                            activeTab === subItem.id ? 'text-orange-600 font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          {subItem.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 shrink-0">
          <div className="text-center text-xs text-gray-400 font-medium tracking-wide">
            Al-Jalis As-Salih HRMS v2.0.0
          </div>
        </div>
      </motion.aside>

      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
        data={{ reverts, donations, members, tasks }}
        onNavigate={(tab) => {
          handleNavigate(tab);
          if (tab === 'directory' || tab === 'task-board') setIsOperationsOpen(true);
          if (tab === 'campaigns' || tab === 'history') setIsDonationsOpen(true);
        }}
      />
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
      {currentUser.must_change_password && <ForcePasswordChangeModal />}
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible">
        {/* Header */}
        <header className="w-full flex items-center justify-between p-4 bg-white border-b border-gray-200 z-10 shrink-0 print:hidden">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Mobile Menu Button */}
            <button 
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg shrink-0"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            {/* Desktop Menu Button */}
            <button 
              className="hidden lg:block p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
            >
              <Menu size={20} />
            </button>
            <div className="flex-1 min-w-0 flex items-center gap-1 sm:gap-2 overflow-hidden text-sm md:text-base font-medium mr-2 sm:mr-4">
              {(() => {
                let breadcrumbs = [];
                for (const tab of tabs) {
                  if (tab.id === activeTab) {
                    breadcrumbs.push({ id: tab.id, label: tab.label });
                    break;
                  }
                  if (tab.subItems) {
                    const sub = tab.subItems.find(s => s.id === activeTab);
                    if (sub) {
                      breadcrumbs.push({ id: tab.id, label: tab.label });
                      breadcrumbs.push({ id: sub.id, label: sub.label });
                      break;
                    }
                  }
                }

                if (breadcrumbs.length === 0) return null;

                return breadcrumbs.map((item, index) => {
                  const isLast = index === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={item.id}>
                      {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 hidden sm:block" />}
                      <span 
                        className={
                          isLast 
                            ? 'text-gray-900 font-semibold truncate' 
                            : 'text-gray-500 hover:text-gray-900 transition-colors cursor-pointer hidden sm:block whitespace-nowrap flex-shrink-0'
                        }
                        onClick={() => {
                          if (!isLast) {
                            const tab = tabs.find(t => t.id === item.id);
                            if (tab && tab.subItems && tab.subItems.length > 0) {
                              setActiveTab(tab.subItems[0].id);
                              if (item.id === 'operations') setIsOperationsOpen(true);
                              if (item.id === 'donations') setIsDonationsOpen(true);
                            } else {
                              setActiveTab(item.id);
                            }
                          }
                        }}
                      >
                        {item.label}
                      </span>
                    </React.Fragment>
                  );
                });
              })()}
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 ml-auto flex-shrink-0">
            <div className="hidden md:block">
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors w-64"
              >
                <Search size={16} />
                <span className="flex-1 text-left">Search...</span>
                <kbd className="hidden sm:inline-block text-[10px] font-semibold text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">⌘K</kbd>
              </button>
            </div>
            <div className="hidden md:block">
              <DateRangePicker dateRange={dateRange} onChange={setDateRange} />
            </div>
            <div className="hidden lg:flex flex-col items-end justify-center">
              <div className="text-[13px] font-medium text-gray-500">
                {currentDateTime}
              </div>
              <div className="text-xs text-gray-500">
                28 Rabi' al-Awwal 1448
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <NotificationBell 
                events={events} 
                tasks={tasks}
                leaves={leaves}
                reverts={reverts}
                notices={notices}
                onNavigate={handleNavigate} 
              />
              
              <div className="h-4 w-[1px] bg-gray-200 hidden sm:block"></div>
              <div className="relative">
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors"
                >
                  <div className="text-right hidden lg:block">
                    <div className="text-sm font-semibold text-gray-900 leading-tight">{currentUser.name}</div>
                    <div className="text-[11px] text-gray-500 font-medium">
                      {currentUser.job_title || (
                        currentUser.role === 'admin_director' || currentUser.role === 'director'
                          ? 'Center Director'
                          : currentUser.role === 'admin_finance' || currentUser.role === 'finance'
                            ? 'Finance Admin'
                            : currentUser.role === 'admin_hr' || currentUser.role === 'hr'
                              ? 'HR Admin'
                              : currentUser.role === 'executive_secretary'
                                ? 'Executive Secretary'
                                : currentUser.account_type === 'evaluation_only'
                                  ? 'Evaluation Account'
                                  : 'Staff Member'
                      )}
                    </div>
                    <div className="text-xs text-gray-500">Dept: {currentUser.department}</div>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-[#FF6B00] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                    {currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AJ'}
                  </div>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1">
                    <div 
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                    >
                      <User size={16} />
                      My Profile
                    </div>
                    <div className="border-t border-gray-100 my-1"></div>
                    <div 
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                      onClick={async () => {
                        setIsProfileOpen(false);
                        await logout();
                        setIsAuthenticated(false);
                        toast.success('Signed out successfully');
                      }}
                    >
                      <LogOut size={16} />
                      Log Out
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden p-6 md:px-8 bg-gray-50 flex flex-col print:overflow-visible print:p-0 print:bg-white print:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full w-full overflow-y-auto print:overflow-visible print:h-auto"
            >
              {activeTab === 'dashboard' && (
                <Dashboard 
                  reverts={reverts} 
                  events={events} 
                  tasks={tasks} 
                  notices={notices}
                  setNotices={setNotices}
                  selectedNoticeId={selectedNoticeId}
                  onClearSelectedNotice={() => setSelectedNoticeId(null)}
                  onNavigate={handleNavigate} 
                  dateRange={dateRange} 
                />
              )}
              {activeTab === 'reverts' && <Reverts reverts={reverts} setReverts={setReverts} dateRange={dateRange} />}
              {activeTab === 'calendar' && <CalendarPage events={events} setEvents={setEvents} selectedEventId={selectedEventId} onClearSelectedEvent={() => setSelectedEventId(null)} />}
              {(activeTab === 'directory' || activeTab === 'task-board') && <Operations view={activeTab} members={members} setMembers={setMembers} tasks={tasks} setTasks={setTasks} />}
              {(activeTab === 'campaigns' || activeTab === 'history') && <Donations view={activeTab} dateRange={dateRange} campaigns={campaigns} setCampaigns={setCampaigns} donations={donations} setDonations={setDonations} />}
              {activeTab === 'settings' && (
                <SettingsPage onNavigate={(tab) => handleNavigate(tab)} />
              )}
              {activeTab === 'leaves' && <LeaveManagement leaves={leaves} setLeaves={setLeaves} />}
              {activeTab === 'evaluations' && <EvaluationsPage members={members} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          duration: 4000,
          style: { 
            fontSize: '13px', 
            borderRadius: '10px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            maxWidth: '420px',
          } 
        }} 
      />
      <MainApp />
    </AuthProvider>
  );
}
