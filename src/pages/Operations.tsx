import { initialMembers } from '../data';
import React, { useState, useEffect } from 'react';
import GlobalPillTabs from '../components/ui/GlobalPillTabs';
import { useAuth } from '../AuthContext';
import toast from 'react-hot-toast';
import { canManagePersonnel, canProvisionAccounts, canAccessDirectory } from '../lib/permissions';
import { DEPARTMENTS } from '../utils/constants';
import { getStoredDepartments } from '../utils/systemSettings';
import { Briefcase, CheckSquare, Users, Phone, Mail, Plus, Edit2, Trash2, X, Search, Filter, UserPlus, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import TaskBoard from '../components/TaskBoard';
import EmptyState from '../components/EmptyState';
import ProvisionUserModal from '../components/ProvisionUserModal';
import { createPortal } from 'react-dom';
import { api } from '../services/api';


const getBadgeStyle = (type: string) => {
  switch(type) {
    case 'Officer': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Staff': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Volunteer': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const ProfileCard = ({ person, isOfficer = false, onEdit, onDelete }: { person: any, isOfficer?: boolean, onEdit: (e: React.MouseEvent) => void, onDelete: (e: React.MouseEvent) => void }) => {
  const { currentUser } = useAuth();
  return (
  <div 
    className={`bg-white rounded-2xl border p-6 flex flex-col items-center text-center transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl group relative ${
      isOfficer ? 'border-amber-300 hover:border-amber-400 shadow-md' : 'border-gray-200 hover:border-gray-300'
    }`}
  >
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

    <div className={`${isOfficer ? 'w-24 h-24' : 'w-20 h-20'} rounded-full bg-gray-100 border-2 border-white shadow-sm flex items-center justify-center text-gray-400 ${isOfficer ? 'text-2xl' : 'text-xl'} font-bold mb-4 overflow-hidden relative group-hover:scale-105 transition-transform duration-300`}>
       {person.profilePic ? (
         <img src={person.profilePic} alt={person.name} className="w-full h-full object-cover" />
       ) : (
         getInitials(person.name)
       )}
    </div>
    
    <h3 className={`${isOfficer ? 'text-[18px]' : 'text-[16px]'} font-bold text-gray-900 mb-1`}>{person.name}</h3>
    <p className="text-[13px] text-gray-500 font-medium mb-3">{person.role}</p>
    
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border mb-5 ${getBadgeStyle(person.type)}`}>
      {person.type}
    </span>
    
    <div className="w-full flex flex-col gap-2 mt-auto pt-4 border-t border-gray-100">
      <a href={`tel:${person.phone}`} className="flex items-center justify-center gap-2 text-[13px] text-gray-600 hover:text-orange-500 transition-colors py-1 cursor-pointer">
        <Phone size={14} />
        {person.phone}
      </a>
      <a href={`mailto:${person.email}`} className="flex items-center justify-center gap-2 text-[13px] text-gray-600 hover:text-orange-500 transition-colors py-1 cursor-pointer">
        <Mail size={14} />
        <span className="truncate max-w-[180px]">{person.email}</span>
      </a>
    </div>
  </div>
  );
};

export default function Operations({ view, members, setMembers, tasks, setTasks }: { view: string, members: any[], setMembers: (v: any) => void, tasks: any[], setTasks: (v: any) => void }) {
  const { currentUser } = useAuth();

  const [availableDepts, setAvailableDepts] = useState<string[]>(() => getStoredDepartments());

  useEffect(() => {
    const handleSync = () => setAvailableDepts(getStoredDepartments());
    window.addEventListener('departments-updated', handleSync);
    return () => window.removeEventListener('departments-updated', handleSync);
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('center_staff');
  const [searchQuery, setSearchQuery] = useState('');
  const [officerSearchQuery, setOfficerSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    type: 'Officer',
    department: availableDepts[0] || DEPARTMENTS[0] || 'Admin',
    phone: '',
    email: '',
    joinDate: new Date().toISOString().split('T')[0],
    profilePic: null as string | null
  });

  const handleAddClick = () => {
    setEditingMember(null);
    setFormData({ name: '', role: '', type: 'Officer', department: availableDepts[0] || DEPARTMENTS[0] || 'Admin', phone: '', email: '', joinDate: new Date().toISOString().split('T')[0], profilePic: null });
    setIsModalOpen(true);
  };

  const handleEditClick = (member: any) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      role: member.role,
      type: member.type,
      department: member.department || availableDepts[0] || DEPARTMENTS[0] || 'Admin',
      phone: member.phone,
      email: member.email,
      joinDate: member.joinDate || new Date().toISOString().split('T')[0],
      profilePic: member.profilePic || null
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!canManagePersonnel(currentUser.role)) {
      toast.error("Unauthorized: HR or Admin access required.");
      return; 
    }
    setMemberToDelete(id);
  };

  const confirmDelete = async () => {
    if (!canManagePersonnel(currentUser.role)) {
      toast.error("Unauthorized: HR or Admin access required.");
      return; 
    }
    if (memberToDelete) {
      try {
        await api.members.delete(memberToDelete);
      } catch (err) {
        console.warn('Backend delete member failed, removing locally:', err);
      }
      setMembers(prev => prev.filter(m => m.id !== memberToDelete));
      setMemberToDelete(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManagePersonnel(currentUser.role)) {
      toast.error("Unauthorized: HR or Admin access required.");
      return; 
    }
    if (editingMember) {
      try {
        const updated = await api.members.update(editingMember.id, formData);
        setMembers(prev => prev.map(m => m.id === editingMember.id ? { ...m, ...updated } : m));
      } catch (err) {
        console.warn('Backend update member failed, updating locally:', err);
        setMembers(prev => prev.map(m => m.id === editingMember.id ? { ...formData, id: m.id } : m));
      }
    } else {
      try {
        const created = await api.members.create(formData);
        setMembers(prev => [...prev, created]);
      } catch (err) {
        console.warn('Backend create member failed, saving locally:', err);
        setMembers(prev => [...prev, { ...formData, id: Date.now().toString() }]);
      }
    }
    setIsModalOpen(false);
  };

  const officers = members.filter(m => m.type === 'Officer');
  const staff = members.filter(m => {
    if (m.type !== 'Staff') return false;
    if (departmentFilter !== 'All' && m.department !== departmentFilter) return false;
    return true;
  });
  const filteredMembers = members.filter(m => m.type === 'General Member' && m.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredVolunteers = members.filter(m => m.type === 'Volunteer' && m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const isReadOnly = !canManagePersonnel(currentUser.role);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-gray-900 mb-2 tracking-tight">{view === 'directory' ? 'Personnel Directory' : 'Operations'}</h1>
          <p className="text-[14px] text-gray-500">Manage directory and tasks.</p>
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
            {canManagePersonnel(currentUser.role) && (
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
                  { id: 'center_staff', label: 'Center Staff' },
                  { id: 'main_officers', label: 'Main Officers' },
                  { id: 'members', label: 'Members' },
                  { id: 'volunteers', label: 'Volunteers' }
                ]} 
              />

              {activeTab === 'center_staff' && (
                <div>
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Search staff..." 
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
                  </div>
                  {staff.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
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
                            <th className="px-5 py-3">Name</th>
                            <th className="px-5 py-3">Role</th>
                            <th className="px-5 py-3">Department</th>
                            <th className="px-5 py-3">Phone</th>
                            <th className="px-5 py-3">Email</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-900">
                          {staff.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).map(person => (
                            <tr key={person.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="px-5 py-3 font-medium">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-[11px] font-bold shrink-0">
                                    {person.profilePic ? (
                                      <img src={person.profilePic} alt={person.name} className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                      getInitials(person.name)
                                    )}
                                  </div>
                                  {person.name}
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-[20px] text-[11px] font-semibold ${getBadgeStyle(person.type)}`}>
                                  {person.role}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-gray-600">{person.department || '-'}</td>
                              <td className="px-5 py-3 text-gray-500">{person.phone || '-'}</td>
                              <td className="px-5 py-3 text-gray-500">{person.email || '-'}</td>
                              <td className="px-5 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {canManagePersonnel(currentUser.role) && (
                                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(person); }} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors cursor-pointer hover:opacity-80" title="Edit">
                                      <Edit2 size={16} />
                                    </button>
                                  )}
                                  {canManagePersonnel(currentUser.role) && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(person.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:scale-110 transition-transform cursor-pointer" title="Delete">
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                  {!canManagePersonnel(currentUser.role) && (
                                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(person); }} className="p-1.5 text-gray-400 hover:text-blue-500 bg-gray-50 hover:bg-blue-50 rounded-md transition-colors" title="View Profile">
                                      <Edit2 size={16} className="hidden" />
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

              {activeTab === 'main_officers' && (
                <div>
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Search officers..." 
                          value={officerSearchQuery}
                          onChange={(e) => setOfficerSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {officers.filter(m => m.name.toLowerCase().includes(officerSearchQuery.toLowerCase())).length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 py-6">
                      <EmptyState 
                        icon={<Briefcase size={24} />}
                        title="No officers found"
                        message="Try adjusting your search or add a new officer."
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {officers
                        .filter(m => m.name.toLowerCase().includes(officerSearchQuery.toLowerCase()))
                        .map(officer => (
                        <ProfileCard 
                          key={officer.id} 
                          person={officer} 
                          isOfficer={true}
                          onEdit={(e) => {
                            e.stopPropagation();
                            if(canManagePersonnel(currentUser.role)) handleEditClick(officer);
                          }}
                          onDelete={(e) => {
                            e.stopPropagation();
                            if(canManagePersonnel(currentUser.role)) handleDelete(officer.id);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'members' && (
                <div>
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Search by name..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-gray-900"
                        />
                      </div>
                    </div>
                  </div>
                  {filteredMembers.length === 0 ? (
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
                            <th className="px-5 py-3">Name</th>
                            <th className="px-5 py-3">Role</th>
                            <th className="px-5 py-3">Phone</th>
                            <th className="px-5 py-3">Email</th>
                            <th className="px-5 py-3">Join Date</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-900">
                          {filteredMembers.map(person => (
                            <tr key={person.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="px-5 py-3 font-medium">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-[11px] font-bold shrink-0">
                                    {person.profilePic ? (
                                      <img src={person.profilePic} alt={person.name} className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                      getInitials(person.name)
                                    )}
                                  </div>
                                  {person.name}
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-[20px] text-[11px] font-semibold ${getBadgeStyle(person.type)}`}>
                                  {person.type}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-gray-500">{person.phone || '-'}</td>
                              <td className="px-5 py-3 text-gray-500">{person.email || '-'}</td>
                              <td className="px-5 py-3 text-gray-500">{person.joinDate || '-'}</td>
                              <td className="px-5 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {canManagePersonnel(currentUser.role) && (
                                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(person); }} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors cursor-pointer hover:opacity-80" title="Edit">
                                      <Edit2 size={16} />
                                    </button>
                                  )}
                                  {canManagePersonnel(currentUser.role) && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(person.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:scale-110 transition-transform cursor-pointer" title="Delete">
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                  {!canManagePersonnel(currentUser.role) && (
                                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(person); }} className="p-1.5 text-gray-400 hover:text-blue-500 bg-gray-50 hover:bg-blue-50 rounded-md transition-colors" title="View Profile">
                                      <Edit2 size={16} className="hidden" />
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

              {activeTab === 'volunteers' && (
                <div>
                  <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Search by name..." 
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
                            <th className="px-5 py-3">Role</th>
                            <th className="px-5 py-3">Phone</th>
                            <th className="px-5 py-3">Email</th>
                            <th className="px-5 py-3">Join Date</th>
                            <th className="px-5 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-900">
                          {filteredVolunteers.map(person => (
                            <tr key={person.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="px-5 py-3 font-medium">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-[11px] font-bold shrink-0">
                                    {person.profilePic ? (
                                      <img src={person.profilePic} alt={person.name} className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                      getInitials(person.name)
                                    )}
                                  </div>
                                  {person.name}
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-[20px] text-[11px] font-semibold ${getBadgeStyle(person.type)}`}>
                                  {person.type}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-gray-500">{person.phone || '-'}</td>
                              <td className="px-5 py-3 text-gray-500">{person.email || '-'}</td>
                              <td className="px-5 py-3 text-gray-500">{person.joinDate || '-'}</td>
                              <td className="px-5 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {canManagePersonnel(currentUser.role) && (
                                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(person); }} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors cursor-pointer hover:opacity-80" title="Edit">
                                      <Edit2 size={16} />
                                    </button>
                                  )}
                                  {canManagePersonnel(currentUser.role) && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(person.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:scale-110 transition-transform cursor-pointer" title="Delete">
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                  {!canManagePersonnel(currentUser.role) && (
                                    <button onClick={(e) => { e.stopPropagation(); handleEditClick(person); }} className="p-1.5 text-gray-400 hover:text-blue-500 bg-gray-50 hover:bg-blue-50 rounded-md transition-colors" title="View Profile">
                                      <Edit2 size={16} className="hidden" />
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
                {isReadOnly ? 'View Member' : editingMember ? 'Edit Member' : 'Add New Member'}
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
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Category (Type)</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-gray-900 cursor-pointer disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" disabled={isReadOnly}
                >
                  <option value="Officer">Main Organization Officer</option>
                  <option value="Staff">Center Staff</option>
                  <option value="Volunteer">Volunteer</option>
                  <option value="General Member">General Member</option>
                </select>
              </div>


              {formData.type === 'Staff' && (
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Department</label>
                  <select 
                    value={formData.department || availableDepts[0] || 'Operations'}
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
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Specific Title / Role</label>
                <input 
                  type="text" 
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" disabled={isReadOnly}
                  placeholder="e.g. President, Imam, Admin"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Phone Number</label>
                <input 
                  type="text" 
                  required
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
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all text-gray-900 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed" disabled={isReadOnly}
                  placeholder="e.g. ahmad@example.com"
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
                  className="px-4 py-2 text-[14px] font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-sm transition-all duration-200 ease-in-out hover:opacity-90 active:scale-[0.97] cursor-pointer"
                >
                  {editingMember ? 'Save Changes' : 'Save Member'}
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
        title="Remove Member"
        message="Are you sure you want to remove this member? This action cannot be undone."
      />

      <ProvisionUserModal
        isOpen={isProvisionModalOpen}
        onClose={() => setIsProvisionModalOpen(false)}
        onSuccess={() => {
          api.members.getAll().then(setMembers).catch(() => {});
        }}
      />
    </div>
  );
}
