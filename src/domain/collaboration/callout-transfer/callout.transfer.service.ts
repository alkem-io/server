import { LogContext } from '@common/enums';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { ClassificationService } from '@domain/common/classification/classification.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Injectable } from '@nestjs/common';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { UrlGeneratorCacheService } from '@services/infrastructure/url-generator/url.generator.service.cache';
import { ICallout } from '../callout/callout.interface';
import { CalloutService } from '../callout/callout.service';
import { ICalloutsSet } from '../callouts-set/callouts.set.interface';
import { CalloutsSetService } from '../callouts-set/callouts.set.service';

@Injectable()
export class CalloutTransferService {
  constructor(
    private readonly calloutService: CalloutService,
    private readonly calloutsSetService: CalloutsSetService,
    private readonly classificationService: ClassificationService,
    private readonly storageBucketService: StorageBucketService,
    private readonly profileService: ProfileService,
    private readonly tagsetService: TagsetService,
    private readonly storageAggregatorResolverService: StorageAggregatorResolverService,
    private readonly urlGeneratorCacheService: UrlGeneratorCacheService
  ) {}

  public async transferCallout(
    callout: ICallout,
    targetCalloutsSet: ICalloutsSet
  ): Promise<ICallout> {
    // Check that the nameID is unique in the target callouts set
    await this.calloutsSetService.validateNameIDNotInUseOrFail(
      targetCalloutsSet.id,
      callout.nameID
    );

    // Update all the storage aggregators
    const storageAggregator =
      await this.storageAggregatorResolverService.getStorageAggregatorForCalloutsSet(
        targetCalloutsSet.id
      );
    // Move the callout
    callout.calloutsSet = targetCalloutsSet;
    const updatedCallout = await this.calloutService.save(callout);

    // Fix the storage aggregator
    await this.updateStorageAggregator(updatedCallout.id, storageAggregator);

    // Invalidate cached URLs for the callout and all contained entities
    await this.revokeUrlCaches(updatedCallout.id);

    const tagsetTemplateSet =
      await this.calloutsSetService.getTagsetTemplatesSet(targetCalloutsSet.id);

    // Update the profile tagsets
    await this.updateTagsetsFromTemplates(
      updatedCallout.id,
      tagsetTemplateSet.tagsetTemplates
    );

    // Update the classification tagsets to pick up the default state
    // from the target callouts set
    await this.updateClassificationFromTemplates(
      updatedCallout.id,
      tagsetTemplateSet.tagsetTemplates
    );

    return await this.calloutService.getCalloutOrFail(updatedCallout.id);
  }

  private async updateStorageAggregator(
    calloutID: string,
    storageAggregator: IStorageAggregator
  ): Promise<void> {
    const callout = await this.calloutService.getCalloutOrFail(calloutID, {
      relations: {
        framing: {
          profile: {
            storageBucket: true,
          },
          whiteboard: {
            profile: {
              storageBucket: true,
            },
          },
        },
        contributions: {
          whiteboard: {
            profile: {
              storageBucket: true,
            },
          },
          post: {
            profile: {
              storageBucket: true,
            },
          },
          link: {
            profile: {
              storageBucket: true,
            },
          },
          memo: {
            profile: {
              storageBucket: true,
            },
          },
        },
      },
    });

    if (!callout.contributions) {
      throw new EntityNotInitializedException(
        `Callout (${calloutID}) not initialized as no contributions`,
        LogContext.COLLABORATION
      );
    }
    await this.updateStorageBucketAggregator(
      callout.framing.profile.storageBucket,
      storageAggregator
    );
    await this.updateStorageBucketAggregator(
      callout.framing.whiteboard?.profile.storageBucket,
      storageAggregator
    );
    for (const contribution of callout.contributions) {
      await this.updateStorageBucketAggregator(
        contribution.post?.profile.storageBucket,
        storageAggregator
      );
      await this.updateStorageBucketAggregator(
        contribution.link?.profile.storageBucket,
        storageAggregator
      );
      await this.updateStorageBucketAggregator(
        contribution.whiteboard?.profile.storageBucket,
        storageAggregator
      );
      await this.updateStorageBucketAggregator(
        contribution.memo?.profile.storageBucket,
        storageAggregator
      );
    }
  }

