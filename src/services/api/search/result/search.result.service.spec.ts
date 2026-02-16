import { AuthorizationService } from '@core/authorization/authorization.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { SearchResultType } from '../search.result.type';
import { SearchResultService } from './search.result.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('SearchResultService', () => {
  let service: SearchResultService;
  let db: any;
  let authorizationService: { isAccessGranted: Mock };
  let userLookupService: { usersWithCredential: Mock };
  let _organizationLookupService: { organizationsWithCredentials: Mock };
  const agentInfo = { credentials: [] } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchResultService,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(SearchResultService);
    db = module.get(DRIZZLE);
    authorizationService = module.get(AuthorizationService) as any;
    userLookupService = module.get(UserLookupService) as any;
    _organizationLookupService = module.get(OrganizationLookupService) as any;
  });

  describe('getSpaceSearchResults', () => {
    it('should return empty array when no raw results are provided', async () => {
      const result = await service.getSpaceSearchResults([]);

      expect(result).toEqual([]);

    });

    it('should return single space result when spaceId filter is provided', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.SPACE,
          result: { id: 'space-1' },
        },
      ] as any[];
      const space = { id: 'space-1', name: 'Test Space' };
      db.query.spaces.findFirst.mockResolvedValueOnce(space);

      const result = await service.getSpaceSearchResults(rawResults, 'space-1');

      expect(result).toHaveLength(1);
      expect(result[0].space).toBe(space);
    });

    it('should map raw results to spaces found by entity manager', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.SPACE,
          result: { id: 'space-1' },
        },
        {
          id: 'sr-2',
          score: 3,
          type: SearchResultType.SPACE,
          result: { id: 'space-2' },
        },
      ] as any[];
      const loadedSpaces = [{ id: 'space-1' }, { id: 'space-2' }];
      db.query.spaces.findMany.mockResolvedValueOnce(loadedSpaces);

      const result = await service.getSpaceSearchResults(rawResults);

      expect(result).toHaveLength(2);
    });

    it('should filter out spaces with no matching raw result', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.SPACE,
          result: { id: 'space-1' },
        },
      ] as any[];
      // Entity manager returns a space that doesn't match any raw result

      const result = await service.getSpaceSearchResults(rawResults);

      expect(result).toHaveLength(0);
    });
  });

  describe('getSubspaceSearchResults', () => {
    it('should return empty array when no raw results are provided', async () => {
      const result = await service.getSubspaceSearchResults([], agentInfo);

      expect(result).toEqual([]);
    });

    it('should filter out subspaces user is not authorized to read', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.SUBSPACE,
          result: { id: 'sub-1' },
        },
      ] as any[];

      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await service.getSubspaceSearchResults(
        rawResults,
        agentInfo
      );

      expect(result).toHaveLength(0);
    });

    it('should filter out subspaces without parentSpace', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.SUBSPACE,
          result: { id: 'sub-1' },
        },
      ] as any[];

      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await service.getSubspaceSearchResults(
        rawResults,
        agentInfo
      );

      expect(result).toHaveLength(0);
    });

    it('should return authorized subspaces with parentSpace', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.SUBSPACE,
          result: { id: 'sub-1' },
        },
      ] as any[];
      const parentSpace = { id: 'space-1' };
      const subspace = { id: 'sub-1', authorization: {}, parentSpace };
      db.query.spaces.findMany.mockResolvedValueOnce([subspace]);

      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await service.getSubspaceSearchResults(
        rawResults,
        agentInfo
      );

      expect(result).toHaveLength(1);
      expect(result[0].parentSpace).toBe(parentSpace);
    });
  });

  describe('getUserSearchResults', () => {
    it('should return empty array when no raw results are provided', async () => {
      const result = await service.getUserSearchResults([]);

      expect(result).toEqual([]);
    });

    it('should filter users by space membership when spaceId is provided', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.USER,
          result: { id: 'user-1' },
        },
        {
          id: 'sr-2',
          score: 3,
          type: SearchResultType.USER,
          result: { id: 'user-2' },
        },
      ] as any[];

      // Only user-1 is a member of the space
      userLookupService.usersWithCredential
        .mockResolvedValueOnce([{ id: 'user-1' }]) // SPACE_MEMBER
        .mockResolvedValueOnce([]); // SPACE_ADMIN

      // db.query.users.findMany returns only user-1 (the intersection result)
      db.query.users.findMany.mockResolvedValueOnce([{ id: 'user-1' }]);

      const result = await service.getUserSearchResults(rawResults, 'space-1');

      expect(result).toHaveLength(1);
      expect(result[0].user.id).toBe('user-1');
    });
  });

  describe('getOrganizationSearchResults', () => {
    it('should return empty array when no raw results are provided', async () => {
      const result = await service.getOrganizationSearchResults([], agentInfo);

      expect(result).toEqual([]);
    });

    it('should filter out organizations without READ authorization', async () => {
      const rawResults = [
        {
          id: 'sr-1',
          score: 5,
          type: SearchResultType.ORGANIZATION,
          result: { id: 'org-1' },
        },
      ] as any[];

      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await service.getOrganizationSearchResults(
        rawResults,
        agentInfo
      );

      expect(result).toHaveLength(0);
    });
  });
});
