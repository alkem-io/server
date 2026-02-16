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
import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';
import { calloutContributions } from './callout.contribution.schema';
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
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb
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
      calloutContributionData as Partial<CalloutContribution>
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
    const contribution = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions.id, contributionID),
      with: {
        post: true,
        whiteboard: true,
        link: true,
        memo: true,
        authorization: true,
      },
    }) as unknown as ICalloutContribution;

    if (!contribution)
      throw new EntityNotFoundException(
        `No CalloutContribution found with the given id: ${contributionID}`,
        LogContext.COLLABORATION
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

    await this.db.delete(calloutContributions).where(eq(calloutContributions.id, contributionID));
    const result = { ...contribution };
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

    const results: ICalloutContribution[] = [];
    for (const contribution of contributionsArray) {
      const [saved] = await this.db
        .insert(calloutContributions)
        .values(contribution as any)
        .onConflictDoUpdate({
          target: calloutContributions.id,
          set: contribution as any,
        })
        .returning();
      results.push(saved as unknown as ICalloutContribution);
    }

    return isParamArray ? results : results[0];
  }

  public async getCalloutContributionOrFail(
    calloutContributionID: string
  ): Promise<ICalloutContribution | never> {
    const calloutContribution = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions.id, calloutContributionID),
      with: {
        authorization: true,
        post: true,
        whiteboard: true,
        link: true,
        memo: true,
        callout: true,
      },
    }) as unknown as ICalloutContribution;

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
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(calloutContributions)
      .where(eq(calloutContributions.calloutId, calloutID));
    return Number(result[0]?.count ?? 0);
  }

  /**
   * Batch-loads contribution counts for multiple callouts in a single query.
   * Returns a Map from calloutId to count (defaults to 0 for callouts with no contributions).
   */
  public async getContributionsCountBatch(
    calloutIds: string[]
  ): Promise<Map<string, number>> {
    if (calloutIds.length === 0) {
      return new Map();
    }

    const results = await this.contributionRepository
      .createQueryBuilder('contribution')
      .select('contribution.calloutId', 'calloutId')
      .addSelect('COUNT(*)', 'count')
      .where('contribution.calloutId IN (:...calloutIds)', { calloutIds })
      .groupBy('contribution.calloutId')
      .getRawMany<{ calloutId: string; count: string }>();

    const countsMap = new Map<string, number>();
    for (const row of results) {
      countsMap.set(row.calloutId, parseInt(row.count, 10));
    }
    return countsMap;
  }

  public async getWhiteboard(
    calloutContributionInput: ICalloutContribution
  ): Promise<IWhiteboard | null> {
    const calloutContribution = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions.id, calloutContributionInput.id),
      with: {
        whiteboard: true,
      },
    }) as unknown as ICalloutContribution;

    if (!calloutContribution?.whiteboard) {
      return null;
    }

    return calloutContribution.whiteboard;
  }

  public async getLink(
    calloutContributionInput: ICalloutContribution
  ): Promise<ILink | null> {
    const calloutContribution = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions.id, calloutContributionInput.id),
      with: {
        link: true,
      },
    }) as unknown as ICalloutContribution;

    if (!calloutContribution?.link) {
      return null;
    }

    return calloutContribution.link;
  }

  public async getPost(
    calloutContributionInput: ICalloutContribution
  ): Promise<IPost | null> {
    const calloutContribution = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions.id, calloutContributionInput.id),
      with: {
        post: true,
      },
    }) as unknown as ICalloutContribution;

    if (!calloutContribution?.post) {
      return null;
    }

    return calloutContribution.post;
  }

  public async getMemo(
    calloutContributionInput: ICalloutContribution
  ): Promise<IMemo | null> {
    const calloutContribution = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions.id, calloutContributionInput.id),
      with: {
        memo: true,
      },
    }) as unknown as ICalloutContribution;

    if (!calloutContribution?.memo) {
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
    const contribution = await this.db.query.calloutContributions.findFirst({
      where: eq(calloutContributions.id, contributionID),
      with: {
        post: {
          with: {
            profile: {
              with: {
                storageBucket: true,
              },
            },
          },
        },
        link: {
          with: {
            profile: {
              with: {
                storageBucket: true,
              },
            },
          },
        },
        whiteboard: {
          with: {
            profile: {
              with: {
                storageBucket: true,
              },
            },
          },
        },
        memo: {
          with: {
            profile: {
              with: {
                storageBucket: true,
              },
            },
          },
        },
      },
    }) as unknown as ICalloutContribution;

    if (!contribution)
      throw new EntityNotFoundException(
        `No CalloutContribution found with the given id: ${contributionID}`,
        LogContext.COLLABORATION
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