  private async updateStorageBucketAggregator(
    storageBucket: IStorageBucket | undefined,
    aggregator: IStorageAggregator
  ): Promise<void> {
    if (storageBucket) {
      storageBucket.storageAggregator = aggregator;
      await this.storageBucketService.save(storageBucket);
    }
  }

  private async revokeUrlCaches(calloutID: string): Promise<void> {
    const callout = await this.calloutService.getCalloutOrFail(calloutID, {
      loadEagerRelations: false,
      relations: {
        framing: {
          profile: true,
          whiteboard: {
            profile: true,
          },
        },
        contributions: {
          post: { profile: true },
          link: { profile: true },
          whiteboard: { profile: true },
          memo: { profile: true },
        },
      },
      select: {
        id: true,
        framing: {
          id: true,
          profile: { id: true },
          whiteboard: {
            id: true,
            profile: {  id: true },
          },
        },
        contributions: {
          id: true,
          post: { id: true, profile: { id: true, } },
          link: { id: true, profile: { id: true, } },
          whiteboard: { id: true, profile: { id: true, } },
          memo: { id: true, profile: { id: true, } },
        },
      }
    });

    // Revoke the framing profile URL cache
    await this.urlGeneratorCacheService.revokeUrlCache(
      callout.framing.profile.id
    );

    // Revoke the framing whiteboard profile URL cache
    if (callout.framing.whiteboard?.profile.id) {
      await this.urlGeneratorCacheService.revokeUrlCache(
        callout.framing.whiteboard.profile.id
      );
    }

    // Revoke URL caches for all contribution profiles
    if (callout?.contributions && callout.contributions.length > 0) {
      for (const contribution of callout.contributions) {
        if (contribution.post?.profile.id) {
          void this.urlGeneratorCacheService.revokeUrlCache(
            contribution.post.profile.id
          );
        }
        if (contribution.link?.profile.id) {
          void this.urlGeneratorCacheService.revokeUrlCache(
            contribution.link.profile.id
          );
        }
        if (contribution.whiteboard?.profile.id) {
          void this.urlGeneratorCacheService.revokeUrlCache(
            contribution.whiteboard.profile.id
          );
        }
        if (contribution.memo?.profile.id) {
          void this.urlGeneratorCacheService.revokeUrlCache(
            contribution.memo.profile.id
          );
        }
      }
    }
  }

  private async updateTagsetsFromTemplates(
    calloutID: string,
    tagsetTemplates: ITagsetTemplate[]
  ): Promise<void> {
    const callout = await this.calloutService.getCalloutOrFail(calloutID, {
      relations: {
        framing: {
          profile: {
            tagsets: true,
          },
        },
      },
    });
    const profile = callout.framing.profile;
    const tagsets = profile.tagsets;
    if (!tagsets) {
      throw new RelationshipNotFoundException(
        `No tagsets found for profile: ${profile.id}`,
        LogContext.COLLABORATION
      );
    }
    for (const tagset of tagsets) {
      if (tagset.name !== TagsetReservedName.DEFAULT) {
        await this.tagsetService.removeTagset(tagset.id);
      }
    }

    const tagsetInputsFromTemplates =
      this.profileService.convertTagsetTemplatesToCreateTagsetInput(
        tagsetTemplates
      );
    for (const tagsetInput of tagsetInputsFromTemplates) {
      const tagset = this.tagsetService.createTagsetWithName([], tagsetInput);
      tagset.profile = profile;
      await this.tagsetService.save(tagset);
    }
  }

  private async updateClassificationFromTemplates(
    calloutID: string,
    tagsetTemplates: ITagsetTemplate[]
  ): Promise<void> {
    const callout = await this.calloutService.getCalloutOrFail(calloutID, {
      relations: {
        classification: true,
      },
      select: {
        id: true,
        classification: { id: true },
      }
    });

    if (!callout.classification) {
      throw new EntityNotInitializedException(
        'Callout classification not initialized',
        LogContext.COLLABORATION,
        { calloutId: calloutID }
      );
    }

    // Update each classification tagset to point to the target callouts set
    // template, picking up the correct allowedValues and defaultSelectedValue
    for (const tagsetTemplate of tagsetTemplates) {
      await this.classificationService.updateTagsetTemplateOnSelectTagset(
        callout.classification.id,
        tagsetTemplate
      );
    }
  }
}
