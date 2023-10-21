import { Injectable } from '@nestjs/common';
import { CreateCalloutContributionInput } from './dto/callout.contribution.dto.create';
import { ICalloutContribution } from './callout.contribution.interface';
import { CalloutContribution } from './callout.contribution.entity';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOneOptions,
  FindOptionsRelationByString,
  Repository,
} from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { LogContext } from '@common/enums/logging.context';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { IWhiteboard } from '@domain/common/whiteboard';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { PostService } from '../post/post.service';
import { ReferenceService } from '@domain/common/reference/reference.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IReference } from '@domain/common/reference';
import { IPost } from '../post';
import { ICalloutContributionPolicy } from '../callout-contribution-policy/callout.contribution.policy.interface';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { ValidationException } from '@common/exceptions';
import { ProfileService } from '@domain/common/profile/profile.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';

@Injectable()
export class CalloutContributionService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private postService: PostService,
    private whiteboardService: WhiteboardService,
    private referenceService: ReferenceService,
    private profileService: ProfileService,
    private namingService: NamingService,
    @InjectRepository(CalloutContribution)
    private contributionRepository: Repository<CalloutContribution>
  ) {}

  public async createCalloutContribution(
    calloutContributionData: CreateCalloutContributionInput,
    storageAggregator: IStorageAggregator,
    contributionPolicy: ICalloutContributionPolicy,
    userID: string,
    profileID?: string
  ): Promise<ICalloutContribution> {
    const contribution: ICalloutContribution = CalloutContribution.create(
      calloutContributionData
    );

    contribution.authorization = new AuthorizationPolicy();

    const { post, whiteboard, link } = calloutContributionData;

    if (whiteboard) {
      this.validateContributionType(
        contributionPolicy,
        CalloutContributionType.WHITEBOARD
      );
      whiteboard.nameID = this.namingService.createNameID(
        `${whiteboard.profileData.displayName}`
      );
      contribution.whiteboard = await this.whiteboardService.createWhiteboard(
        whiteboard,
        storageAggregator,
        userID
      );
    }

    if (post) {
      this.validateContributionType(
        contributionPolicy,
        CalloutContributionType.POST
      );
      post.nameID = this.namingService.createNameID(
        `${post.profileData.displayName}`
      );
      contribution.post = await this.postService.createPost(
        post,
        storageAggregator,
        userID
      );
    }

    contribution.createdBy = userID;

    if (link) {
      this.validateContributionType(
        contributionPolicy,
        CalloutContributionType.LINK
      );

      if (!profileID) {
        throw new EntityNotFoundException(
          'Attempted to create a link contribution without a profile',
          LogContext.COLLABORATION
        );
      }

      contribution.link = await this.profileService.createReference({
        ...link,
        profileID,
      });
    }

    return await this.save(contribution);
  }

  private validateContributionType(
    contributionPolicy: ICalloutContributionPolicy,
    contributionType: CalloutContributionType
  ) {
    if (
      !contributionPolicy.allowedContributionTypes.includes(contributionType)
    ) {
      throw new ValidationException(
        `Attemtped to create a contribution of type '${contributionType}', which is not in the allowed types: ${contributionPolicy.allowedContributionTypes}`,
        LogContext.COLLABORATION
      );
    }
  }

  async delete(
    contributionInput: ICalloutContribution
  ): Promise<ICalloutContribution> {
    const contributionID = contributionInput.id;
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
      await this.postService.deletePost({ ID: contribution.post.id });
    }

    if (contribution.whiteboard) {
      await this.whiteboardService.deleteWhiteboard(contribution.whiteboard.id);
    }

    if (contribution.link) {
      await this.referenceService.deleteReference({ ID: contribution.link.id });
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
  ): Promise<ICalloutContribution> {
    return await this.contributionRepository.save(calloutContribution);
  }

  public async getCalloutContributionOrFail(
    calloutContributionID: string,
    options?: FindOneOptions<CalloutContribution>
  ): Promise<ICalloutContribution | never> {
    let calloutContribution: ICalloutContribution | null = null;
    if (calloutContributionID.length === UUID_LENGTH) {
      calloutContribution = await this.contributionRepository.findOne({
        where: { id: calloutContributionID },
        ...options,
      });
    }

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
    relations: FindOptionsRelationByString = []
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
    relations: FindOptionsRelationByString = []
  ): Promise<IReference | null> {
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
    relations: FindOptionsRelationByString = []
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
}
