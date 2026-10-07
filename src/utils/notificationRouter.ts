import { 
  canAccessCalendar, 
  canAccessTaskBoard, 
  canAccessLeaves, 
  canAccessReverts, 
  canAccessDirectory, 
  canAccessDonations 
} from '../lib/permissions';

export type NotificationType =
  | 'event_today'
  | 'event_tomorrow'
  | 'evaluation_reminder'
  | 'task_assigned'
  | 'leave_pending'
  | 'revert_mentorship'
  | 'system';

export type EntityType =
  | 'event'
  | 'evaluation'
  | 'task'
  | 'leave'
  | 'revert'
  | 'member'
  | 'donation'
  | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType | string;
  title?: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  entity_type?: EntityType | string;
  entity_id?: string | number;
  target_tab?: string;
  action_url?: string;
  action_label?: string;
  metadata?: Record<string, any>;
}

export interface ResolvedDestination {
  tab: string;
  path: string;
  entityType?: string;
  entityId?: string | number;
  isAuthorized: boolean;
  unauthorizedMessage?: string;
}

/**
 * Whitelist of permitted internal tabs/routes.
 * Prevents arbitrary/external URL navigation attacks.
 */
export const ALLOWED_TABS = [
  'dashboard',
  'calendar',
  'task-board',
  'directory',
  'leaves',
  'evaluations',
  'reverts',
  'campaigns',
  'history',
  'settings'
] as const;

export type AllowedTab = typeof ALLOWED_TABS[number];

/**
 * Determines whether a given tab identifier is within the authorized whitelist.
 */
export function isAllowedTab(tab: string): tab is AllowedTab {
  return (ALLOWED_TABS as readonly string[]).includes(tab);
}

/**
 * Central notification-to-destination resolver.
 * Maps notification entities and types to safe, validated internal application tabs,
 * performing role-based authorization checks before navigation.
 */
export function resolveNotificationDestination(
  notification: Partial<AppNotification>,
  currentUser?: any
): ResolvedDestination {
  const entityType = notification.entity_type;
  const notifType = notification.type;
  const entityId = notification.entity_id;

  const isEvalOnly = currentUser?.account_type === 'evaluation_only' || currentUser?.role === 'evaluation_only';

  // 1. Events -> Calendar
  if (entityType === 'event' || notifType === 'event_today' || notifType === 'event_tomorrow') {
    if (isEvalOnly) {
      return {
        tab: 'evaluations',
        path: '/evaluations',
        entityType: 'event',
        entityId,
        isAuthorized: false,
        unauthorizedMessage: 'Evaluation-only accounts cannot access the Calendar.'
      };
    }
    return {
      tab: 'calendar',
      path: '/calendar',
      entityType: 'event',
      entityId,
      isAuthorized: true
    };
  }

  // 2. Peer Evaluations -> Evaluations
  if (entityType === 'evaluation' || notifType === 'evaluation_reminder' || String(notification.id || '').startsWith('eom-eval')) {
    return {
      tab: 'evaluations',
      path: '/evaluations',
      entityType: 'evaluation',
      entityId,
      isAuthorized: true
    };
  }

  // 3. Tasks -> Task Board
  if (entityType === 'task' || notifType === 'task_assigned') {
    if (!canAccessTaskBoard(currentUser)) {
      return {
        tab: 'evaluations',
        path: '/evaluations',
        entityType: 'task',
        entityId,
        isAuthorized: false,
        unauthorizedMessage: 'Evaluation-only accounts cannot access the Task Board.'
      };
    }
    return {
      tab: 'task-board',
      path: '/task-board',
      entityType: 'task',
      entityId,
      isAuthorized: true
    };
  }

  // 4. Leaves -> Leaves
  if (entityType === 'leave' || notifType === 'leave_pending') {
    if (!canAccessLeaves(currentUser)) {
      return {
        tab: 'evaluations',
        path: '/evaluations',
        entityType: 'leave',
        entityId,
        isAuthorized: false,
        unauthorizedMessage: 'Evaluation-only accounts cannot access Leaves.'
      };
    }
    return {
      tab: 'leaves',
      path: '/leaves',
      entityType: 'leave',
      entityId,
      isAuthorized: true
    };
  }

  // 5. Reverts -> Reverts
  if (entityType === 'revert' || notifType === 'revert_mentorship') {
    if (!canAccessReverts(currentUser)) {
      return {
        tab: 'dashboard',
        path: '/',
        entityType: 'revert',
        entityId,
        isAuthorized: false,
        unauthorizedMessage: 'You do not have authorization to access the Reverts module.'
      };
    }
    return {
      tab: 'reverts',
      path: '/reverts',
      entityType: 'revert',
      entityId,
      isAuthorized: true
    };
  }

  // 6. Member -> Directory
  if (entityType === 'member') {
    if (!canAccessDirectory(currentUser)) {
      return {
        tab: 'dashboard',
        path: '/',
        entityType: 'member',
        entityId,
        isAuthorized: false,
        unauthorizedMessage: 'You do not have authorization to access the Directory.'
      };
    }
    return {
      tab: 'directory',
      path: '/directory',
      entityType: 'member',
      entityId,
      isAuthorized: true
    };
  }

  // 7. Donations / Campaigns -> Campaigns
  if (entityType === 'donation') {
    if (!canAccessDonations(currentUser)) {
      return {
        tab: 'dashboard',
        path: '/',
        entityType: 'donation',
        entityId,
        isAuthorized: false,
        unauthorizedMessage: 'You do not have authorization to access Donations.'
      };
    }
    return {
      tab: 'campaigns',
      path: '/campaigns',
      entityType: 'donation',
      entityId,
      isAuthorized: true
    };
  }

  // 8. Explicit target_tab provided (with whitelist validation)
  if (notification.target_tab && isAllowedTab(notification.target_tab)) {
    const tab = notification.target_tab;
    const path = tab === 'dashboard' ? '/' : `/${tab}`;

    // Validate RBAC on explicit tab
    if (isEvalOnly && tab !== 'evaluations') {
      return {
        tab: 'evaluations',
        path: '/evaluations',
        entityId,
        isAuthorized: false,
        unauthorizedMessage: 'Evaluation-only accounts cannot access this area.'
      };
    }
    if (tab === 'reverts' && !canAccessReverts(currentUser)) {
      return { tab: 'dashboard', path: '/', isAuthorized: false, unauthorizedMessage: 'Access to Reverts is restricted.' };
    }
    if (tab === 'directory' && !canAccessDirectory(currentUser)) {
      return { tab: 'dashboard', path: '/', isAuthorized: false, unauthorizedMessage: 'Access to Directory is restricted.' };
    }
    if ((tab === 'campaigns' || tab === 'history') && !canAccessDonations(currentUser)) {
      return { tab: 'dashboard', path: '/', isAuthorized: false, unauthorizedMessage: 'Access to Donations is restricted.' };
    }

    return {
      tab,
      path,
      entityType,
      entityId,
      isAuthorized: true
    };
  }

  // Fallback safe default
  return {
    tab: isEvalOnly ? 'evaluations' : 'dashboard',
    path: isEvalOnly ? '/evaluations' : '/',
    isAuthorized: true
  };
}
