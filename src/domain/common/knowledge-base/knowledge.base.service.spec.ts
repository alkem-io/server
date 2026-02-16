import { EntityNotFoundException } from '@common/exceptions';
import { CalloutsSetService } from '@domain/collaboration/callouts-set/callouts.set.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { AuthorizationPolicyService } from '../authorization-policy/authorization.policy.service';
import { ProfileService } from '../profile/profile.service';
import { KnowledgeBase } from './knowledge.base.entity';
import { IKnowledgeBase } from './knowledge.base.interface';
import { KnowledgeBaseService } from './knowledge.base.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService;
  let db: any;
  let profileService: ProfileService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let calloutsSetService: CalloutsSetService;

  beforeEach(async () => {
    // Mock static KnowledgeBase.create to avoid DataSource requirement
    vi.spyOn(KnowledgeBase, 'create').mockImplementation((input: any) => {
      const entity = new KnowledgeBase();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBaseService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(KnowledgeBaseService);
    db = module.get(DRIZZLE);
    profileService = module.get(ProfileService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    calloutsSetService = module.get(CalloutsSetService);
  });

  describe('getKnowledgeBaseOrFail', () => {
    it('should return knowledge base when found', async () => {
      const kb = { id: 'kb-1' } as KnowledgeBase;
      db.query.knowledgeBases.findFirst.mockResolvedValueOnce(kb);

      const result = await service.getKnowledgeBaseOrFail('kb-1');

      expect(result).toBe(kb);
    });

    it('should throw EntityNotFoundException when not found', async () => {

      await expect(service.getKnowledgeBaseOrFail('missing')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('updateKnowledgeBase', () => {
    it('should update profile when profile data is provided', async () => {
      const kb = {
        id: 'kb-1',
        profile: { id: 'p-1', displayName: 'Old' },
      } as unknown as IKnowledgeBase;

      (profileService.updateProfile as Mock).mockResolvedValue({
        id: 'p-1',
        displayName: 'New',
      } as any);

      const result = await service.updateKnowledgeBase(kb, {
        profile: { displayName: 'New' },
      });

      expect(profileService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p-1' }),
        { displayName: 'New' }
      );
      expect(result.profile.displayName).toBe('New');
    });

    it('should not update profile when profile data is not provided', async () => {
      const kb = {
        id: 'kb-1',
        profile: { id: 'p-1', displayName: 'Keep' },
      } as unknown as IKnowledgeBase;

      const result = await service.updateKnowledgeBase(kb, {});

      expect(profileService.updateProfile).not.toHaveBeenCalled();
      expect(result.profile.displayName).toBe('Keep');
    });
  });

  describe('delete', () => {
    it('should delete profile, callouts set, authorization, and knowledge base', async () => {
      const kb = {
        id: 'kb-1',
        profile: { id: 'p-1' },
        calloutsSet: { id: 'cs-1' },
        authorization: { id: 'auth-1' },
      } as unknown as KnowledgeBase;

      db.query.knowledgeBases.findFirst.mockResolvedValueOnce(kb);
      (profileService.deleteProfile as Mock).mockResolvedValue({} as any);
      (calloutsSetService.deleteCalloutsSet as Mock).mockResolvedValue(
        {} as any
      );
      (authorizationPolicyService.delete as Mock).mockResolvedValue({} as any);

      const result = await service.delete(kb);

      expect(profileService.deleteProfile).toHaveBeenCalledWith('p-1');
      expect(calloutsSetService.deleteCalloutsSet).toHaveBeenCalledWith('cs-1');
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        kb.authorization
      );
      expect(result.id).toBe('kb-1');
    });

    it('should throw EntityNotFoundException when profile or calloutsSet not loaded', async () => {
      const kb = {
        id: 'kb-1',
        profile: undefined,
        calloutsSet: undefined,
      } as unknown as KnowledgeBase;

      db.query.knowledgeBases.findFirst.mockResolvedValueOnce(kb);
      await expect(service.delete(kb)).rejects.toThrow(EntityNotFoundException);
    });

    it('should skip authorization deletion when authorization is not present', async () => {
      const kb = {
        id: 'kb-1',
        profile: { id: 'p-1' },
        calloutsSet: { id: 'cs-1' },
        authorization: undefined,
      } as unknown as KnowledgeBase;

      db.query.knowledgeBases.findFirst.mockResolvedValueOnce(kb);
      (profileService.deleteProfile as Mock).mockResolvedValue({} as any);
      (calloutsSetService.deleteCalloutsSet as Mock).mockResolvedValue(
        {} as any
      );

      await service.delete(kb);

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return profile when present on knowledge base', async () => {
      const profile = { id: 'p-1' };
      const kb = { id: 'kb-1', profile } as unknown as KnowledgeBase;
      db.query.knowledgeBases.findFirst.mockResolvedValueOnce(kb);

      const result = await service.getProfile(kb);

      expect(result).toBe(profile);
    });

    it('should throw EntityNotFoundException when profile not initialized', async () => {
      const kb = {
        id: 'kb-1',
        profile: undefined,
      } as unknown as KnowledgeBase;
      db.query.knowledgeBases.findFirst.mockResolvedValueOnce(kb);

      await expect(service.getProfile(kb)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  describe('getCalloutsSet', () => {
    it('should return callouts set when present on knowledge base', async () => {
      const calloutsSet = { id: 'cs-1' };
      const kb = {
        id: 'kb-1',
        calloutsSet,
      } as unknown as KnowledgeBase;
      db.query.knowledgeBases.findFirst.mockResolvedValueOnce(kb);

      const result = await service.getCalloutsSet(kb);

      expect(result).toBe(calloutsSet);
    });

    it('should throw EntityNotFoundException when callouts set not initialized', async () => {
      const kb = {
        id: 'kb-1',
        calloutsSet: undefined,
      } as unknown as KnowledgeBase;
      db.query.knowledgeBases.findFirst.mockResolvedValueOnce(kb);

      await expect(service.getCalloutsSet(kb)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
