// Spec §12's exact five statuses for the pre-activity SOP readiness view. A pure function so it
// can be unit-tested without a database, the same approach as modules/reports/formula.ts in S3.1.
export type ReadinessStatus = 'COMPLETED' | 'PENDING' | 'AT_RISK' | 'DELAYED' | 'NOT_APPLICABLE';

export interface ReadinessResult {
  status: ReadinessStatus;
  percentComplete: number | null;
  resolvedCount: number;
  totalCount: number;
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Rolls up one activity's SOP checklist responses into the spec's five-value status.
 *
 * - No checklist configured for this stage at all -> NOT_APPLICABLE (nothing to be ready for).
 * - Every item resolved (COMPLETED or explicitly NOT_APPLICABLE) -> COMPLETED.
 * - Otherwise, judged against the planned date: in the past and still incomplete -> DELAYED;
 *   today, incomplete, and the worker hasn't checked in yet -> AT_RISK (still time, but tight);
 *   anything further out -> PENDING (no cause for concern yet).
 *
 * This is a practical reading of an underspecified rule (the spec names the five statuses but
 * not their exact triggers) — logged as an assumption, not guessed silently.
 */
export function computeReadiness(
  itemStatuses: { isMandatory: boolean; status: 'PENDING' | 'COMPLETED' | 'NOT_APPLICABLE' }[],
  plannedDate: Date,
  hasCheckedIn: boolean,
  now: Date = new Date(),
): ReadinessResult {
  const totalCount = itemStatuses.length;
  if (totalCount === 0) {
    return { status: 'NOT_APPLICABLE', percentComplete: null, resolvedCount: 0, totalCount: 0 };
  }

  const resolvedCount = itemStatuses.filter((i) => i.status === 'COMPLETED' || i.status === 'NOT_APPLICABLE').length;
  const percentComplete = Math.round((resolvedCount / totalCount) * 100);

  if (resolvedCount === totalCount) {
    return { status: 'COMPLETED', percentComplete, resolvedCount, totalCount };
  }

  const today = startOfDay(now);
  const planned = startOfDay(plannedDate);

  if (planned < today) {
    return { status: 'DELAYED', percentComplete, resolvedCount, totalCount };
  }
  if (planned === today && !hasCheckedIn) {
    return { status: 'AT_RISK', percentComplete, resolvedCount, totalCount };
  }
  return { status: 'PENDING', percentComplete, resolvedCount, totalCount };
}
