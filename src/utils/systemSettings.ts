export interface LeavePolicies {
  vacationCredits: number;
  sickCredits: number;
  emergencyCredits: number;
  maxConsecutiveVacationDays: number;
  maxStaffOnVacationPerMonth: number;
}

export interface RestrictedPeriod {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface OrganizationSettings {
  companyName: string;
  chapter: string;
  departments: string[];
}

export interface SystemSettingsData {
  leavePolicies: LeavePolicies;
  restrictedPeriods: RestrictedPeriod[];
  organization: OrganizationSettings;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettingsData = {
  leavePolicies: {
    vacationCredits: 15,
    sickCredits: 12,
    emergencyCredits: 3,
    maxConsecutiveVacationDays: 7,
    maxStaffOnVacationPerMonth: 3,
  },
  restrictedPeriods: [
    {
      id: 'ramadan-2026',
      title: 'Ramadan 2026',
      startDate: '2026-02-18',
      endDate: '2026-03-20',
      description: 'Holy month of fasting and intensified mosque programming.',
    },
    {
      id: 'year-end-2026',
      title: 'Year-End Planning & Audit',
      startDate: '2026-12-20',
      endDate: '2026-12-31',
      description: 'Annual financial consolidation and organizational audit.',
    },
  ],
  organization: {
    companyName: 'Al-Jalis As-Salih',
    chapter: 'Cotabato Chapter',
    departments: [
      'Admin',
      'Academics',
      'New Muslim',
      "Da'wah",
      'Multimedia',
      "Women's",
    ],
  },
};

const STORAGE_KEY = 'hrms_system_settings_v2';
const DEPARTMENTS_KEY = 'hrms_departments';

export function getSystemSettings(): SystemSettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        leavePolicies: {
          ...DEFAULT_SYSTEM_SETTINGS.leavePolicies,
          ...(parsed.leavePolicies || {}),
        },
        restrictedPeriods: Array.isArray(parsed.restrictedPeriods)
          ? parsed.restrictedPeriods
          : DEFAULT_SYSTEM_SETTINGS.restrictedPeriods,
        organization: {
          ...DEFAULT_SYSTEM_SETTINGS.organization,
          ...(parsed.organization || {}),
          departments: Array.isArray(parsed.organization?.departments) && parsed.organization.departments.length > 0
            ? parsed.organization.departments
            : DEFAULT_SYSTEM_SETTINGS.organization.departments,
        },
      };
    }
  } catch (error) {
    console.error('Error reading system settings from localStorage:', error);
  }
  return DEFAULT_SYSTEM_SETTINGS;
}

export function saveSystemSettings(settings: SystemSettingsData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(settings.organization.departments));
    window.dispatchEvent(new Event('system-settings-updated'));
    window.dispatchEvent(new Event('departments-updated'));
  } catch (error) {
    console.error('Error saving system settings to localStorage:', error);
  }
}

export function getStoredDepartments(): string[] {
  try {
    const raw = localStorage.getItem(DEPARTMENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error reading departments from localStorage:', error);
  }
  return DEFAULT_SYSTEM_SETTINGS.organization.departments;
}

export function isDateInRestrictedPeriod(startDate: string, endDate: string): RestrictedPeriod | null {
  const settings = getSystemSettings();
  if (!settings.restrictedPeriods || settings.restrictedPeriods.length === 0) return null;
  if (!startDate || !endDate) return null;

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  for (const period of settings.restrictedPeriods) {
    const periodStart = new Date(period.startDate).getTime();
    const periodEnd = new Date(period.endDate).getTime();

    // Check for any overlap between [start, end] and [periodStart, periodEnd]
    if (start <= periodEnd && end >= periodStart) {
      return period;
    }
  }
  return null;
}
