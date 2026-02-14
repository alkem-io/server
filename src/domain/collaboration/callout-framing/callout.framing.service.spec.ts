import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { LinkService } from '../link/link.service';
import { MemoService } from '@domain/common/memo/memo.service';
import { MediaGalleryService } from '@domain/common/media-gallery/media.gallery.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { CalloutFraming } from './callout.framing.entity';
import { CalloutFramingService } from './callout.framing.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TagsetService } from '@domain/common/tagset/tagset.service';

describe('CalloutFramingService', () => {
  let service: CalloutFramingService;
  let repository: Repository<CalloutFraming>;
  let profileService: ProfileService;
  let whiteboardService: WhiteboardService;
  let linkService: LinkService;
  let memoService: MemoService;
  let mediaGalleryService: MediaGalleryService;
  let namingService: NamingService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let tagsetService: TagsetService;

  beforeEach(async () => {
    // Mock static CalloutFraming.create to avoid DataSource requirement
    vi.spyOn(CalloutFraming, 'create').mockImplementation((input: any) => {
      const entity = new CalloutFraming();
      Object.assign(entity, input);
      return entity as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutFramingService,
        repositoryProviderMockFactory(CalloutFraming),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CalloutFramingService);
    repository = module.get(getRepositoryToken(CalloutFraming));
    profileService = module.get(ProfileService);
    whiteboardService = module.get(WhiteboardService);
    linkService = module.get(LinkService);
    memoService = module.get(MemoService);
    mediaGalleryService = module.get(MediaGalleryService);
    namingService = module.get(NamingService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    tagsetService = module.get(TagsetService);
  });

  describe('createCalloutFraming', () => {
    const storageAggregator = { id: 'agg-1' } as any;

    it('should create framing with NONE type when no type is specified', async () => {
      const framingData = {
        profile: { displayName: 'Test Framing', tagsets: [] },
        tags: ['tag1'],
      } as any;

      vi.mocked(tagsetService.updateTagsetInputs).mockReturnValue([]);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'profile-1',
      } as any);

      const result = await service.createCalloutFraming(
        framingData,
        storageAggregator
      );

      expect(result.type).toBe(CalloutFramingType.NONE);
      expect(result.authorization).toBeDefined();
    });

    it('should create framing with WHITEBOARD type and whiteboard data', async () => {
      const framingData = {
        type: CalloutFramingType.WHITEBOARD,
        profile: { displayName: 'WB Framing', tagsets: [] },
        tags: [],
        whiteboard: {
          profile: { displayName: 'My Whiteboard' },
          content: '{}',
        },
      } as any;

      vi.mocked(tagsetService.updateTagsetInputs).mockReturnValue([]);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'profile-1',
      } as any);
      vi.mocked(namingService.createNameIdAvoidingReservedNameIDs).mockReturnValue('my-whiteboard');
      vi.mocked(whiteboardService.createWhiteboard).mockResolvedValue({
        id: 'wb-1',
      } as any);

      const result = await service.createCalloutFraming(
        framingData,
        storageAggregator,
        'user-1'
      );

      expect(result.type).toBe(CalloutFramingType.WHITEBOARD);
      expect(whiteboardService.createWhiteboard).toHaveBeenCalled();
    });

    it('should throw ValidationException when WHITEBOARD type has no whiteboard data', async () => {
      const framingData = {
        type: CalloutFramingType.WHITEBOARD,
        profile: { displayName: 'WB Framing', tagsets: [] },
        tags: [],
        // no whiteboard data
      } as any;

      vi.mocked(tagsetService.updateTagsetInputs).mockReturnValue([]);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'profile-1',
      } as any);

      await expect(
        service.createCalloutFraming(framingData, storageAggregator)
      ).rejects.toThrow(ValidationException);
    });

    it('should create framing with LINK type and link data', async () => {
      const framingData = {
        type: CalloutFramingType.LINK,
        profile: { displayName: 'Link Framing', tagsets: [] },
        tags: [],
        link: { profile: { displayName: 'A Link' }, uri: 'https://test.com' },
      } as any;

      vi.mocked(tagsetService.updateTagsetInputs).mockReturnValue([]);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'profile-1',
      } as any);
      vi.mocked(linkService.createLink).mockResolvedValue({
        id: 'link-1',
      } as any);

      const result = await service.createCalloutFraming(
        framingData,
        storageAggregator
      );

      expect(result.type).toBe(CalloutFramingType.LINK);
      expect(linkService.createLink).toHaveBeenCalled();
    });

    it('should throw ValidationException when LINK type has no link data', async () => {
      const framingData = {
        type: CalloutFramingType.LINK,
        profile: { displayName: 'Link Framing', tagsets: [] },
        tags: [],
      } as any;

      vi.mocked(tagsetService.updateTagsetInputs).mockReturnValue([]);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'profile-1',
      } as any);

      await expect(
        service.createCalloutFraming(framingData, storageAggregator)
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when MEMO type has no memo data', async () => {
      const framingData = {
        type: CalloutFramingType.MEMO,
        profile: { displayName: 'Memo Framing', tagsets: [] },
        tags: [],
      } as any;

      vi.mocked(tagsetService.updateTagsetInputs).mockReturnValue([]);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'profile-1',
      } as any);

      await expect(
        service.createCalloutFraming(framingData, storageAggregator)
      ).rejects.toThrow(ValidationException);
    });

    it('should create framing with MEMO type and memo data', async () => {
      const framingData = {
        type: CalloutFramingType.MEMO,
        profile: { displayName: 'Memo Framing', tagsets: [] },
        tags: [],
        memo: { profile: { displayName: 'A Memo' } },
      } as any;

      vi.mocked(tagsetService.updateTagsetInputs).mockReturnValue([]);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'profile-1',
      } as any);
      vi.mocked(namingService.createNameIdAvoidingReservedNameIDs).mockReturnValue('a-memo');
      vi.mocked(memoService.createMemo).mockResolvedValue({
        id: 'memo-1',
        profile: { id: 'memo-profile' },
      } as any);

      const result = await service.createCalloutFraming(
        framingData,
        storageAggregator,
        'user-1'
      );

      expect(result.type).toBe(CalloutFramingType.MEMO);
      expect(memoService.createMemo).toHaveBeenCalled();
    });

    it('should create framing with MEDIA_GALLERY type', async () => {
      const framingData = {
        type: CalloutFramingType.MEDIA_GALLERY,
        profile: { displayName: 'Gallery Framing', tagsets: [] },
        tags: [],
        mediaGallery: { visuals: [] },
      } as any;

      vi.mocked(tagsetService.updateTagsetInputs).mockReturnValue([]);
      vi.mocked(profileService.createProfile).mockResolvedValue({
        id: 'profile-1',
      } as any);
      vi.mocked(mediaGalleryService.createMediaGallery).mockResolvedValue({
        id: 'mg-1',
      } as any);

      const result = await service.createCalloutFraming(
        framingData,
        storageAggregator,
        'user-1'
      );

      expect(result.type).toBe(CalloutFramingType.MEDIA_GALLERY);
      expect(mediaGalleryService.createMediaGallery).toHaveBeenCalled();
    });
  });

  describe('updateCalloutFraming', () => {
    const storageAggregator = { id: 'agg-1' } as any;

    it('should update profile when profile data is provided', async () => {
      const framing = {
        id: 'framing-1',
        type: CalloutFramingType.NONE,
        profile: { id: 'profile-1' },
      } as any;
      const updateData = {
        profile: { displayName: 'Updated' },
      } as any;

      vi.mocked(profileService.updateProfile).mockResolvedValue({
        id: 'profile-1',
        displayName: 'Updated',
      } as any);

      const result = await service.updateCalloutFraming(
        framing,
        updateData,
        storageAggregator,
        false
      );

      expect(profileService.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'profile-1' }),
        updateData.profile
      );
    });

    it('should throw ValidationException when template transitions to non-NONE type', async () => {
      const framing = {
        id: 'framing-1',
        type: CalloutFramingType.NONE,
        profile: { id: 'profile-1' },
      } as any;
      const updateData = {
        type: CalloutFramingType.WHITEBOARD,
      } as any;

      await expect(
        service.updateCalloutFraming(
          framing,
          updateData,
          storageAggregator,
          true // isParentCalloutTemplate
        )
      ).rejects.toThrow(ValidationException);
    });

    it('should allow template to transition to NONE type', async () => {
      const framing = {
        id: 'framing-1',
        type: CalloutFramingType.WHITEBOARD,
        profile: { id: 'profile-1' },
        whiteboard: { id: 'wb-1' },
      } as any;
      const updateData = {
        type: CalloutFramingType.NONE,
      } as any;

      const result = await service.updateCalloutFraming(
        framing,
        updateData,
        storageAggregator,
        true
      );

      expect(result.type).toBe(CalloutFramingType.NONE);
    });

    it('should update whiteboard content when framing type is WHITEBOARD and content is provided', async () => {
      const framing = {
        id: 'framing-1',
        type: CalloutFramingType.WHITEBOARD,
        profile: { id: 'profile-1' },
        whiteboard: { id: 'wb-1' },
      } as any;
      const updateData = {
        whiteboardContent: '{"new":"content"}',
      } as any;

      vi.mocked(whiteboardService.updateWhiteboardContent).mockResolvedValue({
        id: 'wb-1',
      } as any);

      const result = await service.updateCalloutFraming(
        framing,
        updateData,
        storageAggregator,
        false
      );

      expect(whiteboardService.updateWhiteboardContent).toHaveBeenCalledWith(
        'wb-1',
        '{"new":"content"}'
      );
    });

    it('should create new whiteboard when WHITEBOARD type has content but no existing whiteboard', async () => {
      const framing = {
        id: 'framing-1',
        type: CalloutFramingType.WHITEBOARD,
        profile: { id: 'profile-1' },
        whiteboard: undefined,
      } as any;
      const updateData = {
        whiteboardContent: '{"elements":[]}',
      } as any;

      vi.mocked(namingService.createNameIdAvoidingReservedNameIDs).mockReturnValue('wb-name');
      vi.mocked(whiteboardService.createWhiteboard).mockResolvedValue({
        id: 'new-wb',
      } as any);

      const result = await service.updateCalloutFraming(
        framing,
        updateData,
        storageAggregator,
        false,
        'user-1'
      );

      expect(whiteboardService.createWhiteboard).toHaveBeenCalled();
    });

    it('should return framing unchanged when WHITEBOARD type has no content update', async () => {
      const framing = {
        id: 'framing-1',
        type: CalloutFramingType.WHITEBOARD,
        profile: { id: 'profile-1' },
        whiteboard: { id: 'wb-1' },
      } as any;
      const updateData = {} as any;

      const result = await service.updateCalloutFraming(
        framing,
        updateData,
        storageAggregator,
        false
      );

      expect(result).toBe(framing);
      expect(whiteboardService.updateWhiteboardContent).not.toHaveBeenCalled();
    });

    it('should update link when framing type is LINK and both exist', async () => {
      const framing = {
        id: 'framing-1',
        type: CalloutFramingType.LINK,
        profile: { id: 'profile-1' },
        link: { id: 'link-1' },
      } as any;
      const updateData = {
        link: { ID: 'link-1', uri: 'https://updated.com' },
      } as any;

      vi.mocked(linkService.updateLink).mockResolvedValue({
        id: 'link-1',
        uri: 'https://updated.com',
      } as any);

      const result = await service.updateCalloutFraming(
        framing,
        updateData,
        storageAggregator,
        false
      );

      expect(linkService.updateLink).toHaveBeenCalledWith(updateData.link);
    });

    it('should create new link when framing type is LINK but no existing link', async () => {
      const framing = {
        id: 'framing-1',
        type: CalloutFramingType.LINK,
        profile: { id: 'profile-1' },
        link: undefined,
      } as any;
      const updateData = {
        link: {
          profile: { displayName: 'New Link' },
          uri: 'https://new.com',
        },
      } as any;

      vi.mocked(linkService.createLink).mockResolvedValue({
        id: 'new-link',
      } as any);

      await service.updateCalloutFraming(
        framing,
        updateData,
        storageAggregator,
        false
      );

      expect(linkService.createLink).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete all associated entities and preserve ID', async () => {
      const framing = {
        id: 'framing-1',
        profile: { id: 'profile-1' },
        whiteboard: { id: 'wb-1' },
        link: { id: 'link-1' },
        memo: { id: 'memo-1' },
        mediaGallery: { id: 'mg-1' },
        authorization: { id: 'auth-1' },
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(framing);
      vi.mocked(repository.remove).mockResolvedValue({ id: undefined } as any);

      const result = await service.delete(framing);

      expect(profileService.deleteProfile).toHaveBeenCalledWith('profile-1');
      expect(whiteboardService.deleteWhiteboard).toHaveBeenCalledWith('wb-1');
      expect(linkService.deleteLink).toHaveBeenCalledWith('link-1');
      expect(memoService.deleteMemo).toHaveBeenCalledWith('memo-1');
      expect(mediaGalleryService.deleteMediaGallery).toHaveBeenCalledWith(
        'mg-1'
      );
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        framing.authorization
      );
      expect(result.id).toBe('framing-1');
    });

    it('should skip deleting absent optional entities', async () => {
      const framing = {
        id: 'framing-2',
        profile: undefined,
        whiteboard: undefined,
        link: undefined,
        memo: undefined,
        mediaGallery: undefined,
        authorization: undefined,
      } as any;

      vi.mocked(repository.findOne).mockResolvedValue(framing);
      vi.mocked(repository.remove).mockResolvedValue({ id: undefined } as any);

      await service.delete(framing);

      expect(profileService.deleteProfile).not.toHaveBeenCalled();
      expect(whiteboardService.deleteWhiteboard).not.toHaveBeenCalled();
      expect(linkService.deleteLink).not.toHaveBeenCalled();
      expect(memoService.deleteMemo).not.toHaveBeenCalled();
    });
  });

  describe('getCalloutFramingOrFail', () => {
    it('should return framing when found', async () => {
      const framing = { id: 'framing-1' } as CalloutFraming;
      vi.mocked(repository.findOne).mockResolvedValue(framing);

      const result = await service.getCalloutFramingOrFail('framing-1');

      expect(result).toBe(framing);
    });

    it('should throw EntityNotFoundException when framing not found', async () => {
      vi.mocked(repository.findOne).mockResolvedValue(null);

      await expect(
        service.getCalloutFramingOrFail('nonexistent')
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getProfile', () => {
    it('should return profile when it exists on framing', async () => {
      const profile = { id: 'profile-1', displayName: 'Test' } as any;
      const framing = { id: 'framing-1', profile } as CalloutFraming;
      vi.mocked(repository.findOne).mockResolvedValue(framing);

      const result = await service.getProfile({ id: 'framing-1' } as any);

      expect(result).toBe(profile);
    });

    it('should throw EntityNotFoundException when profile is not initialized', async () => {
      const framing = { id: 'framing-1', profile: undefined } as any;
      vi.mocked(repository.findOne).mockResolvedValue(framing);

      await expect(
        service.getProfile({ id: 'framing-1' } as any)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  describe('getWhiteboard', () => {
    it('should return null when framing has no whiteboard', async () => {
      const framing = {
        id: 'framing-1',
        whiteboard: undefined,
      } as CalloutFraming;
      vi.mocked(repository.findOne).mockResolvedValue(framing);

      const result = await service.getWhiteboard({ id: 'framing-1' } as any);

      expect(result).toBeNull();
    });

    it('should return whiteboard when it exists', async () => {
      const whiteboard = { id: 'wb-1' } as any;
      const framing = { id: 'framing-1', whiteboard } as any;
      vi.mocked(repository.findOne).mockResolvedValue(framing);

      const result = await service.getWhiteboard({ id: 'framing-1' } as any);

      expect(result).toBe(whiteboard);
    });
  });

  describe('getLink', () => {
    it('should return null when framing has no link', async () => {
      const framing = { id: 'framing-1', link: undefined } as CalloutFraming;
      vi.mocked(repository.findOne).mockResolvedValue(framing);

      const result = await service.getLink({ id: 'framing-1' } as any);

      expect(result).toBeNull();
    });
  });

  describe('getMemo', () => {
    it('should return null when framing has no memo', async () => {
      const framing = { id: 'framing-1', memo: undefined } as CalloutFraming;
      vi.mocked(repository.findOne).mockResolvedValue(framing);

      const result = await service.getMemo({ id: 'framing-1' } as any);

      expect(result).toBeNull();
    });
  });

  describe('getMediaGallery', () => {
    it('should return null when framing has no media gallery', async () => {
      const framing = {
        id: 'framing-1',
        mediaGallery: undefined,
      } as CalloutFraming;
      vi.mocked(repository.findOne).mockResolvedValue(framing);

      const result = await service.getMediaGallery({
        id: 'framing-1',
      } as any);

      expect(result).toBeNull();
    });
  });
});
