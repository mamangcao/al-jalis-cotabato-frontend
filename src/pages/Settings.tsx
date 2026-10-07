import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Calendar, 
  Clock, 
  Trash2, 
  Plus, 
  Save, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw,
  Tag,
  X,
  Sliders,
  CalendarDays,
  FileText,
  Lock,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';
import { canManagePersonnel } from '../lib/permissions';
import GlobalPillTabs, { TabItem } from '../components/ui/GlobalPillTabs';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { 
  getSystemSettings, 
  fetchSystemSettingsFromApi,
  saveSystemSettings, 
  DEFAULT_SYSTEM_SETTINGS, 
  SystemSettingsData,
  RestrictedPeriod 
} from '../utils/systemSettings';

interface SystemSettingsProps {
  onNavigate?: (tab: string) => void;
}

export default function SystemSettings({ onNavigate }: SystemSettingsProps) {
  const { currentUser } = useAuth();

  // 1. Strict Access Control (HR / Admin / Director Only)
  useEffect(() => {
    if (!canManagePersonnel(currentUser.role)) {
      toast.error("Unauthorized Access");
      onNavigate?.('dashboard');
    }
  }, [currentUser.role, onNavigate]);

  // If not authorized, do not render page content
  if (!canManagePersonnel(currentUser.role)) {
    return null;
  }

  // 2. Global Pill Tabs
  const SETTINGS_TABS: TabItem[] = [
    { id: 'leave-policies', label: 'Leave Policies' },
    { id: 'restricted-periods', label: 'Restricted Periods' },
    { id: 'organization', label: 'Organization' },
  ];

  const [activeTab, setActiveTab] = useState<string>('leave-policies');

  // Load initial settings state
  const [settings, setSettings] = useState<SystemSettingsData>(() => getSystemSettings());

  // Local state for Leave Policies
  const [leavePolicies, setLeavePolicies] = useState(settings.leavePolicies);

  // Local state for Restricted Periods
  const [restrictedPeriods, setRestrictedPeriods] = useState<RestrictedPeriod[]>(settings.restrictedPeriods);

  // Local state for Organization
  const [companyName, setCompanyName] = useState(settings.organization.companyName);
  const [chapter, setChapter] = useState(settings.organization.chapter);
  const [departments, setDepartments] = useState<string[]>(settings.organization.departments);
  const [newDepartmentName, setNewDepartmentName] = useState('');

  const [isResetLeaveModalOpen, setIsResetLeaveModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<string | null>(null);
  const [periodToDelete, setPeriodToDelete] = useState<string | null>(null);
  const [isSavingLeavePolicies, setIsSavingLeavePolicies] = useState(false);
  const [isSavingRestricted, setIsSavingRestricted] = useState(false);
  const [isSavingOrg, setIsSavingOrg] = useState(false);

  // Keep state synced with external updates and fetch from API
  useEffect(() => {
    fetchSystemSettingsFromApi();

    const handleSync = () => {
      const updated = getSystemSettings();
      setSettings(updated);
      setLeavePolicies(updated.leavePolicies);
      setRestrictedPeriods(updated.restrictedPeriods);
      setCompanyName(updated.organization.companyName);
      setChapter(updated.organization.chapter);
      setDepartments(updated.organization.departments);
    };

    window.addEventListener('system-settings-updated', handleSync);
    return () => window.removeEventListener('system-settings-updated', handleSync);
  }, []);

  // --- Handlers for Tab 1: Leave Policies ---
  const handleSaveLeavePolicies = async () => {
    setIsSavingLeavePolicies(true);
    try {
      const updated: SystemSettingsData = {
        ...settings,
        leavePolicies: {
          vacationCredits: Number(leavePolicies.vacationCredits) || 0,
          sickCredits: Number(leavePolicies.sickCredits) || 0,
          emergencyCredits: Number(leavePolicies.emergencyCredits) || 0,
          maxConsecutiveVacationDays: Number(leavePolicies.maxConsecutiveVacationDays) || 1,
          maxStaffOnVacationPerMonth: Number(leavePolicies.maxStaffOnVacationPerMonth) || 1,
        },
      };
      setSettings(updated);
      saveSystemSettings(updated);
      toast.success('Settings updated successfully.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update settings.');
    } finally {
      setIsSavingLeavePolicies(false);
    }
  };

  const handleConfirmResetLeavePolicies = () => {
    setLeavePolicies(DEFAULT_SYSTEM_SETTINGS.leavePolicies);
    setIsResetLeaveModalOpen(false);
    toast.success('Leave policies reset to standard defaults.');
  };

  // --- Handlers for Tab 2: Restricted Periods ---
  const handleAddRestrictedPeriod = () => {
    const nextYear = new Date().getFullYear();
    const newPeriod: RestrictedPeriod = {
      id: `period_${Date.now()}`,
      title: '',
      startDate: `${nextYear}-01-01`,
      endDate: `${nextYear}-01-07`,
      description: '',
    };
    setRestrictedPeriods(prev => [...prev, newPeriod]);
  };

  const handleUpdateRestrictedPeriod = (id: string, field: keyof RestrictedPeriod, value: string) => {
    setRestrictedPeriods(prev => 
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const confirmDeleteRestrictedPeriod = () => {
    if (periodToDelete) {
      setRestrictedPeriods(prev => prev.filter(p => p.id !== periodToDelete));
      setPeriodToDelete(null);
      toast.success('Restricted period removed.');
    }
  };

  const handleSaveRestrictedPeriods = async () => {
    // Validate rows
    for (const p of restrictedPeriods) {
      if (!p.title.trim()) {
        toast.error('Please specify a title for all restricted periods.');
        return;
      }
      if (!p.startDate || !p.endDate) {
        toast.error(`Please provide both start and end dates for "${p.title}".`);
        return;
      }
      if (new Date(p.startDate) > new Date(p.endDate)) {
        toast.error(`Start date cannot be after end date for "${p.title}".`);
        return;
      }
    }

    setIsSavingRestricted(true);
    try {
      const updated: SystemSettingsData = {
        ...settings,
        restrictedPeriods,
      };
      setSettings(updated);
      saveSystemSettings(updated);
      toast.success('Settings updated successfully.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update settings.');
    } finally {
      setIsSavingRestricted(false);
    }
  };

  // --- Handlers for Tab 3: Organization & Departments ---
  const handleAddDepartment = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newDepartmentName.trim();
    if (!trimmed) {
      toast.error('Please enter a department name.');
      return;
    }
    if (departments.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`Department "${trimmed}" already exists.`);
      return;
    }

    const updated = [...departments, trimmed];
    setDepartments(updated);
    setNewDepartmentName('');
    toast.success(`Department "${trimmed}" added.`);
  };

  const confirmDeleteDepartment = () => {
    if (!deptToDelete) return;
    if (departments.length <= 1) {
      toast.error('At least one department must remain in the organization.');
      setDeptToDelete(null);
      return;
    }
    const updated = departments.filter(d => d !== deptToDelete);
    setDepartments(updated);
    setDeptToDelete(null);
    toast.success(`Department "${deptToDelete}" removed.`);
  };

  const handleSaveOrganization = async () => {
    if (!companyName.trim()) {
      toast.error('Company Name cannot be empty.');
      return;
    }
    if (departments.length === 0) {
      toast.error('At least one department must be defined.');
      return;
    }

    setIsSavingOrg(true);
    try {
      const updated: SystemSettingsData = {
        ...settings,
        organization: {
          companyName: companyName.trim(),
          chapter: chapter.trim(),
          departments,
        },
      };
      setSettings(updated);
      saveSystemSettings(updated);
      toast.success('Settings updated successfully.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update settings.');
    } finally {
      setIsSavingOrg(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
              System Settings & Configurations
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Dynamically manage organization rules, annual leave limits, and shifting holiday calendars (like Ramadan).
            </p>
          </div>
          <span className="self-start md:self-auto shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck size={13} />
            God-Mode Authorized
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 self-start md:self-auto">
          <Lock size={14} className="text-orange-500 shrink-0" />
          <span>Restricted to <strong className="text-gray-800">Super Admins</strong></span>
        </div>
      </div>

      {/* Global Pill Tabs */}
      <div>
        <GlobalPillTabs 
          tabs={SETTINGS_TABS} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />
      </div>

      {/* TAB 1: LEAVE POLICIES */}
      {activeTab === 'leave-policies' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Info Banner */}
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
            <Sliders size={20} className="text-orange-600 shrink-0 mt-0.5" />
            <div className="text-sm text-orange-900">
              <span className="font-semibold">Base Credits & Concurrency Limits:</span> Changes made here apply dynamically to all employee leave calculations, conversion balances, and monthly department concurrency checks across the portal.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Card 1: Annual Leave Credits */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                    <CalendarDays size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Annual Leave Credits</h2>
                    <p className="text-xs text-gray-500">Baseline credit allowance granted to each employee annually.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Vacation Leave (VL)</label>
                      <span className="text-xs text-gray-500">Default: 15 days</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        max="60"
                        value={leavePolicies.vacationCredits}
                        onChange={(e) => setLeavePolicies({ ...leavePolicies, vacationCredits: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-medium text-gray-900"
                      />
                      <span className="absolute right-3 top-2 text-xs text-gray-400">days/year</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Sick Leave (SL)</label>
                      <span className="text-xs text-gray-500">Default: 12 days</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        max="60"
                        value={leavePolicies.sickCredits}
                        onChange={(e) => setLeavePolicies({ ...leavePolicies, sickCredits: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-medium text-gray-900"
                      />
                      <span className="absolute right-3 top-2 text-xs text-gray-400">days/year</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Emergency Leave (EL)</label>
                      <span className="text-xs text-gray-500">Default: 3 days</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        max="30"
                        value={leavePolicies.emergencyCredits}
                        onChange={(e) => setLeavePolicies({ ...leavePolicies, emergencyCredits: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-medium text-gray-900"
                      />
                      <span className="absolute right-3 top-2 text-xs text-gray-400">days/year</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    💡 <strong>Conversion Rule:</strong> If Sick or Emergency leave credits are exhausted, subsequent approved absences automatically deduct from available Vacation balance.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Validation & Concurrency Rules */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Validation & Concurrency Rules</h2>
                    <p className="text-xs text-gray-500">Limits safeguarding operational continuity and coverage.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Max Consecutive Vacation Days</label>
                      <span className="text-xs text-gray-500">Default: 7 days</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number"
                        min="1"
                        max="30"
                        value={leavePolicies.maxConsecutiveVacationDays}
                        onChange={(e) => setLeavePolicies({ ...leavePolicies, maxConsecutiveVacationDays: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-medium text-gray-900"
                      />
                      <span className="absolute right-3 top-2 text-xs text-gray-400">days</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Single vacation applications exceeding this continuous span are prohibited.</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Global Max Staff on Vacation per Month</label>
                      <span className="text-xs text-gray-500">Default: 3 staff</span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number"
                        min="1"
                        max="20"
                        value={leavePolicies.maxStaffOnVacationPerMonth}
                        onChange={(e) => setLeavePolicies({ ...leavePolicies, maxStaffOnVacationPerMonth: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-medium text-gray-900"
                      />
                      <span className="absolute right-3 top-2 text-xs text-gray-400">staff/month</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Total simultaneous personnel allowed on vacation leave during any single calendar month.</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                <button 
                  type="button" 
                  onClick={() => setIsResetLeaveModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  <RotateCcw size={14} />
                  Restore Defaults
                </button>
              </div>
            </div>
          </div>

          {/* Save Action Bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-gray-500 text-center sm:text-left">
              Changes take effect immediately across all pending & future leave applications.
            </span>
            <button
              onClick={handleSaveLeavePolicies}
              disabled={isSavingLeavePolicies}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {isSavingLeavePolicies ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Policies
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: RESTRICTED PERIODS */}
      {activeTab === 'restricted-periods' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Info Banner */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <span className="font-semibold">Blackout Dates & Shifting Calendars:</span> Designate critical windows where vacation leave requests are strictly restricted (e.g. Ramadan, Eid preparations, and Year-End audit). Admins can update shifting lunar calendar dates each year effortlessly.
            </div>
          </div>

          {/* Dynamic List */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Active Restricted Periods</h2>
                <p className="text-xs text-gray-500">Staff will be notified or prevented from submitting vacation leaves falling within these windows.</p>
              </div>
              <button
                type="button"
                onClick={handleAddRestrictedPeriod}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Plus size={16} />
                Add Restricted Period
              </button>
            </div>

            {restrictedPeriods.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Calendar size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium text-gray-600">No restricted blackout periods configured.</p>
                <p className="text-xs text-gray-400 mt-1">Click "+ Add Restricted Period" to create your first date window.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {restrictedPeriods.map((period, index) => {
                  const sDate = period.startDate ? new Date(period.startDate) : null;
                  const eDate = period.endDate ? new Date(period.endDate) : null;
                  let durationDays = 0;
                  if (sDate && eDate && !isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
                    durationDays = Math.max(0, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                  }

                  const now = new Date();
                  const isCurrentlyActive = sDate && eDate && now >= sDate && now <= eDate;

                  return (
                    <div key={period.id} className="p-5 hover:bg-gray-50/70 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Blackout Window
                          </span>
                          {isCurrentlyActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 animate-pulse">
                              ● Currently Active
                            </span>
                          )}
                        </div>

                        {/* Red Trash Icon */}
                        <button
                          type="button"
                          onClick={() => setPeriodToDelete(period.id)}
                          title="Delete restricted period"
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      {/* Row Inputs */}
                      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-4 border rounded-lg">
                        {/* Title */}
                        <div className="w-full md:flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Title / Event Name
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Ramadan 2026, Year-End Planning"
                            value={period.title}
                            onChange={(e) => handleUpdateRestrictedPeriod(period.id, 'title', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none font-medium text-gray-900"
                          />
                        </div>

                        {/* Start Date */}
                        <div className="w-full md:w-48">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Start Date
                          </label>
                          <input
                            type="date"
                            required
                            value={period.startDate}
                            onChange={(e) => handleUpdateRestrictedPeriod(period.id, 'startDate', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-gray-900"
                          />
                        </div>

                        {/* End Date */}
                        <div className="w-full md:w-48">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            End Date
                          </label>
                          <input
                            type="date"
                            required
                            value={period.endDate}
                            onChange={(e) => handleUpdateRestrictedPeriod(period.id, 'endDate', e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-gray-900"
                          />
                        </div>
                      </div>

                      {durationDays > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                          <Clock size={13} className="text-gray-400" />
                          <span>Calculated Span: <strong>{durationDays} days</strong></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Add & Save Bar */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleAddRestrictedPeriod}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus size={16} />
                + Add Restricted Period
              </button>

              <button
                type="button"
                onClick={handleSaveRestrictedPeriods}
                disabled={isSavingRestricted}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {isSavingRestricted ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Restricted Periods
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ORGANIZATION & DEPARTMENTS */}
      {activeTab === 'organization' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Card: Identity */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Organization Identity</h2>
                <p className="text-xs text-gray-500">Global constants displayed in page headers, reports, and official certificates.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company / Center Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-medium text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chapter / Division</label>
                <input
                  type="text"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-medium text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Card: Departments Management */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <Tag size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Departments & Divisions</h2>
                <p className="text-xs text-gray-500">
                  Manage the DEPARTMENTS array dynamically. New departments are immediately selectable across the entire HRMS.
                </p>
              </div>
            </div>

            {/* Current Departments Chips */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                Current Departments ({departments.length})
              </label>
              <div className="flex flex-wrap items-center gap-2.5 p-4 bg-gray-50 border border-gray-200 rounded-xl min-h-[64px]">
                {departments.map((dept) => (
                  <div
                    key={dept}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-gray-300 hover:border-orange-300 text-gray-800 text-sm font-medium rounded-full shadow-2xs transition-all group"
                  >
                    <span>{dept}</span>
                    <button
                      type="button"
                      onClick={() => setDeptToDelete(dept)}
                      title={`Remove department "${dept}"`}
                      className="text-gray-400 hover:text-red-600 rounded-full p-0.5 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Click the <strong>[x]</strong> on any tag to remove the department.
              </p>
            </div>

            {/* Add Department Input Field */}
            <form onSubmit={handleAddDepartment} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Enter new department name (e.g., Da'wah, Multimedia, Youth)..."
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none text-gray-900 shadow-2xs"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
              >
                <Plus size={16} />
                Add Department
              </button>
            </form>
          </div>

          {/* Save Action Bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-gray-500 text-center sm:text-left">
              Department updates will reflect instantly in Operations, Staff Onboarding, and Filtering.
            </span>
            <button
              onClick={handleSaveOrganization}
              disabled={isSavingOrg}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {isSavingOrg ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Organization Settings
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modals for Destructive Settings Actions */}
      <DeleteConfirmationModal
        isOpen={isResetLeaveModalOpen}
        onClose={() => setIsResetLeaveModalOpen(false)}
        onConfirm={handleConfirmResetLeavePolicies}
        title="Restore Default Leave Policies"
        message="Are you sure you want to restore all leave policies and concurrency limits to standard system defaults? Any custom limits will be overwritten."
        confirmText="Restore Defaults"
      />

      <DeleteConfirmationModal
        isOpen={periodToDelete !== null}
        onClose={() => setPeriodToDelete(null)}
        onConfirm={confirmDeleteRestrictedPeriod}
        title="Delete Restricted Period"
        message="Are you sure you want to remove this restricted period? Staff will be allowed to submit leave requests during this window."
        confirmText="Delete Period"
      />

      <DeleteConfirmationModal
        isOpen={deptToDelete !== null}
        onClose={() => setDeptToDelete(null)}
        onConfirm={confirmDeleteDepartment}
        title="Remove Department"
        message={`Are you sure you want to remove the "${deptToDelete}" department? Staff assigned to this department should be reassigned.`}
        confirmText="Remove Department"
      />
    </div>
  );
}
