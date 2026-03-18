import { Brackets } from 'typeorm';
import { applyOrganizationFilter } from './organizationFilter';

describe('applyOrganizationFilter', () => {
  const createMockQueryBuilder = (hasWheres = false) => {
    const qb: any = {
      expressionMap: { wheres: hasWheres ? [{}] : [] },
      where: vi.fn().mockImplementation(function (this: any, arg: any) {
        // Invoke the Brackets callback if it's a Brackets instance
        if (arg instanceof Brackets) {
          const wqb = {
            where: vi.fn(),
            orWhere: vi.fn(),
          };
          (arg as any).whereFactory(wqb);
          qb._lastWqb = wqb;
        }
        return qb;
      }),
      andWhere: vi.fn().mockImplementation(function (this: any, arg: any) {
        if (arg instanceof Brackets) {
          const wqb = {
            where: vi.fn(),
            orWhere: vi.fn(),
          };
          (arg as any).whereFactory(wqb);
          qb._lastWqb = wqb;
        }
        return qb;
      }),
      orWhere: vi.fn().mockImplementation(function (this: any, arg: any) {
        if (arg instanceof Brackets) {
          const wqb = {
            where: vi.fn(),
            orWhere: vi.fn(),
          };
          (arg as any).whereFactory(wqb);
          qb._lastWqb = wqb;
        }
        return qb;
      }),
      leftJoin: vi.fn().mockReturnThis(),
      _lastWqb: null as any,
    };
    return qb;
  };

  it('should return query unchanged for empty filter', () => {
    const qb = createMockQueryBuilder();

    applyOrganizationFilter(qb, {} as any);

    expect(qb.where).not.toHaveBeenCalled();
    expect(qb.andWhere).not.toHaveBeenCalled();
  });

  it('should apply where clause for filter without displayName', () => {
    const qb = createMockQueryBuilder();

    applyOrganizationFilter(qb, { nameID: 'test-org' } as any);

    expect(qb.where).toHaveBeenCalled();
  });

  it('should apply andWhere when query already has wheres and bindOperator is and', () => {
    const qb = createMockQueryBuilder(true);

    applyOrganizationFilter(qb, { nameID: 'test-org' } as any, 'and');

    expect(qb.andWhere).toHaveBeenCalled();
  });

  it('should apply orWhere when query already has wheres and bindOperator is or', () => {
    const qb = createMockQueryBuilder(true);

    applyOrganizationFilter(qb, { nameID: 'test-org' } as any, 'or');

    expect(qb.orWhere).toHaveBeenCalled();
  });

  it('should leftJoin profile and apply displayName filter with where when only displayName', () => {
    const qb = createMockQueryBuilder();

    applyOrganizationFilter(qb, { displayName: 'Acme' } as any);

    expect(qb.leftJoin).toHaveBeenCalledWith('organization.profile', 'profile');
    expect(qb.where).toHaveBeenCalled();
    // The inner wqb should have used .where (not orWhere) since there are no rest keys
    expect(qb._lastWqb.where).toHaveBeenCalledWith(
      'profile.displayName ILIKE :orgDisplayName',
      { orgDisplayName: '%Acme%' }
    );
  });

  it('should apply orWhere for displayName when rest filters are present', () => {
    const qb = createMockQueryBuilder();

    applyOrganizationFilter(qb, {
      displayName: 'Acme',
      nameID: 'acme',
    } as any);

    expect(qb.leftJoin).toHaveBeenCalledWith('organization.profile', 'profile');
    expect(qb._lastWqb.orWhere).toHaveBeenCalledWith(
      'profile.displayName ILIKE :orgDisplayName',
      { orgDisplayName: '%Acme%' }
    );
  });
});
