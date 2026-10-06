export const canManagePersonnel = (role: string) => 
  ['admin', 'admin_director', 'admin_hr'].includes(role);

export const canManageFinance = (role: string) => 
  ['admin', 'admin_director', 'admin_finance'].includes(role);

export const canManageOperations = (role: string) => 
  ['admin', 'admin_director', 'admin_hr', 'admin_finance', 'admin_dept_head', 'staff'].includes(role);
