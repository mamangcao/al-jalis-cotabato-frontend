import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';
import { Plus, X, Eye, CheckCircle2, XCircle, Edit2, Trash2, Lock, AlertTriangle, FileCheck2, ChevronDown, ChevronUp, Info, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { getSystemSettings, isDateInRestrictedPeriod } from '../utils/systemSettings';
import { api } from '../services/api';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const calculateDays = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return 0;
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (e < s) return 0;
  const daysRequested = Math.round((new Date(endDate).setHours(0,0,0,0) - new Date(startDate).setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)) + 1;
  return daysRequested;
};

export default function LeaveManagement({ leaves, setLeaves }: { leaves: any[], setLeaves: (v: any) => void }) {
  const { currentUser } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [reviewingLeave, setReviewingLeave] = useState<any>(null);
  const [remarks, setRemarks] = useState('');
  const [leaveToDelete, setLeaveToDelete] = useState<string | null>(null);
  const [isDeletingLeave, setIsDeletingLeave] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  const isAdmin = currentUser.role.startsWith('admin');
  const isFinanceAdmin = currentUser.role === 'admin_finance';
  const isDirectorAdmin = currentUser.role === 'admin_director';

  const [formData, setFormData] = useState({
    employeeName: currentUser.name || '',
    idNo: '',
    position: '',
    contactNo: '',
    mailingAddress: '',
    startDate: '',
    returnDate: '',
    leaveType: 'Vacation Leave',
    emergencyReason: '',
    reason: '',
    hasPendingTasks: 'No',
    delegatedTo: '',
    delegationAttested: false,
    attestation: false
  });

  const visibleLeaves = isAdmin
    ? leaves
    : leaves.filter(l => l.employeeId === currentUser.id);

  const [sysSettings, setSysSettings] = useState(() => getSystemSettings());

  useEffect(() => {
    const handleSync = () => setSysSettings(getSystemSettings());
    window.addEventListener('system-settings-updated', handleSync);
    return () => window.removeEventListener('system-settings-updated', handleSync);
  }, []);

  // Calculate balances based on all fully approved leaves
  const myLeaves = leaves.filter(l => l.employeeId === currentUser.id);
  
  let usedVacation = 0;
  let usedSick = 0;
  let usedEmergency = 0;

  myLeaves.forEach((l: any) => {
    if (l.approval?.finance === 'Approved' && l.approval?.director === 'Approved') {
      const days = calculateDays(l.startDate, l.returnDate);
      if (l.leaveType === 'Vacation Leave') usedVacation += days;
      if (l.leaveType === 'Sick Leave') usedSick += days;
      if (l.leaveType === 'Emergency Leave') usedEmergency += days;
    }
  });

  // Apply Leave Conversion Rule: Excess Sick/Emergency deducts from Vacation
  const maxSickCredits = sysSettings.leavePolicies.sickCredits;
  const maxEmergencyCredits = sysSettings.leavePolicies.emergencyCredits;
  const maxVacationCredits = sysSettings.leavePolicies.vacationCredits;
  const maxConsecutiveDays = sysSettings.leavePolicies.maxConsecutiveVacationDays;
  const maxStaffPerMonth = sysSettings.leavePolicies.maxStaffOnVacationPerMonth;

  const excessSick = Math.max(0, usedSick - maxSickCredits);
  const excessEmergency = Math.max(0, usedEmergency - maxEmergencyCredits);

  const remSick = Math.max(0, maxSickCredits - usedSick);
  const remEmergency = Math.max(0, maxEmergencyCredits - usedEmergency);
  const remVacation = maxVacationCredits - usedVacation - excessSick - excessEmergency;

  const currentDuration = calculateDays(formData.startDate, formData.returnDate);
  const formStartDate = formData.startDate ? new Date(formData.startDate) : null;

  // Rule: Restricted Periods / Blackout Dates (e.g. Ramadan, Year-End)
  const restrictedConflict = (formData.leaveType === 'Vacation Leave' && formData.startDate && formData.returnDate)
    ? isDateInRestrictedPeriod(formData.startDate, formData.returnDate)
    : null;

  // Rule: Two-Week Notice for Vacation
  let isNoticeInvalid = false;
  if (formData.leaveType === 'Vacation Leave' && formStartDate) {
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const startD = new Date(formData.startDate);
    startD.setHours(0,0,0,0);
    const noticeDays = Math.round((startD.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
    if (noticeDays < 14) {
      isNoticeInvalid = true;
    }
  }

  // Rule: Quarterly Restriction for Vacation
  let isQuarterLimitExceeded = false;
  if (formData.leaveType === 'Vacation Leave' && formStartDate) {
    const formQuarter = Math.floor(formStartDate.getMonth() / 3) + 1;
    const formYear = formStartDate.getFullYear();
    isQuarterLimitExceeded = myLeaves.some((l: any) => {
      if (l.leaveType === 'Vacation Leave' && l.approval?.finance === 'Approved' && l.approval?.director === 'Approved' && l.id !== editingLeaveId) {
        const lDate = new Date(l.startDate);
        return (Math.floor(lDate.getMonth() / 3) + 1) === formQuarter && lDate.getFullYear() === formYear;
      }
      return false;
    });
  }

  // Rule: Concurrency Restriction for Vacation (Max staff per month)
  let isMaxStaffReached = false;
  if (formData.leaveType === 'Vacation Leave' && formStartDate) {
    const formMonth = formStartDate.getMonth();
    const formYear = formStartDate.getFullYear();

    const approvedVacationsThisMonth = leaves.filter((l: any) => {
       if (l.leaveType === 'Vacation Leave' && l.approval?.finance === 'Approved' && l.approval?.director === 'Approved' && l.id !== editingLeaveId) {
          const lDate = new Date(l.startDate);
          return lDate.getMonth() === formMonth && lDate.getFullYear() === formYear;
       }
       return false;
    });

    const uniqueStaff = new Set(approvedVacationsThisMonth.map((l: any) => l.employeeId));
    uniqueStaff.delete(currentUser.id); // don't count the current user against the limit of other staff
    if (uniqueStaff.size >= maxStaffPerMonth) {
       isMaxStaffReached = true;
    }
  }

  const isVacationLimitExceeded = formData.leaveType === 'Vacation Leave' && currentDuration > maxConsecutiveDays;
  const isSubmitDisabled = isVacationLimitExceeded || !formData.attestation || 
                           (formData.leaveType === 'Emergency Leave' && !formData.emergencyReason) ||
                           isNoticeInvalid || isQuarterLimitExceeded || isMaxStaffReached ||
                           Boolean(restrictedConflict) ||
                           (!formData.startDate || !formData.returnDate);

  const resetForm = () => {
    setFormData({
      employeeName: currentUser.name || '',
      idNo: '', position: '', contactNo: '', mailingAddress: '',
      startDate: '', returnDate: '', leaveType: remVacation > 0 ? 'Vacation Leave' : (remSick > 0 ? 'Sick Leave' : 'Emergency Leave'), emergencyReason: '', reason: '', attestation: false,
      hasPendingTasks: 'No', delegatedTo: '', delegationAttested: false
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (restrictedConflict) {
      toast.error(`Leave denied: dates fall within Restricted Period (${restrictedConflict.title}).`);
      return;
    }
    if (isMaxStaffReached) {
      toast.error(`Maximum of ${maxStaffPerMonth} staff members allowed for vacation leave this month.`);
      return;
    }
    if (isSubmitDisabled) return;

    setIsSubmitting(true);
    if (editingLeaveId) {
      try {
        const updated = await api.leaves.update(editingLeaveId, formData);
        setLeaves(leaves.map(l => l.id === editingLeaveId ? { ...l, ...updated } : l));
        toast.success('Leave request updated successfully.');
        setIsFormOpen(false);
        setEditingLeaveId(null);
        resetForm();
      } catch (err: any) {
        toast.error(err.message || 'Unable to update leave request. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const newLeaveData = {
        employeeId: currentUser.id,
        department: currentUser.department,
        dateFiled: new Date().toISOString().split('T')[0],
        approval: { finance: 'Pending', director: 'Pending' },
        remarks: '',
        ...formData
      };
      try {
        const created = await api.leaves.create(newLeaveData);
        setLeaves([created, ...leaves]);
        toast.success('Leave request submitted successfully.');
        setIsFormOpen(false);
        setEditingLeaveId(null);
        resetForm();
      } catch (err: any) {
        toast.error(err.message || 'Unable to submit leave request. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleEdit = (leave: any) => {
    setEditingLeaveId(leave.id);
    setFormData({
      employeeName: leave.employeeName,
      idNo: leave.idNo,
      position: leave.position,
      contactNo: leave.contactNo,
      mailingAddress: leave.mailingAddress,
      startDate: leave.startDate,
      returnDate: leave.returnDate,
      leaveType: leave.leaveType,
      emergencyReason: leave.emergencyReason || '',
      reason: leave.reason || '',
      attestation: leave.attestation || false,
      hasPendingTasks: leave.hasPendingTasks || 'No',
      delegatedTo: leave.delegatedTo || '',
      delegationAttested: leave.delegationAttested || false
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setLeaveToDelete(id);
  };

  const confirmDeleteLeave = async () => {
    if (!leaveToDelete) return;
    setIsDeletingLeave(true);
    try {
      await api.leaves.delete(leaveToDelete);
      setLeaves(leaves.filter(l => l.id !== leaveToDelete));
      toast.success('Leave request deleted successfully.');
      setLeaveToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Unable to delete leave request. Please try again.');
    } finally {
      setIsDeletingLeave(false);
    }
  };

  const handleFinanceAction = async (status: string) => {
    if (status === 'Rejected' && !remarks.trim()) {
      toast.error('Please provide remarks/reason for rejection.');
      return;
    }
    setIsReviewing(true);
    const updatedApproval = { ...reviewingLeave.approval, finance: status };
    const updatedRemarks = status === 'Rejected' ? remarks : reviewingLeave.remarks;
    try {
      await api.leaves.update(reviewingLeave.id, { approval: updatedApproval, remarks: updatedRemarks });
      setLeaves(leaves.map(l => l.id === reviewingLeave.id ? { 
        ...l, 
        approval: updatedApproval,
        remarks: updatedRemarks
      } : l));
      toast.success(status === 'Approved' ? 'Leave request approved.' : 'Leave request rejected.');
      setReviewingLeave(null);
      setRemarks('');
    } catch (err: any) {
      toast.error(err.message || 'Unable to update leave request.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleDirectorAction = async (status: string) => {
    if (status === 'Rejected' && !remarks.trim()) {
      toast.error('Please provide remarks/reason for rejection.');
      return;
    }
    setIsReviewing(true);
    const updatedApproval = { ...reviewingLeave.approval, director: status };
    const updatedRemarks = remarks ? remarks : reviewingLeave.remarks;
    try {
      await api.leaves.update(reviewingLeave.id, { approval: updatedApproval, remarks: updatedRemarks });
      setLeaves(leaves.map(l => l.id === reviewingLeave.id ? { 
        ...l, 
        approval: updatedApproval,
        remarks: updatedRemarks
      } : l));
      toast.success(status === 'Approved' ? 'Leave request approved.' : 'Leave request rejected.');
      setReviewingLeave(null);
      setRemarks('');
    } catch (err: any) {
      toast.error(err.message || 'Unable to update leave request.');
    } finally {
      setIsReviewing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Approved') return <span className="text-emerald-600 font-medium">✅ Approved</span>;
    if (status === 'Rejected') return <span className="text-rose-600 font-medium">❌ Rejected</span>;
    return <span className="text-yellow-600 font-medium">⏳ Pending</span>;
  };

  const isFullyPending = (leave: any) => leave.approval?.finance === 'Pending' && leave.approval?.director === 'Pending';

  const openNewForm = () => {
    setEditingLeaveId(null);
    setFormData({
        employeeName: currentUser.name || '',
        idNo: '', position: '', contactNo: '', mailingAddress: '',
        startDate: '', returnDate: '', 
        leaveType: remVacation > 0 ? 'Vacation Leave' : (remSick > 0 ? 'Sick Leave' : 'Emergency Leave'), 
        emergencyReason: '', reason: '', attestation: false,
        hasPendingTasks: 'No', delegatedTo: '', delegationAttested: false
    });
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isAdmin ? 'Leave Management' : 'My Leave Requests'}
          </h1>
          <p className="text-sm text-gray-500">
            {isAdmin ? 'Review and manage staff leave of absence requests.' : 'Submit and track your leave of absence requests.'}
          </p>
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors shrink-0"
        >
          <Plus size={16} />
          File Leave of Absence
        </button>
      </div>

      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 border-t-4 border-t-blue-500 flex flex-col justify-between">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Vacation Leave</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{remVacation}</span>
              <span className="text-sm font-medium text-gray-500">/ {maxVacationCredits} Days</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 border-t-4 border-t-emerald-500 flex flex-col justify-between">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Sick Leave</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{remSick}</span>
              <span className="text-sm font-medium text-gray-500">/ {maxSickCredits} Days</span>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 border-t-4 border-t-rose-500 flex flex-col justify-between">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Emergency Leave</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{remEmergency}</span>
              <span className="text-sm font-medium text-gray-500">/ {maxEmergencyCredits} Days</span>
            </div>
          </div>
        </div>
      )}

      {/* Policy Accordion */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <button 
          onClick={() => setIsPolicyOpen(!isPolicyOpen)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        >
          <div className="flex items-center gap-2">
            <Info size={18} className="text-blue-600" />
            <span className="font-semibold text-gray-900 text-sm">View Leave Policy Guidelines & Restrictions</span>
          </div>
          {isPolicyOpen ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
        </button>
        {isPolicyOpen && (
          <div className="p-5 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-bold text-gray-900 text-sm mb-2 border-b border-gray-100 pb-1">Vacation Leave</h4>
                <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4">
                  <li>Max 7 consecutive days.</li>
                  <li>Requires 14 days notice.</li>
                  <li>Max 3 staff per month (non-overlapping).</li>
                  <li>Cannot be filed in back-to-back quarters.</li>
                  <li>Banned during Ramadan and first two weeks of December.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm mb-2 border-b border-gray-100 pb-1">Sick / Emergency Leave</h4>
                <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4">
                  <li>Sick leave must be filed promptly.</li>
                  <li>Emergency leave requires proof upon return.</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm mb-2 border-b border-gray-100 pb-1">Clearance Requirement</h4>
                <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-4">
                  <li>All leaves require task clearance and proper turnover before commencement.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-6 py-3 font-medium">Date Filed</th>
                {isAdmin && <th className="px-6 py-3 font-medium">Employee</th>}
                {isAdmin && <th className="px-6 py-3 font-medium">Department</th>}
                <th className="px-6 py-3 font-medium">Leave Dates</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visibleLeaves.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 5} className="px-6 py-8 text-center text-gray-500">
                    No leave requests found.
                  </td>
                </tr>
              ) : (
                visibleLeaves.map((leave: any) => (
                  <tr key={leave.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{leave.dateFiled}</td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{leave.employeeName}</td>
                    )}
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs">{leave.department || 'N/A'}</span>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {leave.startDate} to {leave.returnDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{leave.leaveType}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 text-xs bg-gray-50 border border-gray-100 rounded-md p-2 w-max">
                        <div className="flex items-center justify-between gap-3"><span className="text-gray-500">Finance:</span> {getStatusIcon(leave.approval?.finance || 'Pending')}</div>
                        <div className="flex items-center justify-between gap-3"><span className="text-gray-500">Director:</span> {getStatusIcon(leave.approval?.director || 'Pending')}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isAdmin ? (
                        <button
                          onClick={() => {
                            setReviewingLeave(leave);
                            setRemarks(leave.remarks || '');
                          }}
                          className="text-orange-600 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-md transition-colors inline-flex items-center gap-1"
                        >
                          <Eye size={14} /> Review
                        </button>
                      ) : (
                        isFullyPending(leave) ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEdit(leave)} className="text-gray-400 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 px-2.5 py-1.5 rounded-md transition-colors" title="Edit Request">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDelete(leave.id)} className="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 px-2.5 py-1.5 rounded-md transition-colors" title="Delete Request">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end text-gray-400 gap-1.5 px-2 py-1">
                            <Lock size={14} /> <span className="text-xs font-medium">Locked</span>
                          </div>
                        )
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && createPortal(
        <div className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-gray-200 shrink-0 bg-gray-50 flex justify-between items-center rounded-t-xl">
                <h2 className="text-lg font-bold text-gray-900">{editingLeaveId ? 'Edit Leave Request' : 'Leave of Absence Request Form'}</h2>
                <button onClick={() => { setIsFormOpen(false); setEditingLeaveId(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col min-h-0 overflow-hidden">\n                <div className="p-6 flex-1 overflow-y-auto space-y-4">
                  
                  <div className="mb-6 p-4 bg-amber-50 text-amber-800 text-sm rounded-lg border border-amber-200 flex items-start gap-3">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <div>
                      <strong>Important Notice:</strong> Vacation leave is not permitted during designated Restricted Periods
                      {sysSettings.restrictedPeriods.length > 0 && (
                        <span>: {sysSettings.restrictedPeriods.map(p => `${p.title} (${p.startDate} to ${p.endDate})`).join(', ')}.</span>
                      )}
                    </div>
                  </div>
                  
                  {formData.leaveType === 'Vacation Leave' && (
                    <div className="mb-6 p-3 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100">
                      Reminder: Must be filed 2 weeks in advance. Max {maxConsecutiveDays} consecutive days. Max {maxStaffPerMonth} staff per month. Ensure task clearance is attached.
                    </div>
                  )}
                  {formData.leaveType === 'Sick Leave' && (
                    <div className="mb-6 p-3 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100">
                      Reminder: Please submit promptly. Vacation credits will be used if Sick credits are exhausted.
                    </div>
                  )}
                  {formData.leaveType === 'Emergency Leave' && (
                    <div className="mb-6 p-3 bg-blue-50 text-blue-700 text-xs rounded-md border border-blue-100">
                      Reminder: You must provide necessary proof of your absence upon your return date to avoid being marked as unexcused.
                    </div>
                  )}

                  <div className="space-y-6">
                      <div>
                          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide border-b border-gray-100 pb-2">General Information</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee's Name</label>
                                  <input required type="text" value={formData.employeeName} onChange={e => setFormData(prev => ({...prev, employeeName: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">ID No.</label>
                                  <input required type="text" value={formData.idNo} onChange={e => setFormData(prev => ({...prev, idNo: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                                  <input required type="text" value={formData.position} onChange={e => setFormData(prev => ({...prev, position: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact No.</label>
                                  <input required type="text" value={formData.contactNo} onChange={e => setFormData(prev => ({...prev, contactNo: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                              </div>
                              <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Mailing Address</label>
                                  <input required type="text" value={formData.mailingAddress} onChange={e => setFormData(prev => ({...prev, mailingAddress: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                              </div>
                          </div>
                      </div>
                      <div>
                          <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide border-b border-gray-100 pb-2">Leave Details</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave starts on</label>
                                  <input required type="date" value={formData.startDate} onChange={e => setFormData(prev => ({...prev, startDate: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected return date</label>
                                  <input required type="date" value={formData.returnDate} onChange={e => setFormData(prev => ({...prev, returnDate: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
                              </div>
                              
                              <div className={formData.leaveType === 'Emergency Leave' ? "md:col-span-1" : "md:col-span-2"}>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Type of Leave</label>
                                  <select required value={formData.leaveType} onChange={e => setFormData(prev => ({...prev, leaveType: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white text-sm">
                                      <option value="Vacation Leave" disabled={remVacation <= 0}>Vacation Leave ({remVacation} Days Remaining)</option>
                                      <option value="Sick Leave" disabled={remSick <= 0 && remVacation <= 0}>Sick Leave ({remSick} Days Remaining)</option>
                                      <option value="Emergency Leave" disabled={remEmergency <= 0 && remVacation <= 0}>Emergency Leave ({remEmergency} Days Remaining)</option>
                                  </select>
                              </div>

                              {formData.leaveType === 'Emergency Leave' && (
                                <div className="md:col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Reason <span className="text-rose-500">*</span></label>
                                    <select required value={formData.emergencyReason} onChange={e => setFormData(prev => ({...prev, emergencyReason: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white text-sm">
                                        <option value="" disabled>Select reason...</option>
                                        <option value="Hospital Emergency">Hospital Emergency</option>
                                        <option value="Severe Health Condition">Severe Health Condition</option>
                                        <option value="Natural Disasters">Natural Disasters</option>
                                        <option value="Accidents">Accidents</option>
                                        <option value="Death of Immediate Family Member">Death of Immediate Family Member</option>
                                        <option value="Childbirth">Childbirth</option>
                                        <option value="Legal Obligations">Legal Obligations</option>
                                        <option value="Transportation Issues">Transportation Issues</option>
                                    </select>
                                </div>
                              )}

                              <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Explanation (Optional)</label>
                                  <textarea rows={3} value={formData.reason} onChange={e => setFormData(prev => ({...prev, reason: e.target.value}))} className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Provide additional details regarding your leave..."></textarea>
                              </div>
                              
                              {((formData.leaveType === 'Sick Leave' && remSick <= 0) || (formData.leaveType === 'Emergency Leave' && remEmergency <= 0)) && remVacation > 0 && (
                                <div className="md:col-span-2 text-amber-700 text-sm font-medium flex items-center gap-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                  <AlertTriangle size={16} className="shrink-0" /> {formData.leaveType.split(' ')[0]} balance is 0. This will be deducted from your Vacation Leave credits.
                                </div>
                              )}

                              {restrictedConflict && (
                                <div className="md:col-span-2 text-rose-700 text-sm font-medium flex items-center gap-2 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                                  <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                                  <span>Selected dates fall within a Restricted Period: <strong>&quot;{restrictedConflict.title}&quot;</strong>. Vacation leaves during this period are banned.</span>
                                </div>
                              )}

                              {isVacationLimitExceeded && (
                                <div className="md:col-span-2 text-rose-600 text-sm font-medium flex items-center gap-2 bg-rose-50 p-2 rounded-lg border border-rose-200">
                                  <AlertTriangle size={16} className="shrink-0" /> Vacation leave is limited to a maximum of {maxConsecutiveDays} consecutive days at a time. ({currentDuration} days selected)
                                </div>
                              )}

                              {isNoticeInvalid && (
                                <div className="md:col-span-2 text-rose-600 text-sm font-medium flex items-center gap-2 bg-rose-50 p-2 rounded-lg border border-rose-200">
                                  <AlertTriangle size={16} className="shrink-0" /> Vacation leave requires at least two weeks prior notice.
                                </div>
                              )}

                              {isQuarterLimitExceeded && (
                                <div className="md:col-span-2 text-rose-600 text-sm font-medium flex items-center gap-2 bg-rose-50 p-2 rounded-lg border border-rose-200">
                                  <AlertTriangle size={16} className="shrink-0" /> You already have an approved vacation leave in this quarter.
                                </div>
                              )}

                              {isMaxStaffReached && (
                                <div className="md:col-span-2 text-rose-600 text-sm font-medium flex items-center gap-2 bg-rose-50 p-2 rounded-lg border border-rose-200">
                                  <AlertTriangle size={16} className="shrink-0" /> Maximum of {maxStaffPerMonth} staff members allowed for vacation leave this month.
                                </div>
                              )}
                          </div>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wide border-b border-gray-100 pb-2">Program / Task Clearance</h3>
                        
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Do you have pending programs/tasks requiring delegation?</label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="hasPendingTasks" 
                                value="Yes" 
                                checked={formData.hasPendingTasks === 'Yes'}
                                onChange={(e) => setFormData(prev => ({...prev, hasPendingTasks: e.target.value}))}
                                className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                              />
                              <span className="text-sm text-gray-700">Yes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="radio" 
                                name="hasPendingTasks" 
                                value="No" 
                                checked={formData.hasPendingTasks === 'No'}
                                onChange={(e) => setFormData(prev => ({...prev, hasPendingTasks: e.target.value}))}
                                className="w-4 h-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                              />
                              <span className="text-sm text-gray-700">No</span>
                            </label>
                          </div>
                        </div>

                        {formData.hasPendingTasks === 'Yes' && (
                          <div className="space-y-4 p-4 border border-orange-200 rounded-lg bg-orange-50 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Name of Colleague Accepting Tasks</label>
                              <input 
                                type="text" 
                                required
                                value={formData.delegatedTo}
                                onChange={(e) => setFormData(prev => ({...prev, delegatedTo: e.target.value}))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" 
                                placeholder="Enter colleague's full name"
                              />
                            </div>
                            <label className="flex items-start gap-3 cursor-pointer">
                              <input 
                                type="checkbox" 
                                required
                                checked={formData.delegationAttested}
                                onChange={(e) => setFormData(prev => ({...prev, delegationAttested: e.target.checked}))}
                                className="mt-1 w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                              />
                              <span className="text-sm text-gray-700 font-medium">
                                I attest that I have submitted a signed Clearance of Tasks Form and my Department Head has approved this delegation.
                              </span>
                            </label>
                          </div>
                        )}

                        <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50 cursor-pointer transition-colors hover:bg-gray-100">
                          <input 
                            type="checkbox" 
                            required 
                            checked={formData.attestation} 
                            onChange={(e) => setFormData(prev => ({...prev, attestation: e.target.checked}))}
                            className="mt-1 w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                          />
                          <span className="text-sm text-gray-700">
                            I confirm I have secured Program/Task Clearance, completed proper turnover of duties, and my Department Head has approved the delegation (if applicable).
                          </span>
                        </label>
                      </div>

                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0 flex justify-end gap-3 rounded-b-xl">
                      <button 
                        type="button" 
                        onClick={() => { setIsFormOpen(false); setEditingLeaveId(null); }} 
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={isSubmitDisabled || isSubmitting}
                        className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                          isSubmitDisabled || isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 shadow-sm'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>{editingLeaveId ? 'Updating...' : 'Submitting...'}</span>
                          </>
                        ) : (
                          <span>{editingLeaveId ? 'Update Request' : 'Submit Request'}</span>
                        )}
                      </button>
                  </div>
              </form>
          </div>
        </div>,
        document.body
      )}

      {reviewingLeave && createPortal(
        <div className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-gray-200 shrink-0 bg-gray-50 flex justify-between items-start rounded-t-xl">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Leave Request Details</h2>
                  <p className="text-sm text-gray-500 mt-1">{reviewingLeave.employeeName} | {reviewingLeave.idNo} | {reviewingLeave.department || 'N/A'}</p>
                </div>
                <button onClick={() => setReviewingLeave(null)} className="text-gray-400 hover:text-gray-600 transition-colors mt-1">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="block text-gray-500 mb-1">Position</span><span className="font-medium text-gray-900">{reviewingLeave.position}</span></div>
                      <div><span className="block text-gray-500 mb-1">Leave Type</span><span className="font-medium text-gray-900">{reviewingLeave.leaveType}</span></div>
                      {reviewingLeave.leaveType === 'Emergency Leave' && reviewingLeave.emergencyReason && (
                        <div className="col-span-2"><span className="block text-gray-500 mb-1">Emergency Condition</span><span className="font-medium text-gray-900">{reviewingLeave.emergencyReason}</span></div>
                      )}
                      <div><span className="block text-gray-500 mb-1">Start Date</span><span className="font-medium text-gray-900">{reviewingLeave.startDate}</span></div>
                      <div><span className="block text-gray-500 mb-1">Return Date</span><span className="font-medium text-gray-900">{reviewingLeave.returnDate}</span></div>
                      {reviewingLeave.reason && (
                        <div className="col-span-2">
                          <span className="block text-gray-500 mb-1">Reason / Explanation</span>
                          <span className="font-medium text-gray-900 p-3 bg-gray-50 rounded-lg border border-gray-100 block">{reviewingLeave.reason}</span>
                        </div>
                      )}
                  </div>

                  <div className="flex flex-col gap-2 text-sm bg-gray-50 border border-gray-100 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-1 border-b border-gray-200 pb-2">Approval Status</h4>
                    <div className="flex items-center justify-between"><span className="text-gray-500">Finance Validator:</span> {getStatusIcon(reviewingLeave.approval?.finance || 'Pending')}</div>
                    <div className="flex items-center justify-between"><span className="text-gray-500">Director Approval:</span> {getStatusIcon(reviewingLeave.approval?.director || 'Pending')}</div>
                  </div>
                  
                  {isFullyPending(reviewingLeave) || (isDirectorAdmin && reviewingLeave.approval?.director === 'Pending') ? (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (Optional)</label>
                        <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Add comments for the employee..."></textarea>
                    </div>
                  ) : (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Latest Remarks</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-200">{reviewingLeave.remarks || 'No remarks provided.'}</p>
                    </div>
                  )}
                  
              </div>
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 shrink-0 flex justify-end gap-3 rounded-b-xl">
                      <button 
                        type="button" 
                        onClick={() => setReviewingLeave(null)} 
                        disabled={isReviewing}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                      >
                        Close
                      </button>
                      
                      {isFinanceAdmin && reviewingLeave.approval?.finance === 'Pending' && (
                        <>
                          <button 
                            type="button"
                            onClick={() => handleFinanceAction('Rejected')} 
                            disabled={isReviewing}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 border border-transparent rounded-lg hover:bg-rose-700 shadow-sm cursor-pointer disabled:opacity-60"
                          >
                            {isReviewing ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16}/>}
                            Reject
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleFinanceAction('Approved')} 
                            disabled={isReviewing}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 shadow-sm cursor-pointer disabled:opacity-60"
                          >
                            {isReviewing ? <Loader2 size={16} className="animate-spin" /> : <FileCheck2 size={16}/>}
                            Validate
                          </button>
                        </>
                      )}
                      
                      {isDirectorAdmin && reviewingLeave.approval?.director === 'Pending' && (
                        <>
                          <button 
                            type="button"
                            onClick={() => handleDirectorAction('Rejected')} 
                            disabled={reviewingLeave.approval?.finance !== 'Approved' || isReviewing}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg shadow-sm cursor-pointer ${reviewingLeave.approval?.finance !== 'Approved' || isReviewing ? 'bg-gray-400 cursor-not-allowed opacity-60' : 'bg-rose-600 hover:bg-rose-700'}`}
                            title={reviewingLeave.approval?.finance !== 'Approved' ? "Waiting for Finance Validation" : ""}
                          >
                            {isReviewing ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16}/>}
                            Reject
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDirectorAction('Approved')} 
                            disabled={reviewingLeave.approval?.finance !== 'Approved' || isReviewing}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg shadow-sm cursor-pointer ${reviewingLeave.approval?.finance !== 'Approved' || isReviewing ? 'bg-gray-400 cursor-not-allowed opacity-60' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                            title={reviewingLeave.approval?.finance !== 'Approved' ? "Waiting for Finance Validation" : ""}
                          >
                            {isReviewing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16}/>}
                            Final Approve
                          </button>
                        </>
                      )}
                  </div>
          </div>
        </div>,
        document.body
      )}

      <DeleteConfirmationModal
        isOpen={!!leaveToDelete}
        onClose={() => setLeaveToDelete(null)}
        onConfirm={confirmDeleteLeave}
        title="Delete Leave Request?"
        message="Are you sure you want to delete this leave request? This action cannot be undone."
        isDeleting={isDeletingLeave}
      />
    </div>
  );
}
