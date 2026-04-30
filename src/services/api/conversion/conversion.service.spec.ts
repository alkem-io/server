import { AccountType } from '@common/enums/account.type';
import {
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AccountHostService } from '@domain/space/account.host/account.host.service';
import { SpaceService } from '@domain/space/space/space.service';
import { Test, TestingModule } from '@nestjs/testing';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { ConversionService } from './conversion.service';

describe('ConversionService', () => {
  let service: ConversionService;
  let spaceService: Record<string, Mock>;
  let _roleSetService: Record<string, Mock>;
  let _namingService: Record<string, Mock>;
  let accountHostService: Record<string, Mock>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversionService, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ConversionService);
    spaceService = module.get(SpaceService) as unknown as Record<string, Mock>;
    _roleSetService = module.get(RoleSetService) as unknown as Record<
      string,
      Mock
    >;
    _namingService = module.get(NamingService) as unknown as Record<
      string,
      Mock
    >;
    accountHostService = module.get(AccountHostService) as unknown as Record<
      string,
      Mock
    >;
  });

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

    it('assigns a fresh Free license to the promoted L0 (no inheritance from parent)', async () => {
      const parentLicenseId = 'parent-license-id';
      const freshLicense = { id: 'fresh-license-id' };
      const spaceL1 = {
        id: 'space-l1',
        nameID: 'l1-name',
        levelZeroSpaceID: 'space-l0',
        community: { roleSet: { id: 'roleset-l1' } },
        collaboration: { innovationFlow: { id: 'flow-l1', states: [] } },
        storageAggregator: { id: 'sa-l1', parentStorageAggregator: undefined },
        subspaces: [],
        parentSpace: { id: 'space-l0' },
      };
      const spaceL0Orig = {
        id: 'space-l0',
        license: { id: parentLicenseId },
        account: {
          id: 'account-1',
          accountType: AccountType.USER,
          storageAggregator: { id: 'sa-account' },
        },
        subspaces: [{ id: 'space-l1' }],
      };

      vi.mocked(spaceService.getSpaceOrFail)
        .mockResolvedValueOnce(spaceL1 as never)
        .mockResolvedValueOnce(spaceL0Orig as never);
      vi.mocked(spaceService.createLicenseForSpaceL0).mockReturnValue(
        freshLicense as never
      );
      vi.mocked(
        spaceService.createTemplatesManagerForSpaceL0
      ).mockResolvedValue({} as never);
      vi.mocked(spaceService.save).mockImplementation(
        async (s: unknown) => s as never
      );

      vi.mocked(_roleSetService.getUsersWithRole).mockResolvedValue([]);
      vi.mocked(
        _namingService.getReservedNameIDsLevelZeroSpaces
      ).mockResolvedValue([]);
      vi.mocked(
        _namingService.createNameIdAvoidingReservedNameIDs
      ).mockReturnValue('promoted-name');

      const platformService = (
        service as unknown as { platformService: Record<string, Mock> }
      ).platformService;
      const templatesManagerService = (
        service as unknown as { templatesManagerService: Record<string, Mock> }
      ).templatesManagerService;
      const templateService = (
        service as unknown as { templateService: Record<string, Mock> }
      ).templateService;
      const inputCreatorService = (
        service as unknown as { inputCreatorService: Record<string, Mock> }
      ).inputCreatorService;
      const innovationFlowService = (
        service as unknown as { innovationFlowService: Record<string, Mock> }
      ).innovationFlowService;

      vi.mocked(platformService.getTemplatesManagerOrFail).mockResolvedValue({
        id: 'platform-tm',
      } as never);
      vi.mocked(
        templatesManagerService.getTemplateFromTemplateDefault
      ).mockResolvedValue({ id: 'template-l0' } as never);
      vi.mocked(templateService.getTemplateOrFail).mockResolvedValue({
        contentSpace: {
          collaboration: { innovationFlow: { states: [] } },
        },
      } as never);
      vi.mocked(
        inputCreatorService.buildCreateInnovationFlowStateInputFromInnovationFlowState
      ).mockReturnValue([]);
      vi.mocked(
        innovationFlowService.updateInnovationFlowStates
      ).mockImplementation(async (flow: unknown) => flow as never);

      const result = await service.convertSpaceL1ToSpaceL0OrFail({
        spaceL1ID: 'space-l1',
      });

      expect(spaceService.createLicenseForSpaceL0).toHaveBeenCalledTimes(1);
      expect(result.license).toBe(freshLicense);
      expect(result.license?.id).not.toBe(parentLicenseId);
      expect(accountHostService.assignLicensePlansToSpace).toHaveBeenCalledWith(
        'space-l1',
        AccountType.USER
      );
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
  });
});
