import {
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { InnovationFlowService } from '@domain/collaboration/innovation-flow/innovation.flow.service';
import { AccountHostService } from '@domain/space/account.host/account.host.service';
import { SpaceService } from '@domain/space/space/space.service';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { TemplateService } from '@domain/template/template/template.service';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformService } from '@platform/platform/platform.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { InputCreatorService } from '../input-creator/input.creator.service';
import { ConversionService } from './conversion.service';

describe('ConversionService', () => {
  let service: ConversionService;
  let spaceService: Record<string, Mock>;
  let roleSetService: Record<string, Mock>;
  let _namingService: Record<string, Mock>;
  let spaceLookupService: Record<string, Mock>;
  let accountHostService: Record<string, Mock>;
  let platformService: Record<string, Mock>;
  let templatesManagerService: Record<string, Mock>;
  let templateService: Record<string, Mock>;
  let inputCreatorService: Record<string, Mock>;
  let innovationFlowService: Record<string, Mock>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversionService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ConversionService);
    spaceService = module.get(SpaceService) as unknown as Record<string, Mock>;
    roleSetService = module.get(RoleSetService) as unknown as Record<
      string,
      Mock
    >;
    _namingService = module.get(NamingService) as unknown as Record<
      string,
      Mock
    >;
    spaceLookupService = module.get(SpaceLookupService) as unknown as Record<
      string,
      Mock
    >;
    accountHostService = module.get(AccountHostService) as unknown as Record<
      string,
      Mock
    >;
    platformService = module.get(PlatformService) as unknown as Record<
      string,
      Mock
    >;
    templatesManagerService = module.get(
      TemplatesManagerService
    ) as unknown as Record<string, Mock>;
    templateService = module.get(TemplateService) as unknown as Record<
      string,
      Mock
    >;
    inputCreatorService = module.get(InputCreatorService) as unknown as Record<
      string,
      Mock
    >;
    innovationFlowService = module.get(
      InnovationFlowService
    ) as unknown as Record<string, Mock>;
  });

  // Stubs every roleSetService accessor used by getSpaceCommunityRoles so
  // happy-path conversion code reaches the structural updates.
  const stubEmptyCommunityRoles = () => {
    vi.mocked(roleSetService.getUsersWithRole).mockResolvedValue([]);
    vi.mocked(roleSetService.getOrganizationsWithRole).mockResolvedValue([]);
    vi.mocked(roleSetService.getVirtualContributorsWithRole).mockResolvedValue(
      []
    );
  };

  describe('convertSpaceL1ToSpaceL0OrFail', () => {
    it('should throw EntityNotInitializedException when L1 space is missing community', async () => {
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue({
        id: 'space-l1',
        community: undefined,
        collaboration: { innovationFlow: { states: [] } },
        storageAggregator: {},
        subspaces: [],
        agent: {},
      });

      await expect(
        service.convertSpaceL1ToSpaceL0OrFail({ spaceL1ID: 'space-l1' })
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when L1 space is missing collaboration', async () => {
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue({
        id: 'space-l1',
        community: { roleSet: {} },
        collaboration: undefined,
        storageAggregator: {},
        subspaces: [],
        agent: {},
      });

      await expect(
        service.convertSpaceL1ToSpaceL0OrFail({ spaceL1ID: 'space-l1' })
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when L1 space is missing agent', async () => {
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue({
        id: 'space-l1',
        community: { roleSet: {} },
        collaboration: { innovationFlow: { states: [] } },
        storageAggregator: {},
        subspaces: [],
        agent: undefined,
      });

      await expect(
        service.convertSpaceL1ToSpaceL0OrFail({ spaceL1ID: 'space-l1' })
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when L0 space is missing account', async () => {
      const spaceL1 = {
        id: 'space-l1',
        levelZeroSpaceID: 'space-l0',
        community: { roleSet: {} },
        collaboration: { innovationFlow: { states: [] } },
        storageAggregator: {},
        subspaces: [],
        agent: {},
      };
      const spaceL0 = {
        id: 'space-l0',
        account: undefined,
        subspaces: [],
      };
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(spaceL1)
        .mockResolvedValueOnce(spaceL0);

      await expect(
        service.convertSpaceL1ToSpaceL0OrFail({ spaceL1ID: 'space-l1' })
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('convertSpaceL1ToSpaceL2OrFail', () => {
    it('should throw EntityNotInitializedException when L1 space is missing community', async () => {
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue({
        id: 'space-l1',
        community: undefined,
        storageAggregator: {},
      });

      await expect(
        service.convertSpaceL1ToSpaceL2OrFail({
          spaceL1ID: 'space-l1',
          parentSpaceL1ID: 'parent-l1',
        })
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw ValidationException when L1 and parent L1 have different levelZeroSpaceIDs', async () => {
      const spaceL1 = {
        id: 'space-l1',
        levelZeroSpaceID: 'l0-a',
        community: { roleSet: {} },
        storageAggregator: {},
      };
      const parentL1 = {
        id: 'parent-l1',
        levelZeroSpaceID: 'l0-b',
        storageAggregator: {},
        community: { roleSet: {} },
      };
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(spaceL1)
        .mockResolvedValueOnce(parentL1);

      await expect(
        service.convertSpaceL1ToSpaceL2OrFail({
          spaceL1ID: 'space-l1',
          parentSpaceL1ID: 'parent-l1',
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should throw EntityNotInitializedException when parent L1 space is missing storageAggregator', async () => {
      const spaceL1 = {
        id: 'space-l1',
        levelZeroSpaceID: 'l0-a',
        community: { roleSet: {} },
        storageAggregator: {},
      };
      const parentL1 = {
        id: 'parent-l1',
        levelZeroSpaceID: 'l0-a',
        storageAggregator: undefined,
        community: { roleSet: {} },
      };
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(spaceL1)
        .mockResolvedValueOnce(parentL1);

      await expect(
        service.convertSpaceL1ToSpaceL2OrFail({
          spaceL1ID: 'space-l1',
          parentSpaceL1ID: 'parent-l1',
        })
      ).rejects.toThrow(EntityNotInitializedException);
    });

    // Issue alkem-io/server#6019 — pending invites/apps must be cleared on
    // any conversion, otherwise accept-flow breaks (alkem-io/server#5069).
    it('should clear pending invitations and applications on the converted L1 roleSet', async () => {
      const roleSetL1 = { id: 'roleset-l1' };
      const spaceL1 = {
        id: 'space-l1',
        levelZeroSpaceID: 'l0-a',
        community: { roleSet: roleSetL1 },
        storageAggregator: { id: 'sa-l1' },
      };
      const parentL1 = {
        id: 'parent-l1',
        levelZeroSpaceID: 'l0-a',
        storageAggregator: { id: 'sa-parent-l1' },
        community: { roleSet: { id: 'roleset-parent-l1' } },
      };
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(spaceL1)
        .mockResolvedValueOnce(parentL1);
      stubEmptyCommunityRoles();
      vi.mocked(
        roleSetService.setParentRoleSetAndCredentials
      ).mockResolvedValue(roleSetL1);
      vi.mocked(spaceService.save).mockImplementation(async (s: unknown) => s);

      await service.convertSpaceL1ToSpaceL2OrFail({
        spaceL1ID: 'space-l1',
        parentSpaceL1ID: 'parent-l1',
      });

      expect(
        roleSetService.removePendingInvitationsAndApplications
      ).toHaveBeenCalledWith('roleset-l1');
    });
  });

  describe('convertSpaceL2ToSpaceL1OrFail', () => {
    it('should throw EntityNotInitializedException when L2 space community is missing', async () => {
      vi.mocked(spaceService.getSpaceOrFail).mockResolvedValue({
        id: 'space-l2',
        community: undefined,
      });

      await expect(
        service.convertSpaceL2ToSpaceL1OrFail({ spaceL2ID: 'space-l2' })
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when L0 space is missing storageAggregator', async () => {
      const spaceL2 = {
        id: 'space-l2',
        levelZeroSpaceID: 'space-l0',
        community: { roleSet: {} },
      };
      const spaceL0 = {
        id: 'space-l0',
        storageAggregator: undefined,
        community: { roleSet: {} },
      };
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(spaceL2)
        .mockResolvedValueOnce(spaceL0);

      await expect(
        service.convertSpaceL2ToSpaceL1OrFail({ spaceL2ID: 'space-l2' })
      ).rejects.toThrow(EntityNotInitializedException);
    });

    // Issue alkem-io/server#6019.
    it('should clear pending invitations and applications on the promoted L2 roleSet', async () => {
      const roleSetL2 = { id: 'roleset-l2' };
      const spaceL2Initial = {
        id: 'space-l2',
        levelZeroSpaceID: 'space-l0',
        community: { roleSet: roleSetL2 },
      };
      const spaceL0 = {
        id: 'space-l0',
        storageAggregator: { id: 'sa-l0' },
        community: { roleSet: { id: 'roleset-l0' } },
      };
      // Inside updateChildSpaceL2ToL1 a fresh getSpaceOrFail loads richer data.
      const spaceL2Loaded = {
        id: 'space-l2',
        storageAggregator: { id: 'sa-l2', parentStorageAggregator: null },
        parentSpace: { id: 'former-parent' },
        community: { roleSet: roleSetL2 },
      };
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(spaceL2Initial)
        .mockResolvedValueOnce(spaceL0)
        .mockResolvedValueOnce(spaceL2Loaded)
        .mockResolvedValueOnce(spaceL2Loaded); // final return
      vi.mocked(roleSetService.getUsersWithRole).mockResolvedValue([]);
      vi.mocked(
        roleSetService.setParentRoleSetAndCredentials
      ).mockResolvedValue(roleSetL2);
      vi.mocked(spaceService.save).mockImplementation(async (s: unknown) => s);

      await service.convertSpaceL2ToSpaceL1OrFail({ spaceL2ID: 'space-l2' });

      expect(
        roleSetService.removePendingInvitationsAndApplications
      ).toHaveBeenCalledWith('roleset-l2');
    });
  });

  // ── L1 → L0 promotion: clears pending invites/apps for both the promoted
  // space AND every L2 descendant (each becomes an L1 in the new tree).
  describe('convertSpaceL1ToSpaceL0OrFail — pending invites cleanup', () => {
    it('should clear pending invitations on the promoted L1 and every descendant', async () => {
      const roleSetL1 = { id: 'roleset-l1' };
      const spaceL1 = {
        id: 'space-l1',
        levelZeroSpaceID: 'space-l0',
        community: { roleSet: roleSetL1 },
        collaboration: { innovationFlow: { id: 'flow-l1', states: [] } },
        storageAggregator: { id: 'sa-l1', parentStorageAggregator: null },
        subspaces: [],
        parentSpace: { id: 'old-l0' },
      };
      const spaceL0 = {
        id: 'space-l0',
        subspaces: [{ id: 'space-l1' }],
        account: {
          id: 'account',
          accountType: 'BASIC',
          storageAggregator: { id: 'sa-account' },
        },
      };
      const descendantL2 = {
        id: 'space-l2-a',
        community: { roleSet: { id: 'roleset-l2-a' } },
      };
      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(spaceL1)
        .mockResolvedValueOnce(spaceL0);
      vi.mocked(spaceService.getAllSpaces).mockImplementation(((
        options: any
      ) => {
        expect(options).toMatchObject({
          relations: { community: { roleSet: true } },
        });
        expect(options?.where?.id?._value ?? options?.where?.id?.value).toEqual(
          ['space-l2-a']
        );
        return Promise.resolve([descendantL2]);
      }) as never);
      vi.mocked(spaceLookupService.getAllDescendantSpaceIDs).mockResolvedValue([
        'space-l2-a',
      ]);
      vi.mocked(roleSetService.getUsersWithRole).mockResolvedValue([]);
      vi.mocked(spaceService.save).mockImplementation(async (s: unknown) => s);
      vi.mocked(spaceService.createLicenseForSpaceL0).mockReturnValue({});
      vi.mocked(
        spaceService.createTemplatesManagerForSpaceL0
      ).mockResolvedValue({});
      vi.mocked(platformService.getTemplatesManagerOrFail).mockResolvedValue({
        id: 'platform-tm',
      });
      vi.mocked(
        templatesManagerService.getTemplateFromTemplateDefault
      ).mockResolvedValue({ id: 'template-id' });
      vi.mocked(templateService.getTemplateOrFail).mockResolvedValue({
        contentSpace: {
          collaboration: { innovationFlow: { states: [] } },
        },
      });
      vi.mocked(
        inputCreatorService.buildCreateInnovationFlowStateInputFromInnovationFlowState
      ).mockReturnValue([]);
      vi.mocked(
        innovationFlowService.updateInnovationFlowStates
      ).mockResolvedValue({ id: 'flow-l1', states: [] });
      vi.mocked(
        _namingService.getReservedNameIDsLevelZeroSpaces
      ).mockResolvedValue([]);
      vi.mocked(
        _namingService.createNameIdAvoidingReservedNameIDs
      ).mockReturnValue('promoted-name');
      vi.mocked(accountHostService.assignLicensePlansToSpace).mockResolvedValue(
        undefined
      );

      await service.convertSpaceL1ToSpaceL0OrFail({ spaceL1ID: 'space-l1' });

      expect(
        roleSetService.removePendingInvitationsAndApplications
      ).toHaveBeenCalledWith(['roleset-l1', 'roleset-l2-a']);
    });
  });
});
