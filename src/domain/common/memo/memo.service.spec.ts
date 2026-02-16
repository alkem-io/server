import { ContentUpdatePolicy } from '@common/enums/content.update.policy';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mock } from 'vitest';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ProfileService } from '../profile/profile.service';
import { Memo } from './memo.entity';
import { IMemo } from './memo.interface';
import { MemoService } from './memo.service';

describe('MemoService', () => {
  let service: MemoService;
  let memoRepository: MockType<Repository<Memo>>;
  let authorizationPolicyService: AuthorizationPolicyService;
  let profileService: ProfileService;
  let profileDocumentsService: ProfileDocumentsService;

  beforeEach(async () => {
    // Mock static Memo.create to avoid DataSource requirement
    vi.spyOn(Memo, 'create').mockImplementation((input: any) => {
      const entity = new Memo();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoService,
        repositoryProviderMockFactory(Memo),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(MemoService);
    memoRepository = module.get(getRepositoryToken(Memo));
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    profileService = module.get(ProfileService);
    profileDocumentsService = module.get(ProfileDocumentsService);
  });

  describe('getMemoOrFail', () => {
    it('should return the memo when found', async () => {
      const memo = { id: 'memo-1' } as Memo;
      memoRepository.findOne!.mockResolvedValue(memo);

      const result = await service.getMemoOrFail('memo-1');

      expect(result).toBe(memo);
    });

    it('should throw EntityNotFoundException when memo not found', async () => {
      memoRepository.findOne!.mockResolvedValue(null);

      await expect(service.getMemoOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('deleteMemo', () => {
    it('should delete profile, authorization, and memo', async () => {
      const memo = {
        id: 'memo-1',
        profile: { id: 'profile-1' },
        authorization: { id: 'auth-1' },
      } as unknown as Memo;

      memoRepository.findOne!.mockResolvedValue(memo);
      memoRepository.remove!.mockResolvedValue({ ...memo, id: undefined });
      (profileService.deleteProfile as Mock).mockResolvedValue({} as any);
      (authorizationPolicyService.delete as Mock).mockResolvedValue({} as any);

      const result = await service.deleteMemo('memo-1');

      expect(profileService.deleteProfile).toHaveBeenCalledWith('profile-1');
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        memo.authorization
      );
      expect(result.id).toBe('memo-1');
    });

    it('should throw RelationshipNotFoundException when profile is missing', async () => {
      const memo = {
        id: 'memo-1',
        profile: undefined,
        authorization: { id: 'auth-1' },
      } as unknown as Memo;

      memoRepository.findOne!.mockResolvedValue(memo);

      await expect(service.deleteMemo('memo-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when authorization is missing', async () => {
      const memo = {
        id: 'memo-1',
        profile: { id: 'profile-1' },
        authorization: undefined,
      } as unknown as Memo;

      memoRepository.findOne!.mockResolvedValue(memo);

      await expect(service.deleteMemo('memo-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  describe('markdownToStateUpdate', () => {
    it('should return null when markdown is undefined', () => {
      const result = service.markdownToStateUpdate(undefined);
      expect(result).toBeNull();
    });

    it('should return a Uint8Array when markdown is provided', () => {
      const result = service.markdownToStateUpdate('# Hello');
      expect(result).toBeInstanceOf(Uint8Array);
    });
  });

  describe('updateMemo', () => {
    it('should update contentUpdatePolicy when provided', async () => {
      const memo = {
        id: 'memo-1',
        profile: { id: 'p1' },
        contentUpdatePolicy: ContentUpdatePolicy.CONTRIBUTORS,
      } as unknown as IMemo;

      memoRepository.findOne!.mockResolvedValue(memo);
      memoRepository.save!.mockResolvedValue(memo);

      await service.updateMemo('memo-1', {
        contentUpdatePolicy: ContentUpdatePolicy.ADMINS,
      });

      expect(memo.contentUpdatePolicy).toBe(ContentUpdatePolicy.ADMINS);
    });

    it('should update profile when profile data provided', async () => {
      const memo = {
        id: 'memo-1',
        profile: { id: 'p1' },
        contentUpdatePolicy: ContentUpdatePolicy.CONTRIBUTORS,
      } as unknown as IMemo;

      memoRepository.findOne!.mockResolvedValue(memo);
      memoRepository.save!.mockResolvedValue(memo);
      (profileService.updateProfile as Mock).mockResolvedValue({
        id: 'p1',
        displayName: 'Updated',
      } as any);

      await service.updateMemo('memo-1', {
        profile: { displayName: 'Updated' },
      });

      expect(profileService.updateProfile).toHaveBeenCalled();
    });
  });

  describe('updateMemoContent', () => {
    it('should return memo unchanged when newContent is empty', async () => {
      const memo = {
        id: 'memo-1',
        profile: { id: 'p1', storageBucket: { id: 'sb-1' } },
      } as unknown as IMemo;

      memoRepository.findOne!.mockResolvedValue(memo);

      const result = await service.updateMemoContent('memo-1', '');

      expect(result).toBe(memo);
      expect(memoRepository.save).not.toHaveBeenCalled();
    });

    it('should throw EntityNotInitializedException when profile is missing', async () => {
      const memo = {
        id: 'memo-1',
        profile: undefined,
      } as unknown as IMemo;

      memoRepository.findOne!.mockResolvedValue(memo);

      await expect(
        service.updateMemoContent('memo-1', 'some content')
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should reupload documents and save updated content', async () => {
      const memo = {
        id: 'memo-1',
        profile: { id: 'p1', storageBucket: { id: 'sb-1' } },
        content: undefined,
      } as unknown as IMemo;

      memoRepository.findOne!.mockResolvedValue(memo);
      memoRepository.save!.mockImplementation(async (m: any) => m);
      (
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket as Mock
      ).mockResolvedValue('reuploaded content');

      const result = await service.updateMemoContent(
        'memo-1',
        '# Some markdown'
      );

      expect(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).toHaveBeenCalled();
      expect(result.content).toBeDefined();
    });
  });

  describe('getProfile', () => {
    it('should return profile when present on memo', async () => {
      const profile = { id: 'profile-1' };
      const memo = { id: 'memo-1', profile } as unknown as IMemo;
      memoRepository.findOne!.mockResolvedValue(memo);

      const result = await service.getProfile('memo-1');

      expect(result).toBe(profile);
    });

    it('should throw EntityNotFoundException when profile not initialized', async () => {
      const memo = { id: 'memo-1', profile: undefined } as unknown as IMemo;
      memoRepository.findOne!.mockResolvedValue(memo);

      await expect(service.getProfile('memo-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
