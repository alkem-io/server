import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { LogContext } from '@common/enums/logging.context';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IMemo } from '@domain/common/memo/memo.interface';
import { MemoService } from '@domain/common/memo/memo.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IWhiteboard } from '@domain/common/whiteboard/types';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { ICalloutSettingsContribution } from '../callout-settings/callout.settings.contribution.interface';
import { ILink } from '../link/link.interface';
import { LinkService } from '../link/link.service';
import { IPost } from '../post';
import { PostService } from '../post/post.service';
import { CalloutContribution } from './callout.contribution.entity';
import { ICalloutContribution } from './callout.contribution.interface';
import { CreateCalloutContributionInput } from './dto/callout.contribution.dto.create';

@Injectable()
export class CalloutContributionService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private postService: PostService,
    private whiteboardService: WhiteboardService,
    private linkService: LinkService,
    private memoService: MemoService,
    @InjectRepository(CalloutContribution)
    private contributionRepository: Repository<CalloutContribution>
  ) {}

  public async createCalloutContributions(
    calloutContributionsData: CreateCalloutContributionInput[],
    storageAggregator: IStorageAggregator,
    contributionSettings: ICalloutSettingsContribution,
    userID: string
  ): Promise<ICalloutContribution[]> {
    const contributions: ICalloutContribution[] = [];

    for (const calloutContributionData of calloutContributionsData) {
      const contribution = await this.createCalloutContribution(
        calloutContributionData,
        storageAggregator,
        contributionSettings,
        userID
      );
      contributions.push(contribution);
    }

    return contributions;
  }

  public async createCalloutContribution(
    calloutContributionData: CreateCalloutContributionInput,
    storageAggregator: IStorageAggregator,
    contributionSettings: ICalloutSettingsContribution,
    userID: string
  ): Promise<ICalloutContribution> {
    this.validateContributionType(
      calloutContributionData,
      contributionSettings
    );
    const contribution: ICalloutContribution = CalloutContribution.create(
      calloutContributionData
    );

    contribution.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.CALLOUT_CONTRIBUTION
    );
    contribution.createdBy = userID;
    contribution.sortOrder = calloutContributionData.sortOrder ?? 0;
    contribution.type = calloutContributionData.type;

    const { post, whiteboard, link, memo } = calloutContributionData;

    if (whiteboard) {
      contribution.whiteboard = await this.whiteboardService.createWhiteboard(
        whiteboard,
        storageAggregator,
        userID
      );
    }

    if (post) {
      contribution.post = await this.postService.createPost(
        post,
        storageAggregator,
        userID
      );
    }

    if (link) {
      contribution.link = await this.linkService.createLink(
        link,
        storageAggregator
      );
    }

    if (memo) {
      contribution.memo = await this.memoService.createMemo(
        memo,
        storageAggregator,
        userID
      );
    }

    return contribution;
  }

  private validateContributionType(
    calloutContributionData: CreateCalloutContributionInput,
    contributionSettings: ICalloutSettingsContribution
  ) {
    if (
      !contributionSettings.allowedTypes?.includes(calloutContributionData.type)
    ) {
      throw new ValidationException(
        `Attempted to create a contribution of type '${calloutContributionData.type}', which is not in the allowed types: ${contributionSettings.allowedTypes}`,
        LogContext.COLLABORATION
      );
    }

    // Map contribution types to their corresponding data fields
    const contributionTypeFields: Record<
      CalloutContributionType,
      keyof CreateCalloutContributionInput
    > = {
      [CalloutContributionType.POST]: 'post',
      [CalloutContributionType.LINK]: 'link',
      [CalloutContributionType.WHITEBOARD]: 'whiteboard',
      [CalloutContributionType.MEMO]: 'memo',
    };

    const declaredType = calloutContributionData.type;
    const requiredField = contributionTypeFields[declaredType];

    // Check if the required field for the declared type is present
    if (!calloutContributionData[requiredField]) {
      throw new ValidationException(
        `CalloutContribution type is "${declaredType}" but no ${requiredField} data was provided`,
        LogContext.COLLABORATION
      );
    }

    // Check that no other contribution type fields are present
    const otherFields = Object.entries(contributionTypeFields)
      .filter(([type]) => type !== declaredType)
      .map(([, field]) => field);

    const conflictingFields = otherFields.filter(
      field => calloutContributionData[field] !== undefined
    );

    if (conflictingFields.length > 0) {
      throw new ValidationException(
        `CalloutContribution type is "${declaredType}" but conflicting data was provided: ${conflictingFields.join(', ')}. Only ${requiredField} data should be present.`,
        LogContext.COLLABORATION
      );
    }
  }

  async delete(contributionID: string): Promise<ICalloutContribution> {
    const contribution = await this.getCalloutContributionOrFail(
      contributionID,
      {
        relations: {
          post: true,
          whiteboard: true,
          link: true,
          memo: true,
        },
      }
    );
    if (contribution.post) {
      await this.postService.deletePost(contribution.post.id);
    }

    if (contribution.whiteboard) {
      await this.whiteboardService.deleteWhiteboard(contribution.whiteboard.id);
    }

    if (contribution.link) {
      await this.linkService.deleteLink(contribution.link.id);
    }

    if (contribution.memo) {
      await this.memoService.deleteMemo(contribution.memo.id);
    }

    if (contribution.authorization) {
      await this.authorizationPolicyService.delete(contribution.authorization);
    }

    const result = await this.contributionRepository.remove(
      contribution as CalloutContribution
    );
    result.id = contributionID;
    return result;
  }

  async save(
    calloutContribution: ICalloutContribution
  ): Promise<ICalloutContribution>;
  async save(
    calloutContribution: ICalloutContribution[]
  ): Promise<ICalloutContribution[]>;
  async save(
    calloutContribution: ICalloutContribution | ICalloutContribution[]
  ): Promise<ICalloutContribution | ICalloutContribution[]> {
    const isParamArray = Array.isArray(calloutContribution);
    const contributionsArray = isParamArray
      ? calloutContribution
      : [calloutContribution];
    const results = await this.contributionRepository.save(contributionsArray);

    return isParamArray ? results : results[0];
  }

  public async getCalloutContributionOrFail(
    calloutContributionID: string,
    options?: FindOneOptions<CalloutContribution>
  ): Promise<ICalloutContribution | never> {
    const calloutContribution = await this.contributionRepository.findOne({
      where: { id: calloutContributionID },
      ...options,
    });

    if (!calloutContribution)
      throw new EntityNotFoundException(
        `No CalloutContribution found with the given id: ${calloutContributionID}`,
        LogContext.COLLABORATION
      );
    return calloutContribution;
  }

  public async getContributionsInCalloutCount(
    calloutID: string
  ): Promise<number> {
    return await this.contributionRepository.countBy({
      callout: {
        id: calloutID,
      },
    });
  }

  public async getWhiteboard(
    calloutContributionInput: ICalloutContribution,
    relations?: FindOptionsRelations<ICalloutContribution>
  ): Promise<IWhiteboard | null> {
    const calloutContribution = await this.getCalloutContributionOrFail(
      calloutContributionInput.id,
      {
        relations: { whiteboard: true, ...relations },
      }
    );
    if (!calloutContribution.whiteboard) {
      return null;
    }

    return calloutContribution.whiteboard;
  }

  public async getLink(
    calloutContributionInput: ICalloutContribution,
    relations?: FindOptionsRelations<ICalloutContribution>
  ): Promise<ILink | null> {
    const calloutContribution = await this.getCalloutContributionOrFail(
      calloutContributionInput.id,
      {
        relations: { link: true, ...relations },
      }
    );
    if (!calloutContribution.link) {
      return null;
    }

    return calloutContribution.link;
  }

  public async getPost(
    calloutContributionInput: ICalloutContribution,
    relations?: FindOptionsRelations<ICalloutContribution>
  ): Promise<IPost | null> {
    const calloutContribution = await this.getCalloutContributionOrFail(
      calloutContributionInput.id,
      {
        relations: { post: true, ...relations },
      }
    );
    if (!calloutContribution.post) {
      return null;
    }

    return calloutContribution.post;
  }

  public async getMemo(
    calloutContributionInput: ICalloutContribution,
    relations?: FindOptionsRelations<ICalloutContribution>
  ): Promise<IMemo | null> {
    const calloutContribution = await this.getCalloutContributionOrFail(
      calloutContributionInput.id,
      {
        relations: { memo: true, ...relations },
      }
    );
    if (!calloutContribution.memo) {
      return null;
    }

    return calloutContribution.memo;
  }

  /**
   * Retrieves the storage bucket associated with a specific contribution.
   * @param contributionID The ID of the contribution.
   * @returns The storage bucket associated with the contribution.
   * @throws RelationshipNotFoundException if no profile with a storage bucket is found for the contribution.
   */
  public async getStorageBucketForContribution(
    contributionID: string
  ): Promise<IStorageBucket> {
    const contribution = await this.getCalloutContributionOrFail(
      contributionID,
      {
        relations: {
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
          whiteboard: {
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
      }
    );

    const profile = this.getProfileFromContribution(contribution);
    if (!profile || !profile.storageBucket) {
      throw new RelationshipNotFoundException(
        `Unable to find profile with storage bucket for callout contribution: ${contributionID}`,
        LogContext.COLLABORATION
      );
    }
    return profile.storageBucket;
  }

  private getProfileFromContribution(
    contribution: ICalloutContribution
  ): IProfile | undefined {
    if (contribution.post) {
      return contribution.post.profile;
    } else if (contribution.link) {
      return contribution.link.profile;
    } else if (contribution.whiteboard) {
      return contribution.whiteboard.profile;
    } else if (contribution.memo) {
      return contribution.memo.profile;
    }
    return undefined;
  }
}
