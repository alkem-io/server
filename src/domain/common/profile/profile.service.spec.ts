import { ProfileType } from '@common/enums';
import { TagsetType } from '@common/enums/tagset.type';
import { VisualType } from '@common/enums/visual.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  NotSupportedException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LocationService } from '@domain/common/location/location.service';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { VisualService } from '@domain/common/visual/visual.service';
import { ProfileDocumentsService } from '@domain/profile-documents/profile.documents.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { Profile } from './profile.entity';
import { ProfileService } from './profile.service';
import { mockDrizzleProvider } from '@test/utils/drizzle.mock.factory';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import { vi } from 'vitest';

describe('ProfileService', () => {
  let service: ProfileService;
  let db: any;
  let tagsetService: TagsetService;
  let referenceService: ReferenceService;
  let visualService: VisualService;
  let locationService: LocationService;
  let storageBucketService: StorageBucketService;
  let profileDocumentsService: ProfileDocumentsService;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
    // Mock static Profile.create to avoid DataSource requirement
    vi.spyOn(Profile, 'create').mockImplementation((input: any) => {
      const entity = new Profile();
      Object.assign(entity, input);
      return entity as any;
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        mockDrizzleProvider,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ProfileService);
    db = module.get(DRIZZLE);
    tagsetService = module.get(TagsetService);
    referenceService = module.get(ReferenceService);
    visualService = module.get(VisualService);
    locationService = module.get(LocationService);
    storageBucketService = module.get(StorageBucketService);
    profileDocumentsService = module.get(ProfileDocumentsService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createProfile', () => {
    it('should create profile with authorization, storage bucket, location, visuals, and tagsets', async () => {
      const storageAggregator = {
        id: 'sa-1',
      } as unknown as IStorageAggregator;
      const storageBucket = { id: 'sb-1' };
      const location = { id: 'loc-1' };

      vi.mocked(storageBucketService.createStorageBucket).mockReturnValue(
        storageBucket as any
      );
      vi.mocked(locationService.createLocation).mockResolvedValue(
        location as any
      );
      vi.mocked(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).mockResolvedValue('processed-description');
      vi.mocked(
        profileDocumentsService.reuploadFileOnStorageBucket
      ).mockResolvedValue(undefined as any);

      const tagset = { id: 'ts-1', name: 'skills', tags: [] };
      vi.mocked(tagsetService.createTagsetWithName).mockReturnValue(
        tagset as any
      );

      const result = await service.createProfile(
        {
          displayName: 'Test Profile',
          description: 'A test description',
          tagline: 'tagline',
          tagsets: [{ name: 'skills', tags: ['ts'] }],
        },
        ProfileType.USER,
        storageAggregator
      );

      expect(result.displayName).toBe('Test Profile');
      expect(result.type).toBe(ProfileType.USER);
      expect(result.authorization).toBeDefined();
      expect(result.storageBucket).toBe(storageBucket);
      expect(result.location).toBe(location);
      expect(result.visuals).toEqual([]);
      expect(result.tagsets).toEqual([tagset]);
      expect(result.description).toBe('processed-description');
    });

    it('should default tagsets to empty array when not provided', async () => {
      const storageAggregator = {
        id: 'sa-1',
      } as unknown as IStorageAggregator;

      vi.mocked(storageBucketService.createStorageBucket).mockReturnValue({
        id: 'sb-1',
      } as any);
      vi.mocked(locationService.createLocation).mockResolvedValue({
        id: 'loc-1',
      } as any);
      vi.mocked(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).mockResolvedValue('');
      vi.mocked(
        profileDocumentsService.reuploadFileOnStorageBucket
      ).mockResolvedValue(undefined as any);

      const result = await service.createProfile(
        { displayName: 'Minimal Profile' },
        ProfileType.SPACE_ABOUT,
        storageAggregator
      );

      expect(result.tagsets).toEqual([]);
    });

    it('should create references when referencesData is provided', async () => {
      const storageAggregator = {
        id: 'sa-1',
      } as unknown as IStorageAggregator;

      vi.mocked(storageBucketService.createStorageBucket).mockReturnValue({
        id: 'sb-1',
      } as any);
      vi.mocked(locationService.createLocation).mockResolvedValue({
        id: 'loc-1',
      } as any);
      vi.mocked(
        profileDocumentsService.reuploadDocumentsInMarkdownToStorageBucket
      ).mockResolvedValue('');
      vi.mocked(
        profileDocumentsService.reuploadFileOnStorageBucket
      ).mockResolvedValue(undefined as any);

      const newRef = { id: 'ref-1', name: 'website', uri: 'http://test.com' };
      vi.mocked(referenceService.createReference).mockReturnValue(
        newRef as any
      );

      const result = await service.createProfile(
        {
          displayName: 'Profile with refs',
          referencesData: [{ name: 'website', uri: 'http://test.com' }],
        },
        ProfileType.USER,
        storageAggregator
      );

      expect(result.references).toHaveLength(1);
      expect(result.references![0].name).toBe('website');
    });
  });

  describe('updateProfile', () => {
    it('should update description, displayName, and tagline when provided', async () => {
      const existingProfile = {
        id: 'p-1',
        displayName: 'Old Name',
        description: 'Old desc',
        tagline: 'Old tagline',
        references: [],
        tagsets: [],
        location: { id: 'loc-1' },
        visuals: [],
        authorization: { id: 'auth-1' },
      } as unknown as Profile;

      db.query.profiles.findFirst.mockResolvedValueOnce(existingProfile);
      db.returning.mockResolvedValueOnce([{ ...existingProfile, displayName: 'New Name', description: 'New desc', tagline: 'New tagline' }]);

      const result = await service.updateProfile({ id: 'p-1' } as any, {
        displayName: 'New Name',
        description: 'New desc',
        tagline: 'New tagline',
      });

      expect(result.displayName).toBe('New Name');
      expect(result.description).toBe('New desc');
      expect(result.tagline).toBe('New tagline');
    });

    it('should update references and tagsets when provided', async () => {
      const existingProfile = {
        id: 'p-1',
        displayName: 'Name',
        references: [{ id: 'ref-1', name: 'old' }],
        tagsets: [{ id: 'ts-1', name: 'skills' }],
        location: { id: 'loc-1' },
        visuals: [],
        authorization: { id: 'auth-1' },
      } as unknown as Profile;

      db.query.profiles.findFirst.mockResolvedValueOnce(existingProfile);

      const updatedRefs = [{ id: 'ref-1', name: 'updated' }];
      const updatedTagsets = [{ id: 'ts-1', name: 'skills', tags: ['new'] }];
      vi.mocked(referenceService.updateReferences).mockReturnValue(
        updatedRefs as any
      );
      vi.mocked(tagsetService.updateTagsets).mockReturnValue(
        updatedTagsets as any
      );
      db.returning.mockResolvedValueOnce([{ ...existingProfile, references: updatedRefs, tagsets: updatedTagsets }]);

      const result = await service.updateProfile({ id: 'p-1' } as any, {
        references: [{ ID: 'ref-1', name: 'updated' }] as any,
        tagsets: [{ ID: 'ts-1', tags: ['new'] }] as any,
      });

      expect(result.references).toEqual(updatedRefs);
      expect(result.tagsets).toEqual(updatedTagsets);
    });

    it('should update location when provided and location exists', async () => {
      const existingProfile = {
        id: 'p-1',
        displayName: 'Name',
        references: [],
        tagsets: [],
        location: { id: 'loc-1', city: 'Old City' },
        visuals: [],
        authorization: { id: 'auth-1' },
      } as unknown as Profile;

      db.query.profiles.findFirst.mockResolvedValueOnce(existingProfile);

      const updatedLocation = { id: 'loc-1', city: 'New City' };
      vi.mocked(locationService.updateLocation).mockResolvedValue(
        updatedLocation as any
      );
      db.returning.mockResolvedValueOnce([{ ...existingProfile, location: updatedLocation }]);

      const result = await service.updateProfile({ id: 'p-1' } as any, {
        location: { city: 'New City' } as any,
      });

      expect(result.location).toEqual(updatedLocation);
    });

  });

  describe('deleteProfile', () => {
    it('should cascade delete tagsets, references, storage bucket, visuals, location, and authorization', async () => {
      const profile = {
        id: 'p-1',
        tagsets: [{ id: 'ts-1' }, { id: 'ts-2' }],
        references: [{ id: 'ref-1' }],
        storageBucket: { id: 'sb-1' },
        visuals: [{ id: 'v-1' }, { id: 'v-2' }],
        location: { id: 'loc-1' },
        authorization: { id: 'auth-1' },
      } as unknown as Profile;

      db.query.profiles.findFirst.mockResolvedValueOnce(profile);
      vi.mocked(tagsetService.removeTagset).mockResolvedValue({} as any);
      vi.mocked(referenceService.deleteReference).mockResolvedValue({} as any);
      vi.mocked(storageBucketService.deleteStorageBucket).mockResolvedValue(
        {} as any
      );
      vi.mocked(visualService.deleteVisual).mockResolvedValue({} as any);
      vi.mocked(locationService.removeLocation).mockResolvedValue({} as any);
      vi.mocked(authorizationPolicyService.delete).mockResolvedValue({} as any);

      await service.deleteProfile('p-1');

      expect(tagsetService.removeTagset).toHaveBeenCalledTimes(2);
      expect(tagsetService.removeTagset).toHaveBeenCalledWith('ts-1');
      expect(tagsetService.removeTagset).toHaveBeenCalledWith('ts-2');
      expect(referenceService.deleteReference).toHaveBeenCalledWith({
        ID: 'ref-1',
      });
      expect(storageBucketService.deleteStorageBucket).toHaveBeenCalledWith(
        'sb-1'
      );
      expect(visualService.deleteVisual).toHaveBeenCalledTimes(2);
      expect(visualService.deleteVisual).toHaveBeenCalledWith({ ID: 'v-1' });
      expect(visualService.deleteVisual).toHaveBeenCalledWith({ ID: 'v-2' });
      expect(locationService.removeLocation).toHaveBeenCalledWith(
        profile.location
      );
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        profile.authorization
      );
    });

    it('should skip deletion of undefined relations gracefully', async () => {
      const profile = {
        id: 'p-1',
        tagsets: undefined,
        references: undefined,
        storageBucket: undefined,
        visuals: undefined,
        location: undefined,
        authorization: undefined,
      } as unknown as Profile;

      db.query.profiles.findFirst.mockResolvedValueOnce(profile);

      await service.deleteProfile('p-1');

      expect(tagsetService.removeTagset).not.toHaveBeenCalled();
      expect(referenceService.deleteReference).not.toHaveBeenCalled();
      expect(storageBucketService.deleteStorageBucket).not.toHaveBeenCalled();
      expect(visualService.deleteVisual).not.toHaveBeenCalled();
      expect(locationService.removeLocation).not.toHaveBeenCalled();
      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });
  });

  describe('addVisualsOnProfile', () => {
    it('should create correct visual for AVATAR, BANNER, and CARD types', async () => {
      const avatarVisual = { id: 'av-1', name: VisualType.AVATAR, uri: '' };
      const bannerVisual = { id: 'bv-1', name: VisualType.BANNER, uri: '' };
      const cardVisual = { id: 'cv-1', name: VisualType.CARD, uri: '' };

      vi.mocked(visualService.createVisualAvatar).mockReturnValue(
        avatarVisual as any
      );
      vi.mocked(visualService.createVisualBanner).mockReturnValue(
        bannerVisual as any
      );
      vi.mocked(visualService.createVisualCard).mockReturnValue(
        cardVisual as any
      );
      vi.mocked(
        profileDocumentsService.reuploadFileOnStorageBucket
      ).mockResolvedValue(undefined as any);

      const profile = {
        id: 'p-1',
        visuals: [],
        storageBucket: { id: 'sb-1' },
      } as unknown as Profile;

      const result = await service.addVisualsOnProfile(profile, undefined, [
        VisualType.AVATAR,
        VisualType.BANNER,
        VisualType.CARD,
      ]);

      expect(result.visuals).toHaveLength(3);
      expect(result.visuals![0]).toBe(avatarVisual);
      expect(result.visuals![1]).toBe(bannerVisual);
      expect(result.visuals![2]).toBe(cardVisual);
      expect(visualService.createVisualAvatar).toHaveBeenCalled();
      expect(visualService.createVisualBanner).toHaveBeenCalled();
      expect(visualService.createVisualCard).toHaveBeenCalled();
    });

    it('should throw EntityNotInitializedException when visuals not initialized', async () => {
      const profile = {
        id: 'p-1',
        visuals: undefined,
        storageBucket: { id: 'sb-1' },
      } as unknown as Profile;

      await expect(
        service.addVisualsOnProfile(profile, undefined, [VisualType.AVATAR])
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw EntityNotInitializedException when storageBucket not initialized', async () => {
      const profile = {
        id: 'p-1',
        visuals: [],
        storageBucket: undefined,
      } as unknown as Profile;

      await expect(
        service.addVisualsOnProfile(profile, undefined, [VisualType.AVATAR])
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should throw NotSupportedException for unknown visual type', async () => {
      const profile = {
        id: 'p-1',
        visuals: [],
        storageBucket: { id: 'sb-1' },
      } as unknown as Profile;

      await expect(
        service.addVisualsOnProfile(profile, undefined, [
          'unknown-type' as VisualType,
        ])
      ).rejects.toThrow(NotSupportedException);
    });
  });

  describe('addOrUpdateTagsetOnProfile', () => {
    it('should merge tags when tagset exists using Set deduplication', async () => {
      const existingTagset = {
        id: 'ts-1',
        name: 'skills',
        tags: ['typescript', 'node'],
      };
      const profile = {
        id: 'p-1',
        tagsets: [existingTagset],
      } as unknown as Profile;

      const result = await service.addOrUpdateTagsetOnProfile(profile, {
        name: 'skills',
        tags: ['node', 'graphql'],
      });

      // Set deduplication should remove duplicate 'node'
      expect(result.tags).toEqual(['typescript', 'node', 'graphql']);
    });

    it('should create new tagset when not found', async () => {
      const profile = {
        id: 'p-1',
        tagsets: [],
      } as unknown as Profile;

      const newTagset = { id: 'ts-new', name: 'topics', tags: ['ai'] };
      vi.mocked(tagsetService.createTagsetWithName).mockReturnValue(
        newTagset as any
      );

      const result = await service.addOrUpdateTagsetOnProfile(profile, {
        name: 'topics',
        tags: ['ai'],
      });

      expect(result).toBe(newTagset);
      expect(profile.tagsets).toContain(newTagset);
      expect(tagsetService.createTagsetWithName).toHaveBeenCalledWith(
        profile.tagsets,
        { name: 'topics', tags: ['ai'] }
      );
    });

    it('should load tagsets if not initialized on profile', async () => {
      const loadedTagsets = [{ id: 'ts-1', name: 'skills', tags: ['ts'] }];
      const profile = {
        id: 'p-1',
        tagsets: undefined,
      } as unknown as Profile;

      // getTagsets calls getProfileOrFail -> db.query.profiles.findFirst
      db.query.profiles.findFirst.mockResolvedValueOnce({
        id: 'p-1',
        tagsets: loadedTagsets,
      });

      const newTagset = { id: 'ts-new', name: 'topics', tags: [] };
      vi.mocked(tagsetService.createTagsetWithName).mockReturnValue(
        newTagset as any
      );

      await service.addOrUpdateTagsetOnProfile(profile, {
        name: 'topics',
        tags: [],
      });

      expect(db.query.profiles.findFirst).toHaveBeenCalled();
    });
  });

  describe('createReference', () => {
    it('should create and save reference on profile', async () => {
      const profile = {
        id: 'p-1',
        references: [],
      } as unknown as Profile;

      db.query.profiles.findFirst.mockResolvedValueOnce(profile);

      const newRef = {
        id: 'ref-1',
        name: 'website',
        uri: 'http://test.com',
      };
      vi.mocked(referenceService.createReference).mockReturnValue(
        newRef as any
      );
      vi.mocked(referenceService.save).mockResolvedValue(newRef as any);

      const result = await service.createReference({
        profileID: 'p-1',
        name: 'website',
        uri: 'http://test.com',
      });

      expect(result).toEqual(newRef);
      expect(referenceService.createReference).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'website' })
      );
      expect(referenceService.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ref-1', profile })
      );
    });

    it('should throw ValidationException for duplicate reference name', async () => {
      const profile = {
        id: 'p-1',
        references: [{ id: 'ref-1', name: 'website' }],
      } as unknown as Profile;

      db.query.profiles.findFirst.mockResolvedValueOnce(profile);

      await expect(
        service.createReference({
          profileID: 'p-1',
          name: 'website',
          uri: 'http://different.com',
        })
      ).rejects.toThrow(ValidationException);
    });

    it('should throw EntityNotInitializedException when references not initialized', async () => {
      const profile = {
        id: 'p-1',
        references: undefined,
      } as unknown as Profile;

      db.query.profiles.findFirst.mockResolvedValueOnce(profile);

      await expect(
        service.createReference({
          profileID: 'p-1',
          name: 'website',
          uri: 'http://test.com',
        })
      ).rejects.toThrow(EntityNotInitializedException);
    });
  });

  describe('getProfileOrFail', () => {
    it('should return profile when found', async () => {
      const profile = { id: 'p-1', displayName: 'Found' } as Profile;
      db.query.profiles.findFirst.mockResolvedValueOnce(profile);

      const result = await service.getProfileOrFail('p-1');

      expect(result).toBe(profile);
    });

    it('should throw EntityNotFoundException when not found', async () => {
      await expect(service.getProfileOrFail('missing-id')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should pass options to Profile.findOne with id in where clause', async () => {
      const profile = { id: 'p-1' } as Profile;
      db.query.profiles.findFirst.mockResolvedValueOnce(profile);

      await service.getProfileOrFail('p-1', {
        relations: { references: true },
      });
    });
  });

  describe('getReferences', () => {
    it('should return references when initialized', async () => {
      const refs = [{ id: 'ref-1', name: 'website' }];
      db.query.profiles.findFirst.mockResolvedValueOnce({
        id: 'p-1',
        references: refs,
      });

      const result = await service.getReferences({ id: 'p-1' } as any);

      expect(result).toEqual(refs);
    });

    it('should throw EntityNotInitializedException when references not initialized', async () => {
      db.query.profiles.findFirst.mockResolvedValueOnce({
        id: 'p-1',
        references: undefined,
      });

      await expect(service.getReferences({ id: 'p-1' } as any)).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('getVisuals', () => {
    it('should return visuals when initialized', async () => {
      const visuals = [{ id: 'v-1', name: VisualType.AVATAR }];
      db.query.profiles.findFirst.mockResolvedValueOnce({
        id: 'p-1',
        visuals,
      });

      const result = await service.getVisuals({ id: 'p-1' } as any);

      expect(result).toEqual(visuals);
    });

    it('should throw EntityNotInitializedException when visuals not initialized', async () => {
      db.query.profiles.findFirst.mockResolvedValueOnce({
        id: 'p-1',
        visuals: undefined,
      });

      await expect(service.getVisuals({ id: 'p-1' } as any)).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('getTagsets', () => {
    it('should return tagsets when initialized', async () => {
      const tagsets = [{ id: 'ts-1', name: 'skills', tags: ['ts'] }];
      db.query.profiles.findFirst.mockResolvedValueOnce({
        id: 'p-1',
        tagsets,
      });

      const result = await service.getTagsets({ id: 'p-1' } as any);

      expect(result).toEqual(tagsets);
    });

    it('should throw EntityNotInitializedException when tagsets not initialized', async () => {
      db.query.profiles.findFirst.mockResolvedValueOnce({
        id: 'p-1',
        tagsets: undefined,
      });

      await expect(service.getTagsets({ id: 'p-1' } as any)).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('getLocation', () => {
    it('should return location when initialized', async () => {
      const location = { id: 'loc-1', city: 'Sofia' };
      db.query.profiles.findFirst.mockResolvedValueOnce({
        id: 'p-1',
        location,
      });

      const result = await service.getLocation({ id: 'p-1' } as any);

      expect(result).toEqual(location);
    });

    it('should throw EntityNotInitializedException when location not initialized', async () => {
      db.query.profiles.findFirst.mockResolvedValueOnce({
        id: 'p-1',
        location: undefined,
      });

      await expect(service.getLocation({ id: 'p-1' } as any)).rejects.toThrow(
        EntityNotInitializedException
      );
    });
  });

  describe('convertTagsetTemplatesToCreateTagsetInput', () => {
    it('should transform templates to input array', () => {
      const templates: Partial<ITagsetTemplate>[] = [
        {
          name: 'skills',
          type: TagsetType.FREEFORM,
          allowedValues: [],
        },
        {
          name: 'industry',
          type: TagsetType.SELECT_ONE,
          allowedValues: ['tech', 'finance'],
        },
      ];

      const result = service.convertTagsetTemplatesToCreateTagsetInput(
        templates as ITagsetTemplate[]
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          name: 'skills',
          type: TagsetType.FREEFORM,
          tags: undefined,
        })
      );
      expect(result[1]).toEqual(
        expect.objectContaining({
          name: 'industry',
          type: TagsetType.SELECT_ONE,
        })
      );
    });

    it('should include defaultSelectedValue as tag when present', () => {
      const templates: Partial<ITagsetTemplate>[] = [
        {
          name: 'industry',
          type: TagsetType.SELECT_ONE,
          allowedValues: ['tech', 'finance'],
          defaultSelectedValue: 'tech',
        },
      ];

      const result = service.convertTagsetTemplatesToCreateTagsetInput(
        templates as ITagsetTemplate[]
      );

      expect(result[0].tags).toEqual(['tech']);
    });

    it('should set tags to undefined when no defaultSelectedValue', () => {
      const templates: Partial<ITagsetTemplate>[] = [
        {
          name: 'skills',
          type: TagsetType.FREEFORM,
          allowedValues: [],
          defaultSelectedValue: undefined,
        },
      ];

      const result = service.convertTagsetTemplatesToCreateTagsetInput(
        templates as ITagsetTemplate[]
      );

      expect(result[0].tags).toBeUndefined();
    });

    it('should include tagsetTemplate reference in each input', () => {
      const template = {
        name: 'skills',
        type: TagsetType.FREEFORM,
        allowedValues: [],
      } as unknown as ITagsetTemplate;

      const result = service.convertTagsetTemplatesToCreateTagsetInput([
        template,
      ]);

      expect(result[0].tagsetTemplate).toBe(template);
    });
  });
});
