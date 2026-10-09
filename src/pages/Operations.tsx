import { initialMembers } from '../data';
import React, { useState, useEffect } from 'react';
import GlobalPillTabs from '../components/ui/GlobalPillTabs';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';
import { canManagePersonnel, canProvisionAccounts, canAccessDirectory } from '../lib/permissions';
import { DEPARTMENTS } from '../utils/constants';
import { getStoredDepartments } from '../utils/systemSettings';
import { Briefcase, CheckSquare, Users, Phone, Mail, Plus, Edit2, Trash2, X, Search, Filter, UserPlus, ShieldAlert, Loader2, Award, HeartHandshake, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import TaskBoard from '../components/TaskBoard';
import EmptyState from '../components/EmptyState';
import ProvisionUserModal from '../components/ProvisionUserModal';
import { api } from '../services/api';
import { formatDisplayDate } from '../utils/dateUtils';

const getBadgeStyle = (type: string) => {
  switch(type) {
    case 'Officer': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Staff': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Volunteer': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const getInitials = (name: string) => {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const getAvatarSrc = (person: any) => {
  const pic = person?.profilePic || person?.imageUrl;
  if (!pic) return null;
  if (typeof pic === 'string' && pic.startsWith('src/')) {
    return '/' + pic;
  }
  return pic;
};

const OfficerCard = ({ officer, onEdit, onDelete }: { officer: any, onEdit: (e: React.MouseEvent) => void, onDelete: (e: React.MouseEvent) => void }) => {
  const { currentUser } = useAuth();
  const avatar = getAvatarSrc(officer);

  return (
    <div className="bg-white rounded-2xl border border-amber-200 hover:border-amber-400 p-6 flex flex-col items-center text-center transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl group relative shadow-xs">
      {canManagePersonnel(currentUser?.role) && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-orange-500 bg-gray-50 hover:bg-orange-50 rounded-md transition-all duration-200 ease-in-out hover:opacity-80 active:scale-[0.97]" title="Edit">
            <Edit2 size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-rose-500 bg-gray-50 hover:bg-rose-50 rounded-md transition-all duration-200 ease-in-out hover:opacity-80 active:scale-[0.97]" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      )}

      <div className="w-24 h-24 rounded-full bg-amber-50 border-2 border-white shadow-sm flex items-center justify-center text-amber-600 text-2xl font-bold mb-4 overflow-hidden relative group-hover:scale-105 transition-transform duration-300">
        {avatar ? (
          <img src={avatar} alt={officer.name} className="w-full h-full object-cover" onError={(e)=>{ (e.target as HTMLElement).style.display = 'none'; }} />
        ) : (
          getInitials(officer.name)
        )}
      </div>

      <h3 className="text-[18px] font-bold text-gray-900 mb-1">{officer.name}</h3>
      <p className="text-[13px] text-gray-500 font-medium mb-3">{officer.role || officer.position}</p>

      <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4">
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase border bg-amber-50 text-amber-700 border-amber-200">
          {officer.governance_body || 'Executive Board'}
        </span>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
          (officer.status || 'Active').toLowerCase() === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-600 border-gray-200'
        }`}>
          {officer.status || 'Active'}
        </span>
      </div>

      <div className="w-full flex flex-col gap-2 mt-auto pt-4 border-t border-gray-100">
        {officer.phone && (
          <a href={`tel:${officer.phone}`} className="flex items-center justify-center gap-2 text-[13px] text-gray-600 hover:text-orange-500 transition-colors py-1 cursor-pointer">
            <Phone size={14} />
            {officer.phone}
          </a>
        )}
        {officer.email && (
          <a href={`mailto:${officer.email}`} className="flex items-center justify-center gap-2 text-[13px] text-gray-600 hover:text-orange-500 transition-colors py-1 cursor-pointer">
            <Mail size={14} />
            <span className="truncate max-w-[180px]">{officer.email}</span>
          </a>
        )}
      </div>
    </div>
  );
};

export default function Operations({ 
  view, 
  members, 
  setMembers, 
  tasks, 
  setTasks 
}: { 
  view: string, 
  members: any[], 
  setMembers: (v: any) => void, 
  tasks: any[], 
  setTasks: (v: any) => void 
}) {
  const { currentUser } = useAuth();

  const [availableDepts, setAvailableDepts] = useState<string[]>(() => getStoredDepartments());

  useEffect(() => {
    const handleSync = () => setAvailableDepts(getStoredDepartments());
    window.addEventListener('departments-updated', handleSync);
    return () => window.removeEventListener('departments-updated', handleSync);
  }, []);

  // Categorized personnel state from dedicated endpoints
  const [staffList, setStaffList] = useState<any[]>([]);
  const [officersList, setOfficersList] = useState<any[]>([]);
  const [membersList, setMembersList] = useState<any[]>([]);
  const [volunteersList, setVolunteersList] = useState<any[]>([]);
  const [includeResignedStaff, setIncludeResignedStaff] = useState(false);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);

  const fetchDirectoryData = async () => {
    if (view !== 'directory') return;
    setIsLoadingDirectory(true);
    try {
      const [staffRes, officersRes, membersRes, volunteersRes] = await Promise.allSettled([
        api.personnel.getStaff({ per_page: 100, include_resigned: includeResignedStaff ? '1' : '0' }),
        api.personnel.getOfficers({ per_page: 100 }),
        api.personnel.getMembers({ per_page: 100 }),
        api.personnel.getVolunteers({ per_page: 100 }),
      ]);

      if (staffRes.status === 'fulfilled') {
        const data = staffRes.value?.data ?? (Array.isArray(staffRes.value) ? staffRes.value : []);
        setStaffList(data);
      }
      if (officersRes.status === 'fulfilled') {
        const data = officersRes.value?.data ?? (Array.isArray(officersRes.value) ? officersRes.value : []);
        setOfficersList(data);
      }
      if (membersRes.status === 'fulfilled') {
        const data = membersRes.value?.data ?? (Array.isArray(membersRes.value) ? membersRes.value : []);
        setMembersList(data);
      }
      if (volunteersRes.status === 'fulfilled') {
        const data = volunteersRes.value?.data ?? (Array.isArray(volunteersRes.value) ? volunteersRes.value : []);
        setVolunteersList(data);
      }
    } catch (err) {
      console.error('Failed to load personnel directory:', err);
    } finally {
      setIsLoadingDirectory(false);
    }
  };

  useEffect(() => {
    if (view === 'directory') {
      fetchDirectoryData();
    }
  }, [view, includeResignedStaff]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [isDeletingMember, setIsDeletingMember] = useState(false);
  const [activeTab, setActiveTab] = useState('center_staff');
  const [searchQuery, setSearchQuery] = useState('');
  const [officerSearchQuery, setOfficerSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  
  const [formData, setFormData] = useState({
    name: '',
    staff_id: '',
    role: '',
    type: 'Staff',
    department: availableDepts[0] || DEPARTMENTS[0] || 'Admin',
    phone: '',
    email: '',
    joinDate: new Date().toISOString().split('T')[0],
    profilePic: null as string | null,
    is_facilitator: false,
  });

  const handleAddClick = () => {
    setEditingMember(null);
    let defaultType = 'Staff';
    if (activeTab === 'main_officers') defaultType = 'Officer';
    else if (activeTab === 'volunteers') defaultType = 'Volunteer';
    else if (activeTab === 'members') defaultType = 'General Member';

    setFormData({ 
      name: '', 
      staff_id: '',
      role: '', 
      type: defaultType, 
      department: availableDepts[0] || DEPARTMENTS[0] || 'Admin', 
      phone: '', 
      email: '', 
      joinDate: new Date().toISOString().split('T')[0], 
      profilePic: null,
      is_facilitator: false,
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (item: any) => {
    setEditingMember(item);
    setFormData({
      name: item.name || '',
      staff_id: item.staff_id || '',
      role: item.role || item.position || item.job_title || '',
      type: item.type || (activeTab === 'center_staff' ? 'Staff' : activeTab === 'main_officers' ? 'Officer' : activeTab === 'volunteers' ? 'Volunteer' : 'General Member'),
      department: item.department || availableDepts[0] || DEPARTMENTS[0] || 'Admin',
      phone: item.phone || '',
      email: item.email || '',
      joinDate: item.joinDate || item.joined_date || new Date().toISOString().split('T')[0],
      profilePic: item.profilePic || item.imageUrl || null,
      is_facilitator: Boolean(item.is_facilitator),
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!canManagePersonnel(currentUser?.role)) {
      toast.error("Unauthorized: HR or Admin access required.");
      return; 
    }
    setMemberToDelete(id);
  };

  const confirmDelete = async () => {
    if (!canManagePersonnel(currentUser?.role)) {
      toast.error("Unauthorized: HR or Admin access required.");
      return; 
    }
    if (memberToDelete) {
      setIsDeletingMember(true);
      try {
        if (activeTab === 'center_staff') {
          try {
            await api.personnel.deleteStaff(memberToDelete);
          } catch (err) {
            console.warn('Backend delete staff failed:', err);
          }
          setStaffList(prev => prev.filter(s => String(s.id) !== String(memberToDelete)));
        } else {
          try {
            await api.members.delete(memberToDelete);
          } catch (err) {
            console.warn('Backend delete member failed, removing locally:', err);
          }
          setMembers(prev => prev.filter(m => String(m.id) !== String(memberToDelete)));
        }
        setMemberToDelete(null);
        toast.success("Record removed successfully.");
        await fetchDirectoryData();
      } catch (error: any) {
        toast.error(error?.message || "Failed to delete record.");
      } finally {
        setIsDeletingMember(false);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManagePersonnel(currentUser?.role)) {
      toast.error("Unauthorized: HR or Admin access required.");
      return; 
    }
    setIsSubmittingMember(true);
    try {
      if (formData.type === 'Staff') {
        if (editingMember) {
          const updated = await api.personnel.updateStaff(editingMember.id, formData);
          setStaffList(prev => prev.map(s => String(s.id) === String(editingMember.id) ? { ...s, ...updated } : s));
          toast.success("Staff record updated successfully.");
        } else {
          const created = await api.personnel.createStaff(formData);
          setStaffList(prev => [...prev, created]);
          toast.success("Staff member added successfully.");
        }
      } else {
        if (editingMember) {
          try {
            const updated = await api.members.update(editingMember.id, formData);
            setMembers(prev => prev.map(m => String(m.id) === String(editingMember.id) ? { ...m, ...updated } : m));
          } catch (err) {
            console.warn('Backend update member failed, updating locally:', err);
            setMembers(prev => prev.map(m => String(m.id) === String(editingMember.id) ? { ...formData, id: m.id } : m));
          }
          toast.success("Record updated successfully.");
        } else {
          try {
            const created = await api.members.create(formData);
            setMembers(prev => [...prev, created]);
          } catch (err) {
            console.warn('Backend create member failed, saving locally:', err);
            setMembers(prev => [...prev, { ...formData, id: Date.now().toString() }]);
          }
          toast.success("Added successfully.");
        }
      }
      setIsModalOpen(false);
      await fetchDirectoryData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save.");
    } finally {
      setIsSubmittingMember(false);
    }
  };

  // Resolve active dataset with fallback to legacy `members` prop
  const effectiveStaff = staffList.length > 0 ? staffList : members.filter(m => m.type === 'Staff');
  const effectiveOfficers = officersList.length > 0 ? officersList : members.filter(m => m.type === 'Officer');
  const effectiveMembers = membersList.length > 0 ? membersList : members.filter(m => m.type === 'General Member' || m.type === 'Member');
  const effectiveVolunteers = volunteersList.length > 0 ? volunteersList : members.filter(m => m.type === 'Volunteer');

  const filteredStaff = effectiveStaff.filter(s => {
    if (departmentFilter !== 'All' && s.department !== departmentFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name?.toLowerCase().includes(q);
      const matchId = s.staff_id?.toLowerCase().includes(q);
      const matchRole = (s.role || s.job_title)?.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchRole) return false;
    }
    return true;
  });

  const filteredOfficers = effectiveOfficers.filter(o => {
    if (officerSearchQuery) {
      const q = officerSearchQuery.toLowerCase();
      const matchName = o.name?.toLowerCase().includes(q);
      const matchPos = (o.position || o.role)?.toLowerCase().includes(q);
      if (!matchName && !matchPos) return false;
    }
    return true;
  });

  const filteredOrgMembers = effectiveMembers.filter(m => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = m.name?.toLowerCase().includes(q);
      const matchNo = m.member_no?.toLowerCase().includes(q);
      if (!matchName && !matchNo) return false;
    }
    return true;
  });

  const filteredVolunteers = effectiveVolunteers.filter(v => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = v.name?.toLowerCase().includes(q);
      const matchRole = v.role?.toLowerCase().includes(q);
      const matchSkills = v.skills?.toLowerCase().includes(q);
      if (!matchName && !matchRole && !matchSkills) return false;
    }
    return true;
  });

  const isReadOnly = !canManagePersonnel(currentUser?.role);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-gray-900 mb-2 tracking-tight">
            {view === 'directory' ? 'Personnel Directory' : 'Operations'}
          </h1>
          <p className="text-[14px] text-gray-500">
            {view === 'directory' ? 'Center Staff, Main Officers, Organization Members, and Volunteers.' : 'Manage directory and tasks.'}
          </p>
        </div>
        {view === 'directory' && canAccessDirectory(currentUser) && (
          <div className="flex items-center gap-2.5">
            {canProvisionAccounts(currentUser) && (
              <button 
                onClick={() => setIsProvisionModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ease-in-out hover:opacity-90 active:scale-[0.97] hover:shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <UserPlus size={18} />
                Provision Account
              </button>
            )}
            {canManagePersonnel(currentUser?.role) && (
              <button 
                onClick={handleAddClick}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ease-in-out hover:opacity-90 active:scale-[0.97] hover:shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Plus size={18} />
                Add Member
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div>
        <AnimatePresence mode="wait">
          {view === 'directory' ? (
            !canAccessDirectory(currentUser) ? (
              <motion.div
                key="directory-restricted"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-lg mx-auto my-12"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                  <ShieldAlert size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Restricted Access</h3>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  The Personnel Directory is confidential and restricted to authorized administrative roles.
                </p>
              </motion.div>
            ) : (
            <motion.div
              key="directory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <GlobalPillTabs 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                tabs={[
                  { id: 'center_staff', label: `Center Staff (${effectiveStaff.length})` },
                  { id: 'main_officers', label: `Main Officers (${effectiveOfficers.length})` },
                  { id: 'members', label: `Members (${effectiveMembers.length})` },
                  { id: 'volunteers', label: `Volunteers (${effectiveVolunteers.length})` }
                ]} 
              />

              {/* 1. CENTER STAFF TAB */}
              {activeTab === 'center_staff' && (
                <div>
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Search staff by name, ID, or title..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-gray-900"
                        />
                      </div>
                      <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-[13px] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-gray-900 cursor-pointer"
                      >
                        <option value="All">All Departments</option>
                        {availableDepts.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 text-[13px] text-gray-600 self-end sm:self-auto">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={includeResignedStaff} 
                          onChange={(e) => setIncludeResignedStaff(e.target.checked)}
                          className="rounded text-orange-500 focus:ring-orange-500"
                        />
                        <span>Show Resigned Staff</span>
                      </label>
                    </div>
                  </div>

                  {isLoadingDirectory ? (
                    <div className="bg-white rounded-xl border border-gray-200 py-12 flex items-center justify-center gap-2 text-gray-500 text-sm">
                      <Loader2 size={18} className="animate-spin text-orange-500" />
                      Loading Center Staff...
                    </div>
                  ) : filteredStaff.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 py-6">
                      <EmptyState 
                        icon={<Users size={24} />}
                        title="No staff members found"
                        message="Try adjusting your filters or add a new staff member."
                      />
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className="bg-[#F9FAFB] border-b border-gray-200 text-gray-500 font-medium">
                            <th className="px-5 py-3">Staff Member</th>
                            <th className="px-5 py-3">Job Title & Assignment</th>
                            <th className="px-5 py-3">Department</th>
                            <th className="px-5 py-3">Contact</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-900">
                          {filteredStaff.map(person => {
                            const avatar = getAvatarSrc(person);
                            const isResigned = (person.employment_status || '').toLowerCase() === 'resigned';
                            return (
                              <tr key={person.id} className="hover:bg-gray-50/80 transition-colors">
                                <td className="px-5 py-3.5 font-medium">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-[11px] font-bold shrink-0 overflow-hidden border border-gray-200">
                                      {avatar ? (
                                        <img src={avatar} alt={person.name} className="w-full h-full object-cover" onError={(e)=>{ (e.target as HTMLElement).style.display = 'none'; }} />
                                      ) : (
                                        getInitials(person.name)
                                      )}
                                    </div>
                                    <div>
                                      <div className="text-gray-900 font-semibold">{person.name}</div>
                                      {person.staff_id && (
                                        <div className="text-[11px] text-gray-400 font-mono">{person.staff_id}</div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5">
                                  <div className="flex flex-col items-start gap-1">
                                    <span className="text-gray-800 font-medium text-[13px]">{person.role || person.job_title}</span>
                                    {person.is_facilitator && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                                        Facilitator
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 text-gray-600 font-medium">{person.department || '-'}</td>
                                <td className="px-5 py-3.5 text-gray-500">
                                  <div className="flex flex-col text-[12px]">
                                    {person.phone && <span>{person.phone}</span>}
                                    {person.email && <span className="text-gray-400">{person.email}</span>}
                                    {!person.phone && !person.email && <span>-</span>}
                                  </div>
                                </td>
                                <td className="px-5 py-3.5">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                    isResigned ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}>
                                    {isResigned ? 'Resigned' : 'Active'}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {canManagePersonnel(currentUser?.role) && (
                                      <button onClick={(e) => { e.stopPropagation(); handleEditClick(person); }} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors cursor-pointer hover:opacity-80" title="Edit">
                                        <Edit2 size={16} />
                                      </button>
                                    )}
                                    {canManagePersonnel(currentUser?.role) && (
                                      <button onClick={(e) => { e.stopPropagation(); handleDelete(person.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:scale-110 transition-transform cursor-pointer" title="Delete">
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                    {!canManagePersonnel(currentUser?.role) && (
                                      <button onClick={(e) => { e.stopPropagation(); handleEditClick(person); }} className="p-1.5 text-gray-400 hover:text-blue-500 bg-gray-50 hover:bg-blue-50 rounded-md transition-colors" title="View Profile">
                                        <span className="text-xs font-medium px-1">View</span>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 2. MAIN OFFICERS TAB */}
              {activeTab === 'main_officers' && (
                <div>
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Search officers by name or title..." 
                          value={officerSearchQuery}
                          onChange={(e) => setOfficerSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {filteredOfficers.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 py-6">
                      <EmptyState 
                        icon={<Briefcase size={24} />}
                        title="No officers found"
                        message="Try adjusting your search or add a new officer."
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredOfficers.map(officer => (
                        <OfficerCard 
                          key={officer.id} 
                          officer={officer} 
                          onEdit={(e) => {
                            e.stopPropagation();
                            if (canManagePersonnel(currentUser?.role)) handleEditClick(officer);
                          }}
                          onDelete={(e) => {
                            e.stopPropagation();
                            if (canManagePersonnel(currentUser?.role)) handleDelete(officer.id);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. MEMBERS TAB */}
              {activeTab === 'members' && (
                <div>
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Search members by name or ID..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                  {filteredOrgMembers.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 py-6">
                      <EmptyState 
                        icon={<Users size={24} />}
                        title="No members found"
                        message="Try adjusting your search or add a new member."
                      />
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className="bg-[#F9FAFB] border-b border-gray-200 text-gray-500 font-medium">
                            <th className="px-5 py-3">Member ID</th>
                            <th className="px-5 py-3">Name</th>
                            <th className="px-5 py-3">Membership Type</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">Phone</th>
                            <th className="px-5 py-3">Email</th>
                            <th className="px-5 py-3">Join Date</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-900">
                          {filteredOrgMembers.map(person => (
                            <tr key={person.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="px-5 py-3 font-mono text-[12px] text-gray-600 font-semibold">
                                {person.member_no || `MBR-${person.id}`}
                              </td>
                              <td className="px-5 py-3 font-medium text-gray-900">
                                {person.name}
                              </td>
                              <td className="px-5 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  {person.membership_type || 'Regular'}
                                </span>
                              </td>
                              <td className="px-5 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {person.status || 'Active'}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-gray-500">{person.phone || '-'}</td>
                              <td className="px-5 py-3 text-gray-500">{person.email || '-'}</td>
                              <td className="px-5 py-3 text-gray-500">{formatDisplayDate(person.joinDate || person.joined_date)}</td>
                              <td className="px-5 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {canManagePersonnel(currentUser?.role) && (
                                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(person); }} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors cursor-pointer hover:opacity-80" title="Edit">
                                      <Edit2 size={16} />
                                    </button>
                                  )}
                                  {canManagePersonnel(currentUser?.role) && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(person.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:scale-110 transition-transform cursor-pointer" title="Delete">
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                  {!canManagePersonnel(currentUser?.role) && (
                                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(person); }} className="p-1.5 text-gray-400 hover:text-blue-500 bg-gray-50 hover:bg-blue-50 rounded-md transition-colors" title="View Profile">
                                      <span className="text-xs font-medium px-1">View</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 4. VOLUNTEERS TAB */}
              {activeTab === 'volunteers' && (
                <div>
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Search volunteers by name or skills..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                  {filteredVolunteers.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 py-6">
                      <EmptyState 
                        icon={<Users size={24} />}
                        title="No volunteers found"
                        message="Try adjusting your search or add a new volunteer."
                      />
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className="bg-[#F9FAFB] border-b border-gray-200 text-gray-500 font-medium">
                            <th className="px-5 py-3">Name</th>
                            <th className="px-5 py-3">Volunteer Role</th>
                            <th className="px-5 py-3">Skills / Focus Area</th>
                            <th className="px-5 py-3">Status</th>
                            <th className="px-5 py-3">Phone</th>
                            <th className="px-5 py-3">Email</th>
                            <th className="px-5 py-3">Join Date</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-900">
                          {filteredVolunteers.map(person => (
                            <tr key={person.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="px-5 py-3 font-medium text-gray-900">
                                {person.name}
                              </td>
                              <td className="px-5 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-[20px] text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {person.role || 'Volunteer'}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-gray-600 text-[13px]">{person.skills || '-'}</td>
                              <td className="px-5 py-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {person.status || 'Active'}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-gray-500">{person.phone || '-'}</td>
                              <td className="px-5 py-3 text-gray-500">{person.email || '-'}</td>
                              <td className="px-5 py-3 text-gray-500">{formatDisplayDate(person.joinDate || person.joined_date)}</td>
                              <td className="px-5 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {canManagePersonnel(currentUser?.role) && (
                                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(person); }} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors cursor-pointer hover:opacity-80" title="Edit">
                                      <Edit2 size={16} />
                                    </button>
                                  )}
                                  {canManagePersonnel(currentUser?.role) && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(person.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:scale-110 transition-transform cursor-pointer" title="Delete">
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                  {!canManagePersonnel(currentUser?.role) && (
                                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(person); }} className="p-1.5 text-gray-400 hover:text-blue-500 bg-gray-50 hover:bg-blue-50 rounded-md transition-colors" title="View Profile">
                                      <span className="text-xs font-medium px-1">View</span>
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
            )
          ) : (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <TaskBoard members={members} tasks={tasks} setTasks={setTasks} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white shadow-xl w-[95%] sm:w-[500px] md:max-w-2xl max-h-[90vh] overflow-y-auto mx-auto rounded-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-[16px] font-semibold text-gray-900">
                {isReadOnly ? 'View Record' : editingMember ? 'Edit Record' : 'Add New Record'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer hover:opacity-80 p-1"
              >
                <X size={20} />
              </button>
            </div>
            
            <form id="member-form" onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Profile Picture (Optional)</label>
                <div className="flex items-center gap-4">
                  {formData.profilePic && (
                    <img src={formData.profilePic} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm" />
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        try {
                          toast.loading('Uploading photo...', { id: 'upload-avatar' });
                          const res = await api.uploadFile(file);
                          setFormData({ ...formData, profilePic: res.url });
                          toast.success('Photo uploaded successfully', { id: 'upload-avatar' });
                        } catch (err: any) {
                          console.error(err);
                          setFormData({ ...formData, profilePic: URL.createObjectURL(file) });
                          toast.error(err.message || 'Upload failed, using local preview', { id: 'upload-avatar' });
                        }
                      }
                    }}
                    className="w-full text-[13px] text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[13px] file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" disabled={isReadOnly}
                  placeholder="e.g. Ahmad Abdullah"
                />
              </div>
              
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Category (Role Type)</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-gray-900 cursor-pointer disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" disabled={isReadOnly}
                >
                  <option value="Staff">Center Staff</option>
                  <option value="Officer">Main Organization Officer</option>
                  <option value="Volunteer">Volunteer</option>
                  <option value="General Member">Organization Member</option>
                </select>
              </div>

              {formData.type === 'Staff' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[13px] font-medium text-gray-700">
                      Staff ID <span className="text-gray-400 font-normal">(e.g. TGC2016-027)</span>
                    </label>
                    {!editingMember && !isReadOnly && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await api.personnel.getNextStaffId();
                            if (res?.staff_id) {
                              setFormData(prev => ({ ...prev, staff_id: res.staff_id }));
                            }
                          } catch (err) {
                            console.warn('Failed to fetch next staff ID', err);
                          }
                        }}
                        className="text-xs text-orange-600 hover:text-orange-700 hover:underline font-medium cursor-pointer"
                      >
                        Auto-generate
                      </button>
                    )}
                  </div>
                  <input 
                    type="text" 
                    value={formData.staff_id}
                    onChange={(e) => setFormData({...formData, staff_id: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-gray-900 font-mono disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" 
                    disabled={isReadOnly}
                    placeholder="e.g. TGC2016-027"
                  />
                </div>
              )}

              {formData.type === 'Staff' && (
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Department</label>
                  <select 
                    value={formData.department || availableDepts[0] || 'Admin'}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" disabled={isReadOnly}
                  >
                    {availableDepts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">
                  {formData.type === 'Officer' ? 'Officer Position' : formData.type === 'Staff' ? 'Job Title' : 'Role / Focus'}
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" disabled={isReadOnly}
                  placeholder={formData.type === 'Officer' ? 'e.g. President, Vice President' : formData.type === 'Staff' ? 'e.g. Human Resources Officer' : 'e.g. Community Outreach'}
                />
              </div>

              {formData.type === 'Staff' && (
                <div className="flex items-center gap-2 pt-1">
                  <input 
                    type="checkbox"
                    id="is_facilitator"
                    checked={formData.is_facilitator}
                    onChange={(e) => setFormData({...formData, is_facilitator: e.target.checked})}
                    className="rounded text-orange-500 focus:ring-orange-500 h-4 w-4"
                    disabled={isReadOnly}
                  />
                  <label htmlFor="is_facilitator" className="text-[13px] text-gray-700 select-none cursor-pointer">
                    Eligible Facilitator (can be assigned to Reverts/Shahadas)
                  </label>
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Phone Number</label>
                <input 
                  type="text" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" disabled={isReadOnly}
                  placeholder="e.g. 0917 123 4567"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" disabled={isReadOnly}
                  placeholder="e.g. person@thegoodcompanion.net"
                />
              </div>
            </form>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 mt-auto shrink-0 bg-gray-50 rounded-b-2xl">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="px-4 py-2 text-[14px] font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200 ease-in-out hover:opacity-80 active:scale-[0.97] cursor-pointer"
              >
                Cancel
              </button>
              {!isReadOnly && (
                <button 
                  type="submit" 
                  form="member-form" 
                  disabled={isSubmittingMember}
                  className="px-4 py-2 text-[14px] font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all duration-200 ease-in-out hover:opacity-90 active:scale-[0.97] cursor-pointer flex items-center gap-2"
                >
                  {isSubmittingMember && <Loader2 size={16} className="animate-spin" />}
                  {editingMember ? 'Save Changes' : 'Save Record'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={memberToDelete !== null}
        onClose={() => setMemberToDelete(null)}
        onConfirm={confirmDelete}
        title="Remove Record"
        message="Are you sure you want to remove this record? This action cannot be undone."
        isDeleting={isDeletingMember}
      />

      <ProvisionUserModal
        isOpen={isProvisionModalOpen}
        onClose={() => setIsProvisionModalOpen(false)}
        onSuccess={() => {
          fetchDirectoryData();
          api.members.getAll().then(setMembers).catch(() => {});
        }}
      />
    </div>
  );
}
