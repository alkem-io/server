import { RoleName } from '@common/enums/role.name';
import { AgentService } from '@domain/agent/agent/agent.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { IRoleSet } from './role.set.interface';
import { RoleSetService } from './role.set.service';

function makeRoleSet(
  id: string,
  roles?: { name: RoleName; credential: { type: string; resourceID: string } }[]
): IRoleSet {
  return { id, roles } as unknown as IRoleSet;
}

describe('RoleSetService', () => {
  let service: RoleSetService;
  let agentService: Mocked<AgentService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleSetService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<RoleSetService>(RoleSetService);
    agentService = module.get<AgentService>(
      AgentService
    ) as Mocked<AgentService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMembersCountBatch', () => {
    it('should return empty Map for empty input', async () => {
      const result = await service.getMembersCountBatch([]);
      expect(result).toEqual(new Map());
      expect(
        agentService.countAgentsWithMatchingCredentialsBatch
      ).not.toHaveBeenCalled();
    });

    it('should skip roleSets with roles undefined', async () => {
      const roleSet = makeRoleSet('rs-1', undefined);
      const result = await service.getMembersCountBatch([roleSet]);
      expect(result).toEqual(new Map());
      expect(
        agentService.countAgentsWithMatchingCredentialsBatch
      ).not.toHaveBeenCalled();
    });

    it('should skip roleSets with no MEMBER role', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.LEAD,
          credential: { type: 'space-lead', resourceID: 'res-1' },
        },
      ]);
      const result = await service.getMembersCountBatch([roleSet]);
      expect(result).toEqual(new Map());
      expect(
        agentService.countAgentsWithMatchingCredentialsBatch
      ).not.toHaveBeenCalled();
    });

    it('should return empty Map when all roleSets are skipped', async () => {
      const rs1 = makeRoleSet('rs-1', undefined);
      const rs2 = makeRoleSet('rs-2', [
        {
          name: RoleName.LEAD,
          credential: { type: 'lead', resourceID: 'res-2' },
        },
      ]);
      const result = await service.getMembersCountBatch([rs1, rs2]);
      expect(result).toEqual(new Map());
    });

    it('should batch count two valid roleSets and map by roleSet.id', async () => {
      const rs1 = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'res-A' },
        },
      ]);
      const rs2 = makeRoleSet('rs-2', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'res-B' },
        },
      ]);

      agentService.countAgentsWithMatchingCredentialsBatch.mockResolvedValue(
        new Map([
          ['res-A', 5],
          ['res-B', 12],
        ])
      );

      const result = await service.getMembersCountBatch([rs1, rs2]);

      expect(
        agentService.countAgentsWithMatchingCredentialsBatch
      ).toHaveBeenCalledOnce();
      expect(result.get('rs-1')).toBe(5);
      expect(result.get('rs-2')).toBe(12);
    });

    it('should default to 0 when resourceID has no match in batch result', async () => {
      const roleSet = makeRoleSet('rs-1', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'res-missing' },
        },
      ]);

      agentService.countAgentsWithMatchingCredentialsBatch.mockResolvedValue(
        new Map()
      );

      const result = await service.getMembersCountBatch([roleSet]);
      expect(result.get('rs-1')).toBe(0);
    });

    it('should include only valid roleSets when mixed with skipped ones', async () => {
      const validRs = makeRoleSet('rs-valid', [
        {
          name: RoleName.MEMBER,
          credential: { type: 'space-member', resourceID: 'res-V' },
        },
      ]);
      const skippedRs = makeRoleSet('rs-skipped', undefined);

      agentService.countAgentsWithMatchingCredentialsBatch.mockResolvedValue(
        new Map([['res-V', 7]])
      );

      const result = await service.getMembersCountBatch([validRs, skippedRs]);

      expect(result.get('rs-valid')).toBe(7);
      expect(result.has('rs-skipped')).toBe(false);
      expect(
        agentService.countAgentsWithMatchingCredentialsBatch
      ).toHaveBeenCalledWith([{ type: 'space-member', resourceID: 'res-V' }]);
    });
  });
});
