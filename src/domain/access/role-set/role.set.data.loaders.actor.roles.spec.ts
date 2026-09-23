import { RoleName } from '@common/enums/role.name';
import { ActorService } from '@domain/actor/actor/actor.service';
import { ICredential } from '@domain/actor/credential/credential.interface';
import { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';
import { RoleSetActorRolesDataLoader } from './role.set.data.loaders.actor.roles';
import { RoleSet } from './role.set.entity';
import { IRoleSet } from './role.set.interface';
import { RoleSetCacheService } from './role.set.service.cache';
import { ActorRoleKey } from './types';

/* ───────── helpers ───────── */

type RoleDef = {
  name: RoleName;
  credential: { type: string; resourceID: string };
};

function makeCredential(type: string, resourceID: string): ICredential {
  return { type, resourceID } as unknown as ICredential;
}

function makeRoleSet(id: string, roles?: RoleDef[]): IRoleSet {
  return {
    id,
    roles: roles?.map((r, i) => ({
      id: `role-${i}`,
      name: r.name,
      credential: r.credential,
    })),
  } as unknown as IRoleSet;
}

function memberRoleSet(id: string): IRoleSet {
  return makeRoleSet(id, [
    {
      name: RoleName.MEMBER,
      credential: { type: 'space-member', resourceID: id },
    },
  ]);
}

function makeKey(actorID: string, roleSet: IRoleSet): ActorRoleKey {
  return {
    actorContext: { actorID, userID: actorID } as any,
    roleSet,
  };
}

function mockActorCredentialsFromMap(
  actorService: Mocked<Pick<ActorService, 'getActorCredentials'>>,
  credMap: Map<string, ICredential[]>
) {
  actorService.getActorCredentials.mockImplementation(
    async (actorID: string) => ({
      actor: { id: actorID } as any,
      credentials: credMap.get(actorID) || [],
    })
  );
}

/* ───────── mocks ───────── */

function createMocks() {
  const actorService: Mocked<Pick<ActorService, 'getActorCredentials'>> = {
    getActorCredentials: vi
      .fn()
      .mockResolvedValue({ actor: {}, credentials: [] }),
  };

  const roleSetCacheService: Mocked<
    Pick<
      RoleSetCacheService,
      'getActorRolesBatchFromCache' | 'setActorRolesCache'
    >
  > = {
    getActorRolesBatchFromCache: vi
      .fn()
      .mockImplementation(
        async (entries: ReadonlyArray<unknown>) =>
          entries.map(() => undefined) as (RoleName[] | undefined)[]
      ),
    setActorRolesCache: vi.fn().mockResolvedValue([]),
  };

  const roleSetRepository: Mocked<Pick<Repository<RoleSet>, 'find'>> = {
    find: vi.fn().mockResolvedValue([]),
  };

  return { actorService, roleSetCacheService, roleSetRepository };
}

function createLoader(mocks: ReturnType<typeof createMocks>) {
  return new RoleSetActorRolesDataLoader(
    mocks.actorService as unknown as ActorService,
    mocks.roleSetCacheService as unknown as RoleSetCacheService,
    mocks.roleSetRepository as unknown as Repository<RoleSet>
  );
}

describe('RoleSetActorRolesDataLoader', () => {
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    mocks = createMocks();
  });

  describe('batching', () => {
    it.each([
      1, 10, 50, 250,
    ])('loads credentials once for %i memberships of one actor', async n => {
      const roleSets = Array.from({ length: n }, (_, i) =>
        memberRoleSet(`rs-${i}`)
      );
      mockActorCredentialsFromMap(
        mocks.actorService,
        new Map([
          [
            'actor-1',
            roleSets.map(rs => makeCredential('space-member', rs.id)),
          ],
        ])
      );
      const loader = createLoader(mocks);

      const results = await Promise.all(
        roleSets.map(rs => loader.loader.load(makeKey('actor-1', rs)))
      );

      expect(results).toHaveLength(n);
      for (const roles of results) {
        expect(roles).toEqual([RoleName.MEMBER]);
      }
      expect(mocks.actorService.getActorCredentials).toHaveBeenCalledTimes(1);
      expect(
        mocks.roleSetCacheService.getActorRolesBatchFromCache
      ).toHaveBeenCalledTimes(1);
      expect(
        mocks.roleSetCacheService.getActorRolesBatchFromCache.mock.calls[0][0]
      ).toHaveLength(n);
      expect(mocks.roleSetRepository.find).not.toHaveBeenCalled();
    });

    it('batch-loads role definitions once for role sets missing them', async () => {
      const ids = ['rs-1', 'rs-2', 'rs-3', 'rs-4', 'rs-5'];
      const roleSets = ids.map(id => makeRoleSet(id));
      mocks.roleSetRepository.find.mockResolvedValue(
        ids.map(id => memberRoleSet(id) as unknown as RoleSet)
      );
      mockActorCredentialsFromMap(
        mocks.actorService,
        new Map([['actor-1', [makeCredential('space-member', 'rs-3')]]])
      );
      const loader = createLoader(mocks);

      const results = await Promise.all(
        roleSets.map(rs => loader.loader.load(makeKey('actor-1', rs)))
      );

      expect(results).toEqual([[], [], [RoleName.MEMBER], [], []]);
      expect(mocks.roleSetRepository.find).toHaveBeenCalledTimes(1);
    });

    it('resolves anonymous keys to no roles without any lookup', async () => {
      const loader = createLoader(mocks);

      const results = await Promise.all([
        loader.loader.load(makeKey('', memberRoleSet('rs-1'))),
        loader.loader.load(makeKey('', memberRoleSet('rs-2'))),
      ]);

      expect(results).toEqual([[], []]);
      expect(mocks.actorService.getActorCredentials).not.toHaveBeenCalled();
      expect(mocks.roleSetRepository.find).not.toHaveBeenCalled();
    });

    it('loads credentials once per actor when a batch mixes actors', async () => {
      const rs1 = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'rs-1' },
        },
        {
          name: RoleName.LEAD,
          credential: { type: 'space-lead', resourceID: 'rs-1' },
        },
      ]);
      const rs2 = memberRoleSet('rs-2');
      mockActorCredentialsFromMap(
        mocks.actorService,
        new Map([
          ['actor-a', [makeCredential('space-member', 'rs-1')]],
          [
            'actor-b',
            [
              makeCredential('space-member', 'rs-1'),
              makeCredential('space-lead', 'rs-1'),
            ],
          ],
          ['actor-c', [makeCredential('space-member', 'rs-2')]],
        ])
      );
      const loader = createLoader(mocks);

      const [a1, a2, b1, b2, c1, c2] = await Promise.all([
        loader.loader.load(makeKey('actor-a', rs1)),
        loader.loader.load(makeKey('actor-a', rs2)),
        loader.loader.load(makeKey('actor-b', rs1)),
        loader.loader.load(makeKey('actor-b', rs2)),
        loader.loader.load(makeKey('actor-c', rs1)),
        loader.loader.load(makeKey('actor-c', rs2)),
      ]);

      expect(a1).toEqual([RoleName.MEMBER]);
      expect(a2).toEqual([]);
      expect(b1).toEqual([RoleName.MEMBER, RoleName.LEAD]);
      expect(b2).toEqual([]);
      expect(c1).toEqual([]);
      expect(c2).toEqual([RoleName.MEMBER]);
      expect(mocks.actorService.getActorCredentials).toHaveBeenCalledTimes(3);
    });
  });

  describe('role resolution parity', () => {
    const mixedRoleSet = () =>
      makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'rs-1' },
        },
        {
          name: RoleName.ADMIN,
          credential: { type: 'space-admin', resourceID: 'rs-1' },
        },
        {
          name: RoleName.LEAD,
          credential: { type: 'space-lead', resourceID: 'rs-1' },
        },
      ]);

    it('returns held roles in the role-set order, not the credential order', async () => {
      mockActorCredentialsFromMap(
        mocks.actorService,
        new Map([
          [
            'actor-1',
            [
              makeCredential('space-lead', 'rs-1'),
              makeCredential('space-member', 'rs-1'),
            ],
          ],
        ])
      );
      const loader = createLoader(mocks);

      const roles = await loader.loader.load(
        makeKey('actor-1', mixedRoleSet())
      );

      expect(roles).toEqual([RoleName.MEMBER, RoleName.LEAD]);
    });

    it('returns no roles for a non-member', async () => {
      mockActorCredentialsFromMap(
        mocks.actorService,
        new Map([['actor-1', [makeCredential('space-member', 'other')]]])
      );
      const loader = createLoader(mocks);

      const roles = await loader.loader.load(
        makeKey('actor-1', mixedRoleSet())
      );

      expect(roles).toEqual([]);
    });

    it('matches a definition without resourceID against any resource of that type', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.ADMIN,
          credential: { type: 'global-admin', resourceID: '' },
        },
      ]);
      mockActorCredentialsFromMap(
        mocks.actorService,
        new Map([['actor-1', [makeCredential('global-admin', 'anything')]]])
      );
      const loader = createLoader(mocks);

      const roles = await loader.loader.load(makeKey('actor-1', roleSet));

      expect(roles).toEqual([RoleName.ADMIN]);
    });

    it('does not grant a role for the same type on a different resource', async () => {
      mockActorCredentialsFromMap(
        mocks.actorService,
        new Map([['actor-1', [makeCredential('space-admin', 'rs-2')]]])
      );
      const loader = createLoader(mocks);

      const roles = await loader.loader.load(
        makeKey('actor-1', mixedRoleSet())
      );

      expect(roles).toEqual([]);
    });

    it('returns no roles when the role definitions cannot be loaded', async () => {
      mocks.roleSetRepository.find.mockResolvedValue([]);
      mockActorCredentialsFromMap(
        mocks.actorService,
        new Map([['actor-1', [makeCredential('space-member', 'rs-1')]]])
      );
      const loader = createLoader(mocks);

      const roles = await loader.loader.load(
        makeKey('actor-1', makeRoleSet('rs-1'))
      );

      expect(roles).toEqual([]);
      expect(
        mocks.roleSetCacheService.setActorRolesCache
      ).not.toHaveBeenCalled();
    });
  });

  describe('cache behaviour', () => {
    it('serves hits from cache and resolves and writes back only misses', async () => {
      mocks.roleSetCacheService.getActorRolesBatchFromCache.mockResolvedValue([
        [RoleName.ADMIN],
        undefined,
      ]);
      mockActorCredentialsFromMap(
        mocks.actorService,
        new Map([['actor-1', [makeCredential('space-member', 'rs-2')]]])
      );
      const loader = createLoader(mocks);

      const [hit, miss] = await Promise.all([
        loader.loader.load(makeKey('actor-1', makeRoleSet('rs-1'))),
        loader.loader.load(makeKey('actor-1', memberRoleSet('rs-2'))),
      ]);

      expect(hit).toEqual([RoleName.ADMIN]);
      expect(miss).toEqual([RoleName.MEMBER]);
      expect(
        mocks.roleSetCacheService.setActorRolesCache
      ).toHaveBeenCalledTimes(1);
      expect(mocks.roleSetCacheService.setActorRolesCache).toHaveBeenCalledWith(
        'actor-1',
        'rs-2',
        [RoleName.MEMBER]
      );
    });

    it('treats a cached empty array as a hit', async () => {
      mocks.roleSetCacheService.getActorRolesBatchFromCache.mockResolvedValue([
        [],
      ]);
      const loader = createLoader(mocks);

      const roles = await loader.loader.load(
        makeKey('actor-1', memberRoleSet('rs-1'))
      );

      expect(roles).toEqual([]);
      expect(mocks.actorService.getActorCredentials).not.toHaveBeenCalled();
      expect(
        mocks.roleSetCacheService.setActorRolesCache
      ).not.toHaveBeenCalled();
    });

    it('issues no database load when every key is cached', async () => {
      mocks.roleSetCacheService.getActorRolesBatchFromCache.mockResolvedValue([
        [RoleName.MEMBER],
        [RoleName.LEAD],
      ]);
      const loader = createLoader(mocks);

      const results = await Promise.all([
        loader.loader.load(makeKey('actor-1', makeRoleSet('rs-1'))),
        loader.loader.load(makeKey('actor-1', makeRoleSet('rs-2'))),
      ]);

      expect(results).toEqual([[RoleName.MEMBER], [RoleName.LEAD]]);
      expect(mocks.actorService.getActorCredentials).not.toHaveBeenCalled();
      expect(mocks.roleSetRepository.find).not.toHaveBeenCalled();
    });
  });
});
