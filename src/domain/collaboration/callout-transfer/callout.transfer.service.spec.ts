import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { ProfileService } from '@domain/common/profile/profile.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Test, TestingModule } from '@nestjs/testing';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CalloutService } from '../callout/callout.service';
import { CalloutsSetService } from '../callouts-set/callouts.set.service';
import { CalloutTransferService } from './callout.transfer.service';

describe('CalloutTransferService', () => {
  let service: CalloutTransferService;
  let calloutService: CalloutService;
  let calloutsSetService: CalloutsSetService;
  let storageBucketService: StorageBucketService;
  let profileService: ProfileService;
  let tagsetService: TagsetService;
  let storageAggregatorResolverService: StorageAggregatorResolverService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutTransferService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(CalloutTransferService);
    calloutService = module.get(CalloutService);
    calloutsSetService = module.get(CalloutsSetService);
    storageBucketService = module.get(StorageBucketService);
    profileService = module.get(ProfileService);
    tagsetService = module.get(TagsetService);
    storageAggregatorResolverService = module.get(
      StorageAggregatorResolverService
    );
  });

  describe('transferCallout', () => {
    const actorContext = { actorID: 'user-1' } as any;
    const targetCalloutsSet = { id: 'target-cs' } as any;
    const storageAggregator = { id: 'agg-1' } as any;

    it('should transfer a callout to the target callouts set', async () => {
      const callout = {
        id: 'callout-1',
        nameID: 'my-callout',
        calloutsSet: { id: 'source-cs' },
      } as any;

      const savedCallout = { ...callout, id: 'callout-1' };
      const tagsetTemplateSet = {
        tagsetTemplates: [
          {
            name: 'custom-tagset',
            allowedValues: ['a', 'b'],
          },
        ],
      };
      const updatedCallout = {
        id: 'callout-1',
        framing: {
          profile: {
            storageBucket: { id: 'sb-1' },
            tagsets: [
              { id: 'ts-default', name: TagsetReservedName.DEFAULT, tags: [] },
            ],
          },
          whiteboard: undefined,
        },
        contributions: [],
      };
      const calloutWithTagsets = {
        id: 'callout-1',
        framing: {
          profile: {
            id: 'profile-1',
            tagsets: [
              { id: 'ts-default', name: TagsetReservedName.DEFAULT, tags: [] },
            ],
          },
        },
      };
      const finalCallout = { id: 'callout-1' };

      vi.mocked(
        storageAggregatorResolverService.getStorageAggregatorForCalloutsSet
      ).mockResolvedValue(storageAggregator);
      vi.mocked(calloutService.save).mockResolvedValue(savedCallout);

      // updateStorageAggregator calls getCalloutOrFail
      // updateTagsetsFromTemplates calls getCalloutOrFail
      // final call to getCalloutOrFail
      vi.mocked(calloutService.getCalloutOrFail)
        .mockResolvedValueOnce(updatedCallout as any) // for updateStorageAggregator
        .mockResolvedValueOnce(calloutWithTagsets as any) // for updateTagsetsFromTemplates
        .mockResolvedValueOnce(finalCallout as any); // final return

      vi.mocked(calloutsSetService.getTagsetTemplatesSet).mockResolvedValue(
        tagsetTemplateSet as any
      );

      vi.mocked(
        profileService.convertTagsetTemplatesToCreateTagsetInput
      ).mockReturnValue([]);

      const result = await service.transferCallout(
        callout,
        targetCalloutsSet,
        actorContext
      );

      expect(
        calloutsSetService.validateNameIDNotInUseOrFail
      ).toHaveBeenCalledWith('target-cs', 'my-callout');
      expect(callout.calloutsSet).toBe(targetCalloutsSet);
      expect(callout.createdBy).toBe('user-1');
      expect(calloutService.save).toHaveBeenCalledWith(callout);
      expect(result).toBe(finalCallout);
    });

    it('should update storage buckets for all contribution types', async () => {
      const callout = {
        id: 'callout-1',
        nameID: 'callout',
        calloutsSet: { id: 'source-cs' },
      } as any;

      const calloutWithRelations = {
        id: 'callout-1',
        framing: {
          profile: {
            storageBucket: { id: 'framing-sb' },
          },
          whiteboard: {
            profile: {
              storageBucket: { id: 'wb-sb' },
            },
          },
        },
        contributions: [
          {
            post: {
              profile: { storageBucket: { id: 'post-sb' } },
            },
            link: {
              profile: { storageBucket: { id: 'link-sb' } },
            },
            whiteboard: undefined,
            memo: undefined,
          },
        ],
      };

      vi.mocked(
        storageAggregatorResolverService.getStorageAggregatorForCalloutsSet
      ).mockResolvedValue(storageAggregator);
      vi.mocked(calloutService.save).mockResolvedValue(callout);
      vi.mocked(calloutService.getCalloutOrFail)
        .mockResolvedValueOnce(calloutWithRelations as any) // updateStorageAggregator
        .mockResolvedValueOnce({
          id: 'callout-1',
          framing: {
            profile: {
              tagsets: [
                { id: 'ts-1', name: TagsetReservedName.DEFAULT, tags: [] },
              ],
            },
          },
        } as any) // updateTagsetsFromTemplates
        .mockResolvedValueOnce(callout); // final return

      vi.mocked(calloutsSetService.getTagsetTemplatesSet).mockResolvedValue({
        tagsetTemplates: [],
      } as any);
      vi.mocked(
        profileService.convertTagsetTemplatesToCreateTagsetInput
      ).mockReturnValue([]);

      await service.transferCallout(callout, targetCalloutsSet, actorContext);

      // Verify storage buckets were updated
      expect(storageBucketService.save).toHaveBeenCalled();
    });

    it('should throw EntityNotInitializedException when callout has no contributions after loading', async () => {
      const callout = {
        id: 'callout-1',
        nameID: 'callout',
      } as any;

      vi.mocked(
        storageAggregatorResolverService.getStorageAggregatorForCalloutsSet
      ).mockResolvedValue(storageAggregator);
      vi.mocked(calloutService.save).mockResolvedValue(callout);
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValueOnce({
        id: 'callout-1',
        framing: {
          profile: { storageBucket: { id: 'sb-1' } },
        },
        contributions: undefined, // not initialized
      } as any);

      await expect(
        service.transferCallout(callout, targetCalloutsSet, actorContext)
      ).rejects.toThrow(EntityNotInitializedException);
    });

    it('should remove non-default tagsets and create new ones from templates', async () => {
      const callout = {
        id: 'callout-1',
        nameID: 'callout',
      } as any;

      vi.mocked(
        storageAggregatorResolverService.getStorageAggregatorForCalloutsSet
      ).mockResolvedValue(storageAggregator);
      vi.mocked(calloutService.save).mockResolvedValue(callout);

      const calloutWithRelations = {
        id: 'callout-1',
        framing: {
          profile: { storageBucket: { id: 'sb-1' } },
          whiteboard: undefined,
        },
        contributions: [],
      };

      const profileWithTagsets = {
        id: 'profile-1',
        tagsets: [
          {
            id: 'ts-default',
            name: TagsetReservedName.DEFAULT,
            tags: ['tag1'],
          },
          { id: 'ts-custom', name: 'custom', tags: ['old'] },
        ],
      };

      vi.mocked(calloutService.getCalloutOrFail)
        .mockResolvedValueOnce(calloutWithRelations as any)
        .mockResolvedValueOnce({
          id: 'callout-1',
          framing: { profile: profileWithTagsets },
        } as any)
        .mockResolvedValueOnce(callout);

      vi.mocked(calloutsSetService.getTagsetTemplatesSet).mockResolvedValue({
        tagsetTemplates: [{ name: 'new-tagset', allowedValues: ['x'] }],
      } as any);

      vi.mocked(
        profileService.convertTagsetTemplatesToCreateTagsetInput
      ).mockReturnValue([{ name: 'new-tagset', tags: [] }] as any);

      vi.mocked(tagsetService.createTagsetWithName).mockReturnValue({
        id: 'new-ts',
        name: 'new-tagset',
      } as any);

      await service.transferCallout(callout, targetCalloutsSet, actorContext);

      // Should remove non-default tagset
      expect(tagsetService.removeTagset).toHaveBeenCalledWith('ts-custom');
      // Should NOT remove default tagset
      expect(tagsetService.removeTagset).not.toHaveBeenCalledWith('ts-default');
      // Should create new tagset from template
      expect(tagsetService.createTagsetWithName).toHaveBeenCalled();
      expect(tagsetService.save).toHaveBeenCalled();
    });

    it('should throw RelationshipNotFoundException when profile has no tagsets', async () => {
      const callout = {
        id: 'callout-1',
        nameID: 'callout',
      } as any;

      vi.mocked(
        storageAggregatorResolverService.getStorageAggregatorForCalloutsSet
      ).mockResolvedValue(storageAggregator);
      vi.mocked(calloutService.save).mockResolvedValue(callout);

      vi.mocked(calloutService.getCalloutOrFail)
        .mockResolvedValueOnce({
          id: 'callout-1',
          framing: {
            profile: { storageBucket: { id: 'sb-1' } },
            whiteboard: undefined,
          },
          contributions: [],
        } as any)
        .mockResolvedValueOnce({
          id: 'callout-1',
          framing: {
            profile: { id: 'profile-1', tagsets: undefined },
          },
        } as any);

      vi.mocked(calloutsSetService.getTagsetTemplatesSet).mockResolvedValue({
        tagsetTemplates: [],
      } as any);

      await expect(
        service.transferCallout(callout, targetCalloutsSet, actorContext)
      ).rejects.toThrow(RelationshipNotFoundException);
    });
  });
});
