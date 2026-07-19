import { computeReadiness } from '../../src/modules/workflows/readiness';

describe('computeReadiness (spec §12 five-status rollup)', () => {
  it('NOT_APPLICABLE when the stage has no checklist configured', () => {
    const result = computeReadiness([], new Date('2026-07-18'), false, new Date('2026-07-18'));
    expect(result).toEqual({ status: 'NOT_APPLICABLE', percentComplete: null, resolvedCount: 0, totalCount: 0 });
  });

  it('COMPLETED when every item is resolved, including NOT_APPLICABLE items', () => {
    const items = [
      { isMandatory: true, status: 'COMPLETED' as const },
      { isMandatory: false, status: 'NOT_APPLICABLE' as const },
    ];
    const result = computeReadiness(items, new Date('2026-07-18'), true, new Date('2026-07-18'));
    expect(result.status).toBe('COMPLETED');
    expect(result.percentComplete).toBe(100);
  });

  it('DELAYED when the planned date has passed and items remain unresolved', () => {
    const items = [{ isMandatory: true, status: 'PENDING' as const }];
    const result = computeReadiness(items, new Date('2026-07-15'), false, new Date('2026-07-18'));
    expect(result.status).toBe('DELAYED');
    expect(result.percentComplete).toBe(0);
  });

  it('AT_RISK when planned for today, incomplete, and no check-in yet', () => {
    const items = [
      { isMandatory: true, status: 'COMPLETED' as const },
      { isMandatory: true, status: 'PENDING' as const },
    ];
    const result = computeReadiness(items, new Date('2026-07-18'), false, new Date('2026-07-18'));
    expect(result.status).toBe('AT_RISK');
    expect(result.percentComplete).toBe(50);
  });

  it('PENDING when planned for a future date', () => {
    const items = [{ isMandatory: true, status: 'PENDING' as const }];
    const result = computeReadiness(items, new Date('2026-07-25'), false, new Date('2026-07-18'));
    expect(result.status).toBe('PENDING');
  });

  it('today + already checked in, still incomplete -> PENDING, not AT_RISK (the risk was about readiness before departure)', () => {
    const items = [{ isMandatory: true, status: 'PENDING' as const }];
    const result = computeReadiness(items, new Date('2026-07-18'), true, new Date('2026-07-18'));
    expect(result.status).toBe('PENDING');
  });
});
