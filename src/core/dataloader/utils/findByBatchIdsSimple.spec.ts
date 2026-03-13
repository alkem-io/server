import { vi } from 'vitest';
import { findByBatchIdsSimple } from './findByBatchIdsSimple';

describe('findByBatchIdsSimple', () => {
  function makeManager(results: any[] = []) {
    return {
      find: vi.fn().mockResolvedValue(results),
    } as any;
  }

  class TestEntity {
    id!: string;
    name!: string;
  }

  const defaultOptions = {
    resolveToNull: false,
    select: {} as any,
    authorize: vi.fn(),
    checkResultPrivilege: undefined,
    checkParentPrivilege: undefined,
    limit: undefined,
  } as any;

  it('returns empty array for empty ids', async () => {
    const manager = makeManager();
    const result = await findByBatchIdsSimple(
      manager,
      TestEntity,
      [],
      defaultOptions
    );
    expect(result).toEqual([]);
    expect(manager.find).not.toHaveBeenCalled();
  });

  it('returns entities in the order of input ids', async () => {
    const entity1 = { id: 'id-1', name: 'one' };
    const entity2 = { id: 'id-2', name: 'two' };
    // Note: find may return in different order
    const manager = makeManager([entity2, entity1]);

    const result = await findByBatchIdsSimple(
      manager,
      TestEntity,
      ['id-1', 'id-2'],
      defaultOptions
    );

    expect(result).toHaveLength(2);
    expect((result[0] as any).id).toBe('id-1');
    expect((result[1] as any).id).toBe('id-2');
  });

  it('returns EntityNotFoundException for missing ids when resolveToNull is false', async () => {
    const entity1 = { id: 'id-1', name: 'one' };
    const manager = makeManager([entity1]);

    const result = await findByBatchIdsSimple(
      manager,
      TestEntity,
      ['id-1', 'id-missing'],
      { ...defaultOptions, resolveToNull: false }
    );

    expect(result).toHaveLength(2);
    expect((result[0] as any).id).toBe('id-1');
    expect(result[1]).toBeInstanceOf(Error);
  });

  it('returns null for missing ids when resolveToNull is true', async () => {
    const manager = makeManager([]);

    const result = await findByBatchIdsSimple(
      manager,
      TestEntity,
      ['id-missing'],
      { ...defaultOptions, resolveToNull: true }
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toBeNull();
  });

  it('throws NotImplementedException when checkParentPrivilege is set', async () => {
    const manager = makeManager();

    await expect(
      findByBatchIdsSimple(manager, TestEntity, ['id-1'], {
        ...defaultOptions,
        checkParentPrivilege: 'READ',
      })
    ).rejects.toThrow(
      'Checking parent privilege is not supported for simple batch loading'
    );
  });

  it('returns ForbiddenAuthorizationPolicyException when authorization check fails', async () => {
    const { ForbiddenAuthorizationPolicyException } = await import(
      '@common/exceptions'
    );
    const entity1 = { id: 'id-1', name: 'one', authorization: {} };
    const manager = makeManager([entity1]);
    const authError = new ForbiddenAuthorizationPolicyException(
      'Forbidden',
      'READ' as any,
      'auth-1',
      'actor-1'
    );

    const result = await findByBatchIdsSimple(manager, TestEntity, ['id-1'], {
      ...defaultOptions,
      checkResultPrivilege: 'READ',
      authorize: vi.fn(() => {
        throw authError;
      }),
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(authError);
  });

  it('returns entity when authorization check passes', async () => {
    const entity1 = { id: 'id-1', name: 'one', authorization: {} };
    const manager = makeManager([entity1]);

    const result = await findByBatchIdsSimple(manager, TestEntity, ['id-1'], {
      ...defaultOptions,
      checkResultPrivilege: 'READ',
      authorize: vi.fn().mockReturnValue(true),
    });

    expect(result).toHaveLength(1);
    expect((result[0] as any).id).toBe('id-1');
  });

  it('passes select and limit options to manager.find', async () => {
    const manager = makeManager([]);
    const select = { id: true, name: true } as any;

    await findByBatchIdsSimple(manager, TestEntity, ['id-1'], {
      ...defaultOptions,
      select,
      limit: 10,
    });

    expect(manager.find).toHaveBeenCalledWith(
      TestEntity,
      expect.objectContaining({
        take: 10,
        select,
      })
    );
  });
});
