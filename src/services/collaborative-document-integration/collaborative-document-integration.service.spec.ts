import { AuthorizationPrivilege } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { AgentInfoService } from '@core/authentication.agent.info/agent.info.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { MemoService } from '@domain/common/memo';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { CollaborativeDocumentIntegrationService } from './collaborative-document-integration.service';
import {
  FetchContentData,
  FetchErrorData,
  SaveContentData,
  SaveErrorData,
} from './outputs';
import { FetchErrorCodes, SaveErrorCodes } from './types';

describe('CollaborativeDocumentIntegrationService', () => {
  let service: CollaborativeDocumentIntegrationService;
  let authorizationService: { isAccessGranted: Mock };
  let agentInfoService: { buildAgentInfoForUser: Mock };
  let memoService: {
    getMemoOrFail: Mock;
    saveContent: Mock;
    isMultiUser: Mock;
    getProfile: Mock;
  };
  let contributionReporter: { memoContribution: Mock };
  let communityResolver: {
    getCommunityForMemoOrFail: Mock;
    getLevelZeroSpaceIdForCommunity: Mock;
  };

  const configServiceMock = {
    get: vi.fn((key: string) => {
      if (key === 'collaboration.memo.max_collaborators_in_room') return 10;
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborativeDocumentIntegrationService,
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CollaborativeDocumentIntegrationService);
    authorizationService = module.get(AuthorizationService) as any;
    agentInfoService = module.get(AgentInfoService) as any;
    memoService = module.get(MemoService) as any;
    contributionReporter = module.get(ContributionReporterService) as any;
    communityResolver = module.get(CommunityResolverService) as any;
  });

  describe('accessGranted', () => {
    it('should return true when user has the requested privilege', async () => {
      const memo = { id: 'memo-1', authorization: { id: 'auth-1' } };
      const agentInfo = { credentials: [] };
      memoService.getMemoOrFail.mockResolvedValue(memo);
      agentInfoService.buildAgentInfoForUser.mockResolvedValue(agentInfo);
      authorizationService.isAccessGranted.mockReturnValue(true);

      const result = await service.accessGranted({
        userId: 'user-1',
        documentId: 'memo-1',
        privilege: AuthorizationPrivilege.READ,
      });

      expect(result).toBe(true);
      expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
        agentInfo,
        memo.authorization,
        AuthorizationPrivilege.READ
      );
    });

    it('should return false when an exception is thrown', async () => {
      memoService.getMemoOrFail.mockRejectedValue(new Error('Memo not found'));

      const result = await service.accessGranted({
        userId: 'user-1',
        documentId: 'nonexistent',
        privilege: AuthorizationPrivilege.READ,
      });

      expect(result).toBe(false);
    });
  });

  describe('info', () => {
    it('should return all-false when user has no read access', async () => {
      memoService.getMemoOrFail.mockResolvedValue({ authorization: {} });
      agentInfoService.buildAgentInfoForUser.mockResolvedValue({});
      authorizationService.isAccessGranted.mockReturnValue(false);

      const result = await service.info({
        userId: 'user-1',
        documentId: 'memo-1',
      } as any);

      expect(result).toEqual({
        read: false,
        update: false,
        isMultiUser: false,
        maxCollaborators: 0,
      });
    });

    it('should return correct info with maxCollaborators based on isMultiUser', async () => {
      const memo = { authorization: { id: 'auth-1' } };
      memoService.getMemoOrFail.mockResolvedValue(memo);
      agentInfoService.buildAgentInfoForUser.mockResolvedValue({});
      // First call: READ -> true, Second call: UPDATE_CONTENT -> true
      authorizationService.isAccessGranted
        .mockReturnValueOnce(true) // READ check in first accessGranted call
        .mockReturnValueOnce(true); // UPDATE_CONTENT check in second accessGranted call
      memoService.isMultiUser.mockResolvedValue(true);

      const result = await service.info({
        userId: 'user-1',
        documentId: 'memo-1',
      } as any);

      expect(result.read).toBe(true);
      expect(result.update).toBe(true);
      expect(result.isMultiUser).toBe(true);
      expect(result.maxCollaborators).toBe(10);
    });

    it('should return maxCollaborators as 1 when not multi-user', async () => {
      memoService.getMemoOrFail.mockResolvedValue({ authorization: {} });
      agentInfoService.buildAgentInfoForUser.mockResolvedValue({});
      authorizationService.isAccessGranted.mockReturnValue(true);
      memoService.isMultiUser.mockResolvedValue(false);

      const result = await service.info({
        userId: 'user-1',
        documentId: 'memo-1',
      } as any);

      expect(result.maxCollaborators).toBe(1);
      expect(result.isMultiUser).toBe(false);
    });
  });

  describe('save', () => {
    it('should return SaveContentData on successful save', async () => {
      memoService.saveContent.mockResolvedValue(undefined);

      const result = await service.save({
        documentId: 'memo-1',
        binaryStateInBase64: Buffer.from('hello').toString('base64'),
      } as any);

      expect(result.data).toBeInstanceOf(SaveContentData);
      expect((result.data as SaveContentData).success).toBe(true);
      expect(memoService.saveContent).toHaveBeenCalledWith(
        'memo-1',
        expect.any(Buffer)
      );
    });

    it('should return SaveErrorData with NOT_FOUND code when EntityNotFoundException is thrown', async () => {
      memoService.saveContent.mockRejectedValue(
        new EntityNotFoundException('Memo not found', 'MEMO' as any)
      );

      const result = await service.save({
        documentId: 'nonexistent',
        binaryStateInBase64: Buffer.from('hello').toString('base64'),
      } as any);

      expect(result.data).toBeInstanceOf(SaveErrorData);
      expect((result.data as SaveErrorData).code).toBe(
        SaveErrorCodes.NOT_FOUND
      );
    });

    it('should return SaveErrorData with INTERNAL_ERROR code for generic errors', async () => {
      memoService.saveContent.mockRejectedValue(new Error('DB failure'));

      const result = await service.save({
        documentId: 'memo-1',
        binaryStateInBase64: Buffer.from('hello').toString('base64'),
      } as any);

      expect(result.data).toBeInstanceOf(SaveErrorData);
      expect((result.data as SaveErrorData).code).toBe(
        SaveErrorCodes.INTERNAL_ERROR
      );
    });
  });

  describe('fetch', () => {
    it('should return FetchContentData with base64 content on success', async () => {
      const content = Buffer.from('test content');
      memoService.getMemoOrFail.mockResolvedValue({
        id: 'memo-1',
        content,
      });

      const result = await service.fetch({ documentId: 'memo-1' } as any);

      expect(result.data).toBeInstanceOf(FetchContentData);
      expect((result.data as FetchContentData).contentBase64).toBe(
        content.toString('base64')
      );
    });

    it('should return FetchContentData with undefined content when memo content is undefined', async () => {
      memoService.getMemoOrFail.mockResolvedValue({
        id: 'memo-1',
        content: undefined,
      });

      const result = await service.fetch({ documentId: 'memo-1' } as any);

      expect(result.data).toBeInstanceOf(FetchContentData);
      expect((result.data as FetchContentData).contentBase64).toBeUndefined();
    });

    it('should return FetchErrorData with NOT_FOUND code when EntityNotFoundException is thrown', async () => {
      memoService.getMemoOrFail.mockRejectedValue(
        new EntityNotFoundException('Memo not found', 'MEMO' as any)
      );

      const result = await service.fetch({ documentId: 'nonexistent' } as any);

      expect(result.data).toBeInstanceOf(FetchErrorData);
      expect((result.data as FetchErrorData).code).toBe(
        FetchErrorCodes.NOT_FOUND
      );
    });

    it('should return FetchErrorData with INTERNAL_ERROR code for generic errors', async () => {
      memoService.getMemoOrFail.mockRejectedValue(new Error('DB failure'));

      const result = await service.fetch({ documentId: 'memo-1' } as any);

      expect(result.data).toBeInstanceOf(FetchErrorData);
      expect((result.data as FetchErrorData).code).toBe(
        FetchErrorCodes.INTERNAL_ERROR
      );
    });
  });

  describe('memoContributions', () => {
    it('should report contributions for each user', async () => {
      communityResolver.getCommunityForMemoOrFail.mockResolvedValue({
        id: 'community-1',
      });
      communityResolver.getLevelZeroSpaceIdForCommunity.mockResolvedValue(
        'space-root'
      );
      memoService.getProfile.mockResolvedValue({ displayName: 'My Memo' });
      contributionReporter.memoContribution.mockReturnValue(undefined);

      await service.memoContributions({
        memoId: 'memo-1',
        users: [
          { id: 'user-1', email: 'user1@test.com' },
          { id: 'user-2', email: 'user2@test.com' },
        ],
      } as any);

      expect(contributionReporter.memoContribution).toHaveBeenCalledTimes(2);
      expect(contributionReporter.memoContribution).toHaveBeenCalledWith(
        { id: 'memo-1', name: 'My Memo', space: 'space-root' },
        { id: 'user-1', email: 'user1@test.com' }
      );
      expect(contributionReporter.memoContribution).toHaveBeenCalledWith(
        { id: 'memo-1', name: 'My Memo', space: 'space-root' },
        { id: 'user-2', email: 'user2@test.com' }
      );
    });
  });
});
