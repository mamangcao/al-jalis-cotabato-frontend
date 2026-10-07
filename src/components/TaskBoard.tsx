import toast from 'react-hot-toast';
import { canManageOperations } from '../lib/permissions';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { Plus, X, ClipboardList, Edit2, Trash2, Archive, Loader2, RefreshCw } from 'lucide-react';
import EmptyState from './EmptyState';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { api } from '../services/api';

type Priority = 'High' | 'Medium' | 'Low';
type Status = 'todo' | 'in-progress' | 'done';
type Scope = 'my' | 'department' | 'all';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  assignee: string; // Member ID string
  assignee_user_id?: number | null;
  created_by_user_id?: number | null;
  department: string;
  createdBy?: string;
}

interface TaskBoardProps {
  members: any[];
  tasks: any[];
  setTasks: (v: any) => void;
}

// ── Role helpers ──────────────────────────────────────────────────────────────

const ORG_WIDE_ROLES = [
  'super_admin',
  'director',
  'admin_director',
  'admin',
  'hr',
  'admin_hr',
  'executive_secretary',
];

function isOrgWide(role: string): boolean {
  return ORG_WIDE_ROLES.includes(role);
}

function isDeptHead(role: string): boolean {
  return role === 'department_head';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TaskBoard({ members, tasks, setTasks }: TaskBoardProps) {
  const { currentUser } = useAuth();

  const orgWide    = isOrgWide(currentUser.role);
  const deptHead   = isDeptHead(currentUser.role);

  // Active scope tab
  const defaultScope: Scope = orgWide ? 'all' : 'department';
  const [activeScope, setActiveScope]     = useState<Scope>(defaultScope);
  const [isLoading, setIsLoading]         = useState(false);

  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [draggedTaskId, setDraggedTaskId]   = useState<string | null>(null);
  const [editingTask, setEditingTask]       = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete]     = useState<string | null>(null);
  const [isClearDoneModalOpen, setIsClearDoneModalOpen] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isClearingDone, setIsClearingDone] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Filters — department filter only meaningful for org-wide users
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [assigneeFilter, setAssigneeFilter]     = useState('Everyone');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium' as Priority,
    assignee: '',
    department: currentUser.department || 'Admin',
  });

  // ── Fetch tasks from backend with scope param ─────────────────────────────

  const fetchTasks = useCallback(async (scope: Scope) => {
    setIsLoading(true);
    try {
      const data = await api.tasks.getAll({ scope });
      setTasks(data);
    } catch {
      toast.error('Unable to load tasks.');
    } finally {
      setIsLoading(false);
    }
  }, [setTasks]);

  // Re-fetch whenever scope tab changes
  useEffect(() => {
    fetchTasks(activeScope);
    // Reset department filter when switching scope
    setDepartmentFilter('All Departments');
    setAssigneeFilter('Everyone');
  }, [activeScope, fetchTasks]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const getAssignee = (id: string) => members.find(m => m.id === id);

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'High':   return 'bg-red-100 text-red-700';
      case 'Medium': return 'bg-amber-100 text-amber-700';
      case 'Low':    return 'bg-gray-100 text-gray-700';
    }
  };

  // ── Drag & drop ───────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, status: Status) => {
    e.preventDefault();
    if (draggedTaskId) {
      const originalTasks = [...tasks];
      setTasks(tasks.map(t => t.id === draggedTaskId ? { ...t, status } : t));
      try {
        await api.tasks.update(draggedTaskId, { status });
        if (status === 'done') {
          toast.success('Task marked as completed.');
        } else {
          toast.success(`Task moved to ${status === 'todo' ? 'To Do' : 'In Progress'}.`);
        }
      } catch (err: any) {
        setTasks(originalTasks);
        toast.error(err.message || 'Unable to update task status.');
      }
    }
    setDraggedTaskId(null);
  };

  // ── Save (create / edit) ──────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageOperations(currentUser.role)) {
      toast.error('Unauthorized: Operations access required.');
      return;
    }

    if (editingTask) {
      setIsSubmittingTask(true);
      try {
        const updated = await api.tasks.update(editingTask.id, formData);
        setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...updated } : t));
        toast.success('Task updated successfully.');
        closeModal();
      } catch (err: any) {
        toast.error(err.message || 'Unable to update task. Please try again.');
      } finally {
        setIsSubmittingTask(false);
      }
    } else {
      setIsSubmittingTask(true);
      try {
        const created = await api.tasks.create({ ...formData, status: 'todo' });
        setTasks([...tasks, created]);
        toast.success('Task created successfully.');
        closeModal();
      } catch (err: any) {
        toast.error(err.message || 'Unable to create task. Please try again.');
      } finally {
        setIsSubmittingTask(false);
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      priority: 'Medium',
      assignee: '',
      department: currentUser.department || 'Admin',
    });
  };

  // ── Edit ──────────────────────────────────────────────────────────────────

  const handleEdit = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      assignee: task.assignee,
      department: task.department || currentUser.department || 'Admin',
    });
    setIsModalOpen(true);
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setTaskToDelete(task.id);
  };

  const confirmDelete = async () => {
    if (taskToDelete) {
      setIsDeletingTask(true);
      try {
        await api.tasks.delete(taskToDelete);
        setTasks(tasks.filter(t => t.id !== taskToDelete));
        toast.success('Task deleted successfully.');
        setTaskToDelete(null);
      } catch (err: any) {
        toast.error(err.message || 'Unable to delete task.');
      } finally {
        setIsDeletingTask(false);
      }
    }
  };

  const confirmClearDone = async () => {
    setIsClearingDone(true);
    // Delete each completed task via the API
    const doneTasks = tasks.filter(t => t.status === 'done');
    try {
      await Promise.all(doneTasks.map(t => api.tasks.delete(t.id)));
      setTasks(tasks.filter(t => t.status !== 'done'));
      toast.success('Completed tasks cleared successfully.');
    } catch {
      toast.error('Some tasks could not be cleared. Please try again.');
    } finally {
      setIsClearingDone(false);
      setIsClearDoneModalOpen(false);
    }
  };

  // ── Filtering (client-side within already-scoped results) ─────────────────

  const filteredTasks = tasks.filter(task => {
    const matchesDept = departmentFilter === 'All Departments' || task.department === departmentFilter;
    let matchesAssignee = true;
    if (assigneeFilter === 'Unassigned') {
      matchesAssignee = !task.assignee;
    } else if (assigneeFilter !== 'Everyone') {
      matchesAssignee = task.assignee === assigneeFilter;
    }
    return matchesDept && matchesAssignee;
  });

  // ── Column renderer ───────────────────────────────────────────────────────

  const renderColumn = (title: string, status: Status) => {
    const columnTasks = filteredTasks.filter(t => t.status === status);

    return (
      <div
        className="flex-1 min-w-0 bg-slate-100 rounded-xl p-4 flex flex-col"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, status)}
      >
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="font-bold text-gray-800">
            {title} <span className="text-gray-400 text-sm ml-2 font-medium">{columnTasks.length}</span>
          </h3>
          {status === 'done' && columnTasks.length > 0 && (orgWide || deptHead) && (
            <button
              onClick={() => setIsClearDoneModalOpen(true)}
              className="text-gray-400 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-gray-200"
              title="Clear All Completed"
            >
              <Archive size={16} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px]">
          {columnTasks.length === 0 ? (
            <div className="h-full min-h-[150px]">
              <EmptyState
                icon={<ClipboardList size={24} />}
                title="No tasks here"
                message="Drag a task here or create a new one."
              />
            </div>
          ) : (
            columnTasks.map(task => {
              const assignee = getAssignee(task.assignee);
              // Determine whether this user can edit/delete this particular task
              const canEdit = orgWide || deptHead
                || task.assignee_user_id === Number(currentUser.id)
                || task.created_by_user_id === Number(currentUser.id);
              const canDelete = orgWide || deptHead
                || task.created_by_user_id === Number(currentUser.id);

              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className={`group relative bg-white border border-gray-200 shadow-sm rounded-md p-4 transition-all duration-200 hover:shadow-md cursor-grab active:cursor-grabbing ${draggedTaskId === task.id ? 'opacity-50' : 'opacity-100'}`}
                >
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEdit && (
                      <button onClick={(e) => handleEdit(e, task)} className="p-1 text-gray-400 hover:text-emerald-600 rounded hover:bg-gray-50 transition-colors" title="Edit">
                        <Edit2 size={14} />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={(e) => handleDelete(e, task)} className="p-1 text-gray-400 hover:text-rose-500 rounded hover:bg-gray-50 transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <h4 className="font-semibold text-gray-900 text-sm mb-1 pr-12">{task.title}</h4>
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2">{task.description}</p>

                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      {task.department && (
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                          {task.department}
                        </span>
                      )}
                    </div>

                    {assignee && (
                      <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 text-[9px] font-bold overflow-hidden" title={assignee.name}>
                        {assignee.profilePic ? (
                          <img src={assignee.profilePic} alt={assignee.name} className="w-full h-full object-cover" />
                        ) : (
                          assignee.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ── Scope label ───────────────────────────────────────────────────────────

  const scopeLabel = activeScope === 'my'
    ? 'My Tasks'
    : activeScope === 'department'
      ? `${currentUser.department || 'Department'} Tasks`
      : 'All Organization Tasks';

  // ── Departments for filter dropdown ──────────────────────────────────────

  const DEPARTMENTS = ['Admin', 'Academics', 'New Muslim', "Da'wah", 'Multimedia', 'Utility & Maintenance', "Women's Department"];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
        <div>
          <h2 className="text-[18px] font-bold text-gray-900 tracking-tight">Task Board</h2>
          <p className="text-xs text-gray-400 mt-0.5">{scopeLabel}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Department filter — only for org-wide users */}
          {orgWide && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full md:w-auto px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-gray-700 cursor-pointer shadow-sm"
            >
              <option value="All Departments">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="w-full md:w-auto px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-gray-700 cursor-pointer shadow-sm"
          >
            <option value="Everyone">Everyone</option>
            <option value="Unassigned">Unassigned</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          {/* Refresh button */}
          <button
            onClick={() => fetchTasks(activeScope)}
            disabled={isLoading}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-orange-500 hover:border-orange-300 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh tasks"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {canManageOperations(currentUser.role) && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ease-in-out hover:opacity-90 active:scale-[0.97] hover:shadow-md flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus size={16} />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Scope tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveScope('my')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeScope === 'my'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          My Tasks
        </button>
        <button
          onClick={() => setActiveScope('department')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeScope === 'department'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {deptHead || !orgWide ? `${currentUser.department || 'Dept'} Tasks` : 'Department'}
        </button>
        {orgWide && (
          <button
            onClick={() => setActiveScope('all')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeScope === 'all'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            All Tasks
          </button>
        )}
      </div>

      {/* Board columns */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 gap-2">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading tasks…</span>
        </div>
      ) : (
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 w-full h-full overflow-x-auto pb-4">
          {renderColumn('To Do', 'todo')}
          {renderColumn('In Progress', 'in-progress')}
          {renderColumn('Done', 'done')}
        </div>
      )}

      {/* Create / Edit modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white shadow-xl w-[95%] sm:w-[500px] md:max-w-2xl max-h-[90vh] overflow-y-auto mx-auto rounded-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-[16px] font-semibold text-gray-900">{editingTask ? 'Edit Task' : 'Add New Task'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:opacity-80">
                <X size={20} />
              </button>
            </div>

            <form id="task-form" onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Task Title</label>
                <input
                  type="text" required
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-gray-900"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  required rows={3}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-gray-900 resize-none"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as Priority})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-gray-900 cursor-pointer"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {/* Department — only org-wide users may change this */}
              {orgWide ? (
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-gray-900 cursor-pointer"
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[13px] font-medium text-gray-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={currentUser.department || ''}
                    disabled
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Tasks are created in your department.</p>
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-1">Assignee</label>
                <select
                  required
                  value={formData.assignee} onChange={e => setFormData({...formData, assignee: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-gray-900 cursor-pointer"
                >
                  <option value="" disabled>Select a member...</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmittingTask}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-all hover:opacity-80 active:scale-[0.97] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="task-form"
                disabled={isSubmittingTask}
                className="px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-lg shadow-sm transition-all hover:opacity-90 active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 min-w-[110px]"
              >
                {isSubmittingTask ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>{editingTask ? 'Updating…' : 'Saving…'}</span>
                  </>
                ) : (
                  <span>{editingTask ? 'Update Task' : 'Save Task'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <DeleteConfirmationModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        isDeleting={isDeletingTask}
      />

      <DeleteConfirmationModal
        isOpen={isClearDoneModalOpen}
        onClose={() => setIsClearDoneModalOpen(false)}
        onConfirm={confirmClearDone}
        title="Clear Completed Tasks"
        message="Are you sure you want to clear all completed tasks? This cannot be undone."
        confirmText="Clear Done"
        isDeleting={isClearingDone}
      />
    </div>
  );
}
