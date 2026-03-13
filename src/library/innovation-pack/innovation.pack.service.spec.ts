import {
  EntityNotFoundException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { ProfileService } from '@domain/common/profile/profile.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { InnovationPack } from './innovation.pack.entity';
import { IInnovationPack } from './innovation.pack.interface';
import { InnovationPackService } from './innovation.pack.service';

describe('InnovationPackService', () => {
  let service: InnovationPackService;
  let repository: Repository<InnovationPack>;
  let profileService: ProfileService;
  let templatesSetService: TemplatesSetService;
  let accountLookupService: AccountLookupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnovationPackService,
        MockCacheManager,
        MockWinstonProvider,
        repositoryProviderMockFactory(InnovationPack),
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<InnovationPackService>(InnovationPackService);
    repository = module.get(getRepositoryToken(InnovationPack));
    profileService = module.get(ProfileService);
    templatesSetService = module.get(TemplatesSetService);
    accountLookupService = module.get(AccountLookupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── getInnovationPackOrFail ─────────────────────────────────────

  describe('getInnovationPackOrFail', () => {
    it('should return the innovation pack when found', async () => {
      const pack = { id: 'pack-1' } as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);

      const result = await service.getInnovationPackOrFail('pack-1');

      expect(result).toBe(pack);
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pack-1' } })
      );
    });

    it('should pass through FindOneOptions', async () => {
      const pack = { id: 'pack-1', profile: {} } as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);

      await service.getInnovationPackOrFail('pack-1', {
        relations: { profile: true },
      });

      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pack-1' },
          relations: { profile: true },
        })
      );
    });

    it('should throw EntityNotFoundException when not found', async () => {
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.getInnovationPackOrFail('missing-id')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  // ── getInnovationPackByNameIdOrFail ─────────────────────────────

  describe('getInnovationPackByNameIdOrFail', () => {
    it('should return the innovation pack when found by nameID', async () => {
      const pack = { id: 'pack-1', nameID: 'my-pack' } as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);

      const result = await service.getInnovationPackByNameIdOrFail('my-pack');

      expect(result).toBe(pack);
      expect(repository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { nameID: 'my-pack' } })
      );
    });

    it('should throw EntityNotFoundException when not found by nameID', async () => {
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.getInnovationPackByNameIdOrFail('missing-name')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  // ── save ────────────────────────────────────────────────────────

  describe('save', () => {
    it('should delegate to repository save', async () => {
      const pack = { id: 'pack-1' } as InnovationPack;
      (repository.save as ReturnType<typeof vi.fn>).mockResolvedValue(pack);

      const result = await service.save(pack);

      expect(repository.save).toHaveBeenCalledWith(pack);
      expect(result).toBe(pack);
    });
  });

  // ── isNameIdAvailable ───────────────────────────────────────────

  describe('isNameIdAvailable', () => {
    it('should return true when nameID is not taken', async () => {
      (repository.countBy as ReturnType<typeof vi.fn>).mockResolvedValue(0);

      const result = await service.isNameIdAvailable('available-name');

      expect(result).toBe(true);
      expect(repository.countBy).toHaveBeenCalledWith({
        nameID: 'available-name',
      });
    });

    it('should return false when nameID is taken', async () => {
      (repository.countBy as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      const result = await service.isNameIdAvailable('taken-name');

      expect(result).toBe(false);
    });
  });

  // ── getProfile ──────────────────────────────────────────────────

  describe('getProfile', () => {
    it('should return the profile when it exists', async () => {
      const profile = { id: 'profile-1', displayName: 'Test' };
      const pack = { id: 'pack-1', profile } as unknown as IInnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);

      const result = await service.getProfile({
        id: 'pack-1',
      } as IInnovationPack);

      expect(result).toBe(profile);
    });

    it('should throw EntityNotFoundException when profile is not initialized', async () => {
      const pack = {
        id: 'pack-1',
        profile: undefined,
      } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);

      await expect(
        service.getProfile({ id: 'pack-1' } as IInnovationPack)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  // ── getTemplatesSetOrFail ───────────────────────────────────────

  describe('getTemplatesSetOrFail', () => {
    it('should return the templates set when it exists', async () => {
      const templatesSet = { id: 'ts-1' };
      const pack = { id: 'pack-1', templatesSet } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);

      const result = await service.getTemplatesSetOrFail('pack-1');

      expect(result).toBe(templatesSet);
    });

    it('should throw EntityNotFoundException when templates set is missing', async () => {
      const pack = {
        id: 'pack-1',
        templatesSet: undefined,
      } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);

      await expect(service.getTemplatesSetOrFail('pack-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  // ── getTemplatesCount ───────────────────────────────────────────

  describe('getTemplatesCount', () => {
    it('should return the templates count from the templates set', async () => {
      const pack = {
        id: 'pack-1',
        templatesSet: { id: 'ts-1' },
      } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);
      vi.mocked(templatesSetService.getTemplatesCount).mockResolvedValue(5);

      const result = await service.getTemplatesCount('pack-1');

      expect(result).toBe(5);
      expect(templatesSetService.getTemplatesCount).toHaveBeenCalledWith(
        'ts-1'
      );
    });

    it('should throw EntityNotFoundException when templatesSet is missing', async () => {
      const pack = {
        id: 'pack-1',
        templatesSet: undefined,
      } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);

      await expect(service.getTemplatesCount('pack-1')).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });

  // ── getProvider ─────────────────────────────────────────────────

  describe('getProvider', () => {
    it('should return the provider when innovation pack and account exist', async () => {
      const provider = { id: 'provider-1' };
      const pack = {
        id: 'pack-1',
        account: { id: 'account-1' },
      } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);
      vi.mocked(accountLookupService.getHost).mockResolvedValue(
        provider as any
      );

      const result = await service.getProvider('pack-1');

      expect(result).toBe(provider);
    });

    it('should throw RelationshipNotFoundException when innovation pack not found', async () => {
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.getProvider('missing-id')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when account is missing', async () => {
      const pack = {
        id: 'pack-1',
        account: undefined,
      } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);

      await expect(service.getProvider('pack-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should throw RelationshipNotFoundException when provider is not found', async () => {
      const pack = {
        id: 'pack-1',
        account: { id: 'account-1' },
      } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);
      vi.mocked(accountLookupService.getHost).mockResolvedValue(
        undefined as any
      );

      await expect(service.getProvider('pack-1')).rejects.toThrow(
        RelationshipNotFoundException
      );
    });
  });

  // ── update ──────────────────────────────────────────────────────

  describe('update', () => {
    it('should update and save when no nameID change', async () => {
      const pack = {
        id: 'pack-1',
        nameID: 'existing',
        profile: {},
      } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);
      (repository.save as ReturnType<typeof vi.fn>).mockResolvedValue(pack);

      const result = await service.update({ ID: 'pack-1' } as any);

      expect(repository.save).toHaveBeenCalled();
      expect(result).toBe(pack);
    });

    it('should update nameID when different and available', async () => {
      const pack = {
        id: 'pack-1',
        nameID: 'old-name',
        profile: {},
      } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);
      (repository.countBy as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      (repository.save as ReturnType<typeof vi.fn>).mockImplementation(p =>
        Promise.resolve(p)
      );

      await service.update({ ID: 'pack-1', nameID: 'new-name' } as any);

      expect(pack.nameID).toBe('new-name');
    });

    it('should throw ValidationException when nameID is already taken', async () => {
      const pack = {
        id: 'pack-1',
        nameID: 'old-name',
        profile: {},
      } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);
      (repository.countBy as ReturnType<typeof vi.fn>).mockResolvedValue(1);

      await expect(
        service.update({ ID: 'pack-1', nameID: 'taken-name' } as any)
      ).rejects.toThrow(ValidationException);
    });

    it('should not check nameID availability when nameID is unchanged', async () => {
      const pack = {
        id: 'pack-1',
        nameID: 'same-name',
        profile: {},
      } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);
      (repository.save as ReturnType<typeof vi.fn>).mockResolvedValue(pack);

      await service.update({ ID: 'pack-1', nameID: 'same-name' } as any);

      expect(repository.countBy).not.toHaveBeenCalled();
    });

    it('should update profile when profileData is provided', async () => {
      const profile = { id: 'profile-1' };
      const pack = {
        id: 'pack-1',
        nameID: 'name',
        profile,
      } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);
      (repository.save as ReturnType<typeof vi.fn>).mockImplementation(p =>
        Promise.resolve(p)
      );
      const updatedProfile = { id: 'profile-1', displayName: 'Updated' };
      vi.mocked(profileService.updateProfile).mockResolvedValue(
        updatedProfile as any
      );

      await service.update({
        ID: 'pack-1',
        profileData: { displayName: 'Updated' },
      } as any);

      expect(profileService.updateProfile).toHaveBeenCalledWith(profile, {
        displayName: 'Updated',
      });
    });

    it('should update listedInStore when provided as boolean', async () => {
      const pack = {
        id: 'pack-1',
        nameID: 'name',
        profile: {},
        listedInStore: true,
      } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);
      (repository.save as ReturnType<typeof vi.fn>).mockImplementation(p =>
        Promise.resolve(p)
      );

      await service.update({ ID: 'pack-1', listedInStore: false } as any);

      expect(pack.listedInStore).toBe(false);
    });

    it('should update searchVisibility when provided', async () => {
      const pack = {
        id: 'pack-1',
        nameID: 'name',
        profile: {},
        searchVisibility: 'account',
      } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);
      (repository.save as ReturnType<typeof vi.fn>).mockImplementation(p =>
        Promise.resolve(p)
      );

      await service.update({ ID: 'pack-1', searchVisibility: 'public' } as any);

      expect(pack.searchVisibility).toBe('public');
    });
  });

  // ── deleteInnovationPack ────────────────────────────────────────

  describe('deleteInnovationPack', () => {
    it('should delete templatesSet, profile, and the pack itself', async () => {
      const pack = {
        id: 'pack-1',
        templatesSet: { id: 'ts-1' },
        profile: { id: 'profile-1' },
      } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);
      (repository.remove as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...pack,
      });

      const result = await service.deleteInnovationPack({ ID: 'pack-1' });

      expect(templatesSetService.deleteTemplatesSet).toHaveBeenCalledWith(
        'ts-1'
      );
      expect(profileService.deleteProfile).toHaveBeenCalledWith('profile-1');
      expect(repository.remove).toHaveBeenCalled();
      expect(result.id).toBe('pack-1');
    });

    it('should skip templatesSet deletion when not present', async () => {
      const pack = {
        id: 'pack-1',
        templatesSet: undefined,
        profile: { id: 'profile-1' },
      } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);
      (repository.remove as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...pack,
      });

      await service.deleteInnovationPack({ ID: 'pack-1' });

      expect(templatesSetService.deleteTemplatesSet).not.toHaveBeenCalled();
      expect(profileService.deleteProfile).toHaveBeenCalledWith('profile-1');
    });

    it('should skip profile deletion when not present', async () => {
      const pack = {
        id: 'pack-1',
        templatesSet: { id: 'ts-1' },
        profile: undefined,
      } as unknown as InnovationPack;
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(pack);
      (repository.remove as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...pack,
      });

      await service.deleteInnovationPack({ ID: 'pack-1' });

      expect(templatesSetService.deleteTemplatesSet).toHaveBeenCalledWith(
        'ts-1'
      );
      expect(profileService.deleteProfile).not.toHaveBeenCalled();
    });
  });
});
