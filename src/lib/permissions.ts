import { User } from '../AuthContext';

export const canManagePersonnel = (role: string = '') => 
  ['admin', 'admin_director', 'director', 'admin_hr', 'hr', 'super_admin'].includes(role);

export const canManageFinance = (role: string = '') => 
  ['admin', 'admin_director', 'director', 'admin_finance', 'finance', 'super_admin'].includes(role);

export const canManageOperations = (role: string = '') => 
  ['admin', 'admin_director', 'director', 'admin_hr', 'hr', 'admin_finance', 'finance', 'super_admin', 'executive_secretary', 'department_head', 'staff'].includes(role);

export const canProvisionAccounts = (user?: Partial<User> | null) => {
  if (!user || !user.role) return false;
  return ['hr', 'admin_hr', 'super_admin'].includes(user.role);
};

export const canAccessReverts = (user?: Partial<User> | null) => {
  if (!user) return false;
  if (user.account_type === 'evaluation_only' || user.role === 'evaluation_only') return false;
  if (['super_admin', 'director', 'admin_director', 'admin'].includes(user.role || '')) return true;

  const dept = (user.department || '').toLowerCase();
  return dept.includes('new muslim') || 
         dept.includes("da'wah") || 
         dept.includes('dawah') || 
         dept.includes('women');
};

export const canAccessDonations = (user?: Partial<User> | null) => {
  if (!user) return false;
  if (user.account_type === 'evaluation_only' || user.role === 'evaluation_only') return false;
  return ['super_admin', 'director', 'admin_director', 'admin', 'executive_secretary', 'finance', 'admin_finance'].includes(user.role || '');
};

export const canAccessDirectory = (user?: Partial<User> | null) => {
  if (!user) return false;
  if (user.account_type === 'evaluation_only' || user.role === 'evaluation_only') return false;
  return ['super_admin', 'director', 'admin_director', 'admin', 'hr', 'admin_hr', 'executive_secretary'].includes(user.role || '');
};

export const canAccessTaskBoard = (user?: Partial<User> | null) => {
  if (!user) return false;
  return user.account_type !== 'evaluation_only' && user.role !== 'evaluation_only';
};

export const canAccessCalendar = (user?: Partial<User> | null) => {
  if (!user) return false;
  return user.account_type !== 'evaluation_only' && user.role !== 'evaluation_only';
};

export const canAccessLeaves = (user?: Partial<User> | null) => {
  if (!user) return false;
  return user.account_type !== 'evaluation_only' && user.role !== 'evaluation_only';
};

export const canAccessNoticeboard = (user?: Partial<User> | null) => {
  if (!user) return false;
  return user.account_type !== 'evaluation_only' && user.role !== 'evaluation_only';
};

export const canCreateOfficialNotice = (user?: Partial<User> | null) => {
  if (!user) return false;
  if (user.account_type === 'evaluation_only' || user.role === 'evaluation_only') return false;
  return ['super_admin', 'director', 'admin_director', 'admin', 'hr', 'admin_hr', 'executive_secretary', 'department_head'].includes(user.role || '');
};

export const canCreateStaffPost = (user?: Partial<User> | null) => {
  if (!user) return false;
  return user.account_type !== 'evaluation_only' && user.role !== 'evaluation_only';
};

export const canCreateStaffNote = (user?: Partial<User> | null) => {
  if (!user) return false;
  return user.account_type !== 'evaluation_only' && user.role !== 'evaluation_only';
};

export const canModerateNotices = (user?: Partial<User> | null) => {
  if (!user) return false;
  if (user.account_type === 'evaluation_only' || user.role === 'evaluation_only') return false;
  return ['super_admin', 'director', 'admin_director', 'admin', 'hr', 'admin_hr', 'executive_secretary'].includes(user.role || '');
};

export const canManageNotice = (notice: any, user?: Partial<User> | null) => {
  if (!user) return false;
  if (user.account_type === 'evaluation_only' || user.role === 'evaluation_only') return false;
  if (canModerateNotices(user)) return true;
  if (user.id && notice?.created_by_user_id && String(notice.created_by_user_id) === String(user.id)) return true;
  if (user.role === 'department_head' && notice?.department && notice.department === user.department) return true;
  return false;
};


