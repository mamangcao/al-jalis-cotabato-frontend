import React, { useState, useEffect } from 'react';
import { UserPlus, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

interface ProvisionUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DEPARTMENTS = [
  'Admin',
  'Academics',
  'New Muslim Department',
  "Da'wah Department",
  'Multimedia',
  'Utility & Maintenance',
  "Women's Department",
];

const ROLES = [
  { value: 'staff', label: 'Staff Member' },
  { value: 'department_head', label: 'Department Head' },
  { value: 'department_secretary', label: 'Department Secretary' },
  { value: 'department_staff', label: 'Department Staff' },
  { value: 'executive_secretary', label: 'Executive Secretary' },
  { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'director', label: 'Center Director (Unique)' },
  { value: 'evaluation_only', label: 'Evaluation Only' },
];

export default function ProvisionUserModal({ isOpen, onClose, onSuccess }: ProvisionUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [provisionMode, setProvisionMode] = useState<'link' | 'manual'>('link');
  const [staffId, setStaffId] = useState('');
  const [department, setDepartment] = useState('Admin');
  const [jobTitle, setJobTitle] = useState('');
  const [role, setRole] = useState('staff');
  const [accountType, setAccountType] = useState<'standard' | 'evaluation_only'>('standard');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedStaffProfileId, setSelectedStaffProfileId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      setName('');
      setEmail('');
      setJobTitle('');
      setRole('staff');
      setDepartment('Admin');
      setAccountType('standard');
      setProvisionMode('link');
      setStaffId('');
      setSelectedStaffProfileId('');
      
      api.personnel.getStaff().then((res: any) => {
        const data = res?.data ?? (Array.isArray(res) ? res : []);
        setStaffList(data);
      }).catch(() => {
        toast.error('Failed to load staff list');
      });
    }
  }, [isOpen]);

  const handleStaffSelect = (profileId: string) => {
    setSelectedStaffProfileId(profileId);
    const staff = staffList.find(s => s.id.toString() === profileId);
    if (staff) {
      setName(staff.name);
      setDepartment(staff.department);
      setStaffId(staff.staff_id);
      setJobTitle(staff.job_title || '');
    } else {
      setName('');
      setDepartment('Admin');
      setStaffId('');
      setJobTitle('');
    }
  };

  // Sync account type if evaluation_only role selected
  const handleRoleChange = (selectedRole: string) => {
    setRole(selectedRole);
    if (selectedRole === 'evaluation_only') {
      setAccountType('evaluation_only');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (provisionMode === 'manual' && !staffId) {
      setError('Staff ID is required.');
      return;
    }
    if (provisionMode === 'link' && !selectedStaffProfileId) {
      setError('Please select a staff member.');
      return;
    }

    setIsLoading(true);

    try {
      await api.users.create({
        name: name.trim(),
        email: email.trim(),
        staff_id: staffId.trim() || undefined,
        staff_profile_id: provisionMode === 'link' ? parseInt(selectedStaffProfileId) : undefined,
        department,
        job_title: jobTitle.trim() || undefined,
        role,
        account_type: accountType,
      });

      toast.success(`Account for ${name} provisioned successfully!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Failed to provision account. Please check input values.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Provision User Account</h2>
              <p className="text-xs text-gray-500">Internal HR account provisioning</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 text-xs flex items-start gap-2.5">
          <ShieldCheck size={16} className="shrink-0 mt-0.5 text-blue-600" />
          <span>
            Initial password will automatically be set to the Staff ID. The user will be required to change it upon first login.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
            <button
              type="button"
              onClick={() => setProvisionMode('link')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                provisionMode === 'link' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Link Existing Staff
            </button>
            <button
              type="button"
              onClick={() => setProvisionMode('manual')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                provisionMode === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Non-Staff Account
            </button>
          </div>

          {provisionMode === 'link' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Select Staff Member *
              </label>
              <select
                required
                value={selectedStaffProfileId}
                onChange={(e) => handleStaffSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
              >
                <option value="">-- Select Staff --</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.staff_id} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={provisionMode === 'link'}
              placeholder="e.g. Zayd Al-Ansari"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. zayd@aljalis.org"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              {provisionMode === 'link' ? 'Staff ID' : 'Account ID / Staff ID *'}
            </label>
            <input
              type="text"
              required={provisionMode === 'manual'}
              value={staffId}
              onChange={(e) => setStaffId(e.target.value.toUpperCase())}
              disabled={provisionMode === 'link'}
              placeholder="e.g. ADMIN-001"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none font-mono disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Department *
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={provisionMode === 'link'}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none disabled:opacity-60"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                disabled={provisionMode === 'link'}
                placeholder="e.g. Director's Secretary"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                System Role *
              </label>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Account Type *
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
              >
                <option value="standard">Standard (Full Access)</option>
                <option value="evaluation_only">Evaluation Only</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Provision Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

