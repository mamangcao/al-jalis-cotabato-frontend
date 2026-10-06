export interface EvaluationRatings {
  teamwork: number;
  communication: number;
  leadership: number;
  adherenceToValues: number;
}

export interface EvaluationFeedback {
  strengths: string;
  areasToImprove: string;
}

export interface AnonymousEvaluation {
  id: string;
  targetUserId: string;
  reviewerId: null; // STRIPPED FOR ANONYMITY
  isAnonymous: true;
  ratings: EvaluationRatings;
  feedback: EvaluationFeedback;
  createdAt: string;
}

const STORAGE_KEY = 'al_jalis_anonymous_evaluations';

// Initial baseline mock evaluations so users can experience both reading & writing immediately
const INITIAL_EVALUATIONS: AnonymousEvaluation[] = [
  {
    id: 'eval_mock_1',
    targetUserId: 'staff_123', // Brother Ali
    reviewerId: null,
    isAnonymous: true,
    ratings: {
      teamwork: 5,
      communication: 4,
      leadership: 5,
      adherenceToValues: 5,
    },
    feedback: {
      strengths: 'Outstanding reliability during major center events, meticulous financial oversight, and very approachable when volunteers need guidance.',
      areasToImprove: 'Could delegate routine report generation more frequently to prevent end-of-quarter bottlenecks.'
    },
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'eval_mock_2',
    targetUserId: 'staff_123', // Brother Ali
    reviewerId: null,
    isAnonymous: true,
    ratings: {
      teamwork: 4,
      communication: 5,
      leadership: 4,
      adherenceToValues: 5,
    },
    feedback: {
      strengths: 'Always speaks with adab and clarity during planning sessions. Consistently exemplifies Islamic ethics in center operations.',
      areasToImprove: 'Follow-ups on WhatsApp committee channels could be a bit speedier during intensive campaign weeks.'
    },
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'eval_mock_3',
    targetUserId: '4', // Fatima Reyes (Center Director)
    reviewerId: null,
    isAnonymous: true,
    ratings: {
      teamwork: 5,
      communication: 5,
      leadership: 5,
      adherenceToValues: 5,
    },
    feedback: {
      strengths: 'Visionary leadership, keeps the chapter focused on grassroots Da\'wah and revert care, highly supportive of staff initiatives.',
      areasToImprove: 'Holding open monthly office hours for junior volunteers would provide valuable mentorship opportunities.'
    },
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'eval_mock_4',
    targetUserId: '1', // Ahmad Abdullah (President)
    reviewerId: null,
    isAnonymous: true,
    ratings: {
      teamwork: 5,
      communication: 4,
      leadership: 5,
      adherenceToValues: 5,
    },
    feedback: {
      strengths: 'Firm and fair guidance across all council decisions. Always ensures Shariah principles guide our outreach programs.',
      areasToImprove: 'Ensure task agendas are sent out 24 hours prior to executive committee meetings.'
    },
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  }
];

import { api } from '../services/api';

export function getStoredEvaluations(): AnonymousEvaluation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EVALUATIONS));
      return INITIAL_EVALUATIONS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load evaluations from storage:', err);
    return INITIAL_EVALUATIONS;
  }
}

export async function fetchEvaluationsFromApi(): Promise<AnonymousEvaluation[]> {
  try {
    const data = await api.evaluations.getAll();
    if (Array.isArray(data) && data.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('evaluations-updated', { detail: data }));
      return data;
    }
  } catch (err) {
    console.warn('Could not fetch evaluations from API, using cached data.', err);
  }
  return getStoredEvaluations();
}

export async function saveEvaluation(params: {
  targetUserId: string;
  ratings: EvaluationRatings;
  feedback: EvaluationFeedback;
}): Promise<AnonymousEvaluation> {
  // CRITICAL PRIVACY SAFEGUARD:
  // Reviewer identity is completely stripped and never recorded in state or payload
  const fallbackPayload: AnonymousEvaluation = {
    id: 'eval_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    targetUserId: params.targetUserId,
    reviewerId: null, // STRIPPED FOR ANONYMITY
    isAnonymous: true,
    ratings: params.ratings,
    feedback: {
      strengths: params.feedback.strengths.trim(),
      areasToImprove: params.feedback.areasToImprove.trim()
    },
    createdAt: new Date().toISOString()
  };

  try {
    const remote = await api.evaluations.create({
      targetUserId: params.targetUserId,
      ratings: params.ratings,
      feedback: {
        strengths: params.feedback.strengths.trim(),
        areasToImprove: params.feedback.areasToImprove.trim()
      },
      isAnonymous: true,
    }).catch(() => null);

    const savedRecord = remote || fallbackPayload;
    const current = getStoredEvaluations();
    const updated = [savedRecord, ...current.filter(e => e.id !== savedRecord.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('evaluations-updated', { detail: savedRecord }));
    return savedRecord;
  } catch (err) {
    console.error('Failed to save evaluation to storage:', err);
    return fallbackPayload;
  }
}

/**
 * The "Last Week Only" Time Lock:
 * Checks if current date is within the last 7 days of the month.
 */
export const isLastWeekOfMonth = (): boolean => {
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return (lastDayOfMonth.getDate() - today.getDate()) <= 7;
};

/**
 * End-of-Month Date Utility:
 * Checks if current date is within the last 3 days of the month.
 */
export const isEndOfMonth = (): boolean => {
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysRemaining = lastDayOfMonth.getDate() - today.getDate();
  return daysRemaining <= 3; // Triggers in the final 3 days
};

/**
 * Generates an array of past month options for dropdowns.
 * Each item has { value: "YYYY-MM", label: "MonthName YYYY" }.
 */
export const getRecentMonths = (count = 12): { value: string; label: string }[] => {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const value = `${year}-${month}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    months.push({ value, label });
  }
  return months;
};

