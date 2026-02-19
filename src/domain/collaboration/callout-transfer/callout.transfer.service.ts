import { LogContext } from '@common/enums';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import {
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { ProfileService } from '@domain/common/profile/profile.service';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Injectable } from '@nestjs/common';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { ICallout } from '../callout/callout.interface';
import { CalloutService } from '../callout/callout.service';
import { ICalloutsSet } from '../callouts-set/callouts.set.interface';
import { CalloutsSetService } from '../callouts-set/callouts.set.service';

@Injectable()
export class CalloutTransferService {
  constructor(
    private calloutService: CalloutService,
    private calloutsSetService: CalloutsSetService,
    private storageBucketService: StorageBucketService,
    private profileService: ProfileService,
    private tagsetService: TagsetService,
    private storageAggregatorResolverService: StorageAggregatorResolverService
  ) {}

  public async transferCallout(
    callout: ICallout,
    targetCalloutsSet: ICalloutsSet,
    actorContext: ActorContext
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
    // Update the user
    callout.createdBy = actorContext.actorID;
    const updatedCallout = await this.calloutService.save(callout);

    // Fix the storage aggregator
    await this.updateStorageAggregator(updatedCallout.id, storageAggregator);

    const tagsetTemplateSet =
      await this.calloutsSetService.getTagsetTemplatesSet(targetCalloutsSet.id);

    // Update the tagsets
    await this.updateTagsetsFromTemplates(
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
}
