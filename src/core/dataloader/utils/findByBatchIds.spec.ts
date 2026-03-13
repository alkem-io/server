import { AuthorizationPrivilege } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { findByBatchIds } from './findByBatchIds';

describe('findByBatchIds', () => {
  const createMockManager = (results: any[]) => ({
    find: vi.fn().mockResolvedValue(results),
  });

  const classRef = class TestEntity {} as any;

  it('should return empty array for empty ids', async () => {
    const manager = createMockManager([]);

    const result = await findByBatchIds(
      manager as any,
      classRef,
      [],
      { child: true },
      {
        select: {},
        authorize: vi.fn(),
      } as any
    );

    expect(result).toEqual([]);
    expect(manager.find).not.toHaveBeenCalled();
  });

  it('should throw when relations have more than one top-level key', async () => {
    const manager = createMockManager([]);

    await expect(
      findByBatchIds(
        manager as any,
        classRef,
        ['id1'],
        { child1: true, child2: true },
        {
          select: {},
          authorize: vi.fn(),
        } as any
      )
    ).rejects.toThrow("'relations' support only one top level relation");
  });

  it('should return results mapped by ids', async () => {
    const parent1 = { id: 'id1', child: { name: 'child1' } };
    const parent2 = { id: 'id2', child: { name: 'child2' } };
    const manager = createMockManager([parent1, parent2]);

    const result = await findByBatchIds(
      manager as any,
      classRef,
      ['id1', 'id2'],
      { child: true },
      {
        select: {},
        authorize: vi.fn(),
      } as any
    );

    expect(result).toEqual([{ name: 'child1' }, { name: 'child2' }]);
  });

  it('should return EntityNotFoundException for missing ids when resolveToNull is false', async () => {
    const parent1 = { id: 'id1', child: { name: 'child1' } };
    const manager = createMockManager([parent1]);

    const result = await findByBatchIds(
      manager as any,
      classRef,
      ['id1', 'missing-id'],
      { child: true },
      {
        select: {},
        authorize: vi.fn(),
        resolveToNull: false,
      } as any
    );

    expect(result[0]).toEqual({ name: 'child1' });
    expect(result[1]).toBeInstanceOf(EntityNotFoundException);
  });

  it('should return null for missing ids when resolveToNull is true', async () => {
    const parent1 = { id: 'id1', child: { name: 'child1' } };
    const manager = createMockManager([parent1]);

    const result = await findByBatchIds(
      manager as any,
      classRef,
      ['id1', 'missing-id'],
      { child: true },
      {
        select: {},
        authorize: vi.fn(),
        resolveToNull: true,
      } as any
    );

    expect(result[0]).toEqual({ name: 'child1' });
    expect(result[1]).toBeNull();
  });

  it('should use getResult when provided', async () => {
    const parent1 = { id: 'id1', nested: { deep: 'value' } };
    const manager = createMockManager([parent1]);

    const result = await findByBatchIds(
      manager as any,
      classRef,
      ['id1'],
      { nested: true },
      {
        select: {},
        authorize: vi.fn(),
        getResult: (parent: any) => parent.nested.deep,
      } as any
    );

    expect(result).toEqual(['value']);
  });

  it('should return ForbiddenAuthorizationPolicyException when checkParentPrivilege fails', async () => {
    const parent1 = {
      id: 'id1',
      child: { name: 'child1' },
      authorization: { id: 'auth1' },
    };
    const manager = createMockManager([parent1]);

    const forbiddenError = new ForbiddenAuthorizationPolicyException(
      'access denied',
      AuthorizationPrivilege.READ,
      'auth1',
      'user1'
    );
    const authorize = vi.fn().mockImplementation(() => {
      throw forbiddenError;
    });

    const result = await findByBatchIds(
      manager as any,
      classRef,
      ['id1'],
      { child: true },
      {
        select: {},
        authorize,
        checkParentPrivilege: AuthorizationPrivilege.READ,
      } as any
    );

    expect(result[0]).toBe(forbiddenError);
  });

  it('should return ForbiddenAuthorizationPolicyException when checkResultPrivilege fails', async () => {
    const parent1 = {
      id: 'id1',
      child: { name: 'child1', authorization: { id: 'auth2' } },
    };
    const manager = createMockManager([parent1]);

    const forbiddenError = new ForbiddenAuthorizationPolicyException(
      'access denied',
      AuthorizationPrivilege.READ,
      'auth2',
      'user1'
    );
    const authorize = vi.fn().mockImplementation(() => {
      throw forbiddenError;
    });

    const result = await findByBatchIds(
      manager as any,
      classRef,
      ['id1'],
      { child: true },
      {
        select: {},
        authorize,
        checkResultPrivilege: AuthorizationPrivilege.READ,
      } as any
    );

    expect(result[0]).toBe(forbiddenError);
  });

  it('should pass limit option to manager.find', async () => {
    const manager = createMockManager([]);

    await findByBatchIds(manager as any, classRef, ['id1'], { child: true }, {
      select: {},
      authorize: vi.fn(),
      limit: 10,
    } as any);

    expect(manager.find).toHaveBeenCalledWith(
      classRef,
      expect.objectContaining({ take: 10 })
    );
  });
});
