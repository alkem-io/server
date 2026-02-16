import { SpaceLevel } from '@common/enums/space.level';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { PaginationArgs } from '@core/pagination/pagination.args';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { UserService } from '@domain/community/user/user.service';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { SpaceService } from '@domain/space/space/space.service';
import { LibraryService } from '@library/library/library.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { type Mock, vi } from 'vitest';
import { PlatformAdminService } from './platform.admin.service';

describe('PlatformAdminService', () => {
  let service: PlatformAdminService;
  let spaceService: { getAllSpaces: Mock };
  let userService: { getPaginatedUsers: Mock };
  let organizationService: { getPaginatedOrganizations: Mock };
  let virtualContributorService: { getVirtualContributors: Mock };
  let libraryService: { sortAndFilterInnovationPacks: Mock };
  let db: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformAdminService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(PlatformAdminService);
    db = module.get(DRIZZLE);
    spaceService = module.get(SpaceService) as unknown as typeof spaceService;
    userService = module.get(UserService) as unknown as typeof userService;
    organizationService = module.get(
      OrganizationService
    ) as unknown as typeof organizationService;
    virtualContributorService = module.get(
      VirtualContributorService
    ) as unknown as typeof virtualContributorService;
    libraryService = module.get(
      LibraryService
    ) as unknown as typeof libraryService;
  });

  describe('getAllSpaces', () => {
    it('should call spaceService.getAllSpaces with where conditions when visibilities are provided', async () => {
      vi.mocked(spaceService.getAllSpaces).mockResolvedValue([]);

      await service.getAllSpaces({
        filter: { visibilities: ['active', 'archived'] },
      } as any);

      expect(spaceService.getAllSpaces).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Array),
        })
      );
    });

    it('should call spaceService.getAllSpaces when no visibilities are provided', async () => {
      vi.mocked(spaceService.getAllSpaces).mockResolvedValue([]);

      await service.getAllSpaces({} as any);

      expect(spaceService.getAllSpaces).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Array),
        })
      );
    });

    it('should call spaceService.getAllSpaces with where conditions when IDs are provided', async () => {
      vi.mocked(spaceService.getAllSpaces).mockResolvedValue([]);

      await service.getAllSpaces({ IDs: ['id-1', 'id-2'] } as any);

      expect(spaceService.getAllSpaces).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Array),
        })
      );
    });
  });

  describe('getAllUsers', () => {
    it('should create a new PaginationArgs when none provided', async () => {
      vi.mocked(userService.getPaginatedUsers).mockResolvedValue({} as any);

      await service.getAllUsers();

      expect(userService.getPaginatedUsers).toHaveBeenCalledWith(
        expect.any(PaginationArgs),
        undefined,
        undefined
      );
    });

    it('should forward the provided pagination args', async () => {
      const paginationArgs = new PaginationArgs();
      paginationArgs.first = 10;
      vi.mocked(userService.getPaginatedUsers).mockResolvedValue({} as any);

      await service.getAllUsers(paginationArgs, true, {
        email: 'test@x.com',
      } as any);

      expect(userService.getPaginatedUsers).toHaveBeenCalledWith(
        paginationArgs,
        true,
        { email: 'test@x.com' }
      );
    });
  });

  describe('getAllVirtualContributors', () => {
    it('should create new ContributorQueryArgs when none provided', async () => {
      vi.mocked(
        virtualContributorService.getVirtualContributors
      ).mockResolvedValue([]);

      await service.getAllVirtualContributors();

      expect(
        virtualContributorService.getVirtualContributors
      ).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should forward args when provided', async () => {
      const args = { first: 5 } as any;
      vi.mocked(
        virtualContributorService.getVirtualContributors
      ).mockResolvedValue([]);

      await service.getAllVirtualContributors(args);

      expect(
        virtualContributorService.getVirtualContributors
      ).toHaveBeenCalledWith(args);
    });
  });

  describe('getAllInnovationPacks', () => {
    it('should pass limit and orderBy from args to sortAndFilterInnovationPacks', async () => {
      db.query.innovationPacks.findMany.mockResolvedValue([{ id: 'pack-1' }]);
      vi.mocked(libraryService.sortAndFilterInnovationPacks).mockResolvedValue([
        { id: 'pack-1' },
      ] as any);

      await service.getAllInnovationPacks({ limit: 5, orderBy: 'name' } as any);

      expect(libraryService.sortAndFilterInnovationPacks).toHaveBeenCalledWith(
        [{ id: 'pack-1' }],
        5,
        'name'
      );
    });

    it('should pass undefined limit and orderBy when args are not provided', async () => {
      db.query.innovationPacks.findMany.mockResolvedValue([]);
      vi.mocked(libraryService.sortAndFilterInnovationPacks).mockResolvedValue(
        []
      );

      await service.getAllInnovationPacks();

      expect(libraryService.sortAndFilterInnovationPacks).toHaveBeenCalledWith(
        [],
        undefined,
        undefined
      );
    });
  });
});
