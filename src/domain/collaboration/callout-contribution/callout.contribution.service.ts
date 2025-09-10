import { Injectable } from '@nestjs/common';
import { CreateCalloutContributionInput } from './dto/callout.contribution.dto.create';
import { ICalloutContribution } from './callout.contribution.interface';
import { CalloutContribution } from './callout.contribution.entity';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { IWhiteboard } from '@domain/common/whiteboard/types';
import { PostService } from '../post/post.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IPost } from '../post';
import { ICalloutSettingsContribution } from '../callout-settings/callout.settings.contribution.interface';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { LinkService } from '../link/link.service';
import { ILink } from '../link/link.interface';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { IProfile } from '@domain/common/profile/profile.interface';

@Injectable()
export class CalloutContributionService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private postService: PostService,
    private whiteboardService: WhiteboardService,
    private linkService: LinkService,
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
    const contribution: ICalloutContribution = CalloutContribution.create(
      calloutContributionData
    );

    contribution.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.CALLOUT_CONTRIBUTION
    );
    contribution.createdBy = userID;
    contribution.sortOrder = calloutContributionData.sortOrder ?? 0;

    const { post, whiteboard, link } = calloutContributionData;

    if (whiteboard) {
      this.validateContributionType(
        contributionSettings,
        CalloutContributionType.WHITEBOARD
      );
      contribution.whiteboard = await this.whiteboardService.createWhiteboard(
        whiteboard,
        storageAggregator,
        userID
      );
    }

    if (post) {
      this.validateContributionType(
        contributionSettings,
        CalloutContributionType.POST
      );

      contribution.post = await this.postService.createPost(
        post,
        storageAggregator,
        userID
      );
    }

    if (link) {
      this.validateContributionType(
        contributionSettings,
        CalloutContributionType.LINK
      );

      contribution.link = await this.linkService.createLink(
        link,
        storageAggregator
      );
    }

    return contribution;
  }

  private validateContributionType(
    contributionSettings: ICalloutSettingsContribution,
    contributionType: CalloutContributionType
  ) {
    if (!contributionSettings.allowedTypes?.includes(contributionType)) {
      throw new ValidationException(
        `Attemtped to create a contribution of type '${contributionType}', which is not in the allowed types: ${contributionSettings.allowedTypes}`,
        LogContext.COLLABORATION
      );
    }
  }

  async delete(contributionID: string) {
    const contribution = await this.getCalloutContributionOrFail(
      contributionID,
      {
        relations: {
          post: true,
          whiteboard: true,
          link: true,
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

    if (contribution.authorization) {
      await this.authorizationPolicyService.delete(contribution.authorization);
    }

    const result = await this.contributionRepository.remove(
      contribution as CalloutContribution
    );
    result.id = contributionID;
    return {
      contribution: result,
      whiteboard: contribution.whiteboard,
      post: contribution.post,
      link: contribution.link,
    };
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

  public getContributionByChildIdOrFail(
    childID: string,
    relations?: FindOptionsRelations<ICalloutContribution>
  ): Promise<ICalloutContribution> {
    return this.contributionRepository.findOneOrFail({
      where: [
        { post: { id: childID } },
        { whiteboard: { id: childID } },
        { link: { id: childID } },
      ],
      relations: {
        ...relations,
        post: true,
        whiteboard: true,
        link: true,
      },
    });
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
    }
    return undefined;
  }
}
