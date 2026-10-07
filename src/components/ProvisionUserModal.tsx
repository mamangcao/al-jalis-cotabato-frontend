import React, { useState, useEffect } from 'react';
import { UserPlus, X, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
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
  const [staffId, setStaffId] = useState('');
  const [department, setDepartment] = useState('Admin');
  const [jobTitle, setJobTitle] = useState('');
  const [role, setRole] = useState('staff');
  const [accountType, setAccountType] = useState<'standard' | 'evaluation_only'>('standard');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingId, setIsFetchingId] = useState(false);
  const [error, setError] = useState('');

  const fetchNextId = async () => {
    setIsFetchingId(true);
    try {
      const res = await api.users.getNextStaffId();
      if (res?.staff_id) {
        setStaffId(res.staff_id);
      }
    } catch {
      // Fallback
    } finally {
      setIsFetchingId(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError('');
      setName('');
      setEmail('');
      setJobTitle('');
      setRole('staff');
      setDepartment('Admin');
      setAccountType('standard');
      fetchNextId();
    }
  }, [isOpen]);

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

    if (!staffId.match(/^TGC2016-\d{3}$/)) {
      setError('Staff ID must adhere to the organization format TGC2016-XXX (e.g., TGC2016-025).');
      return;
    }

    setIsLoading(true);

    try {
      await api.users.create({
        name: name.trim(),
        email: email.trim(),
        staff_id: staffId.trim(),
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
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Zayd Al-Ansari"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Staff ID *
              </label>
              <button
                type="button"
                onClick={fetchNextId}
                disabled={isFetchingId}
                className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} className={isFetchingId ? 'animate-spin' : ''} />
                Generate Next ID
              </button>
            </div>
            <input
              type="text"
              required
              value={staffId}
              onChange={(e) => setStaffId(e.target.value.toUpperCase())}
              placeholder="TGC2016-000"
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none font-mono"
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
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
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
                placeholder="e.g. Director's Secretary"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
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

