import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CalloutContributionType } from '@common/enums/callout.contribution.type';
import { LogContext } from '@common/enums/logging.context';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { ICollaboraDocument } from '@domain/collaboration/collabora-document/collabora.document.interface';
import { CollaboraDocumentService } from '@domain/collaboration/collabora-document/collabora.document.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IClassification } from '@domain/common/classification/classification.interface';
import { ClassificationService } from '@domain/common/classification/classification.service';
import { IMemo } from '@domain/common/memo/memo.interface';
import { MemoService } from '@domain/common/memo/memo.service';
import { IProfile } from '@domain/common/profile/profile.interface';
import { ITagsetTemplate } from '@domain/common/tagset-template/tagset.template.interface';
import { matchAllowedValue } from '@domain/common/tagset-template/tagset.template.utils';
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
    private collaboraDocumentService: CollaboraDocumentService,
    private classificationService: ClassificationService,
    @InjectRepository(CalloutContribution)
    private contributionRepository: Repository<CalloutContribution>
  ) {}

  public async createCalloutContributions(
    calloutContributionsData: CreateCalloutContributionInput[],
    storageAggregator: IStorageAggregator,
    contributionSettings: ICalloutSettingsContribution,
    actorContext: ActorContext,
    userID: string,
    parentSpaceId?: string,
    boardTemplate?: ITagsetTemplate
  ): Promise<ICalloutContribution[]> {
    const contributions: ICalloutContribution[] = [];

    for (const calloutContributionData of calloutContributionsData) {
      const contribution = await this.createCalloutContribution(
        calloutContributionData,
        storageAggregator,
        contributionSettings,
        parentSpaceId,
        actorContext,
        userID,
        boardTemplate
      );
      contributions.push(contribution);
    }

    return contributions;
  }

  /**
   * Phase-2 materialization for a CalloutContribution. Post/Whiteboard/Memo
   * leaves are self-materializing inside their respective createX methods
   * (already saved + materialized when this is called). Only LINK
   * contributions need explicit materialize here.
   */
  public async materializeCalloutContributionContent(
    contribution: ICalloutContribution,
    contributionData: CreateCalloutContributionInput | undefined,
    rollback: () => Promise<unknown>
  ): Promise<void> {
    if (contribution.type === CalloutContributionType.LINK) {
      if (!contribution.link) {
        throw new RelationshipNotFoundException(
          'Missing required relation for phase-2 materialization',
          LogContext.COLLABORATION,
          {
            contributionId: contribution.id,
            missing: ['link'],
          }
        );
      }
      await this.linkService.materializeLinkContent(
        contribution.link,
        contributionData?.link,
        rollback
      );
    }
  }

  public async createCalloutContribution(
    calloutContributionData: CreateCalloutContributionInput,
    storageAggregator: IStorageAggregator,
    contributionSettings: ICalloutSettingsContribution,
    parentSpaceId: string | undefined,
    actorContext: ActorContext,
    userID: string,
    boardTemplate?: ITagsetTemplate
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
    // Empty-string actorID (anonymous/system context, e.g. bootstrap seeding) → NULL,
    // never a malformed empty string in the nullable `uuid` createdBy column.
    contribution.createdBy = userID || undefined;
    contribution.sortOrder = calloutContributionData.sortOrder ?? 0;
    contribution.type = calloutContributionData.type;

    const { post, whiteboard, link, memo, collaboraDocument } =
      calloutContributionData;

    // Resolve and validate the task column before any child content is
    // materialised: an unknown column (or a column on a non-board callout)
    // must reject the request before a post/link/memo/whiteboard/document leaf
    // is ever created, so an invalid taskColumn cannot orphan content.
    const classification = this.buildTaskClassification(
      calloutContributionData.taskColumn,
      boardTemplate
    );

    if (whiteboard) {
      contribution.whiteboard = await this.whiteboardService.createWhiteboard(
        whiteboard,
        storageAggregator,
        actorContext
      );
    }

    if (post) {
      contribution.post = await this.postService.createPost(
        post,
        storageAggregator,
        userID,
        parentSpaceId
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

    if (collaboraDocument) {
      contribution.collaboraDocument =
        await this.collaboraDocumentService.createCollaboraDocument(
          collaboraDocument,
          storageAggregator,
          userID
        );
    }

    contribution.classification = classification;

    return contribution;
  }

  /**
   * Builds the classification that carries a task's column, or undefined for a
   * contribution that is not a task.
   *
   * On a Tasks board (boardTemplate present): the requested column must be one
   * of the board's columns (matched case-insensitively, stored canonically);
   * an unknown column is rejected, and an omitted column defaults to the first.
   * Off a board (no boardTemplate): supplying a column is a client error, and a
   * contribution with no column carries no classification at all.
   */
  private buildTaskClassification(
    taskColumn: string | undefined,
    boardTemplate?: ITagsetTemplate
  ): IClassification | undefined {
    if (!boardTemplate) {
      if (taskColumn !== undefined) {
        throw new ValidationException(
          'A task column can only be set on a Tasks board callout',
          LogContext.COLLABORATION
        );
      }
      return undefined;
    }

    const allowedValues = boardTemplate.allowedValues;
    let column: string | undefined;
    if (taskColumn === undefined) {
      column = allowedValues[0];
    } else {
      column = matchAllowedValue(allowedValues, taskColumn);
      if (!column) {
        throw new ValidationException(
          'The requested task column does not exist on this Tasks board',
          LogContext.COLLABORATION,
          { taskColumn }
        );
      }
    }

    return this.classificationService.createClassification([boardTemplate], {
      tagsets: [{ name: TagsetReservedName.TASK, tags: [column] }],
    });
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
      [CalloutContributionType.COLLABORA_DOCUMENT]: 'collaboraDocument',
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
          collaboraDocument: true,
          classification: true,
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

    if (contribution.collaboraDocument) {
      await this.collaboraDocumentService.deleteCollaboraDocument(
        contribution.collaboraDocument.id
      );
    }

    // A task's column marker lives on its own classification (present only on a
    // Tasks board task). Remove it — with its tagsets and authorization — before
    // the row goes, so a deleted task leaves no orphaned classification.
    if (contribution.classification) {
      await this.classificationService.deleteClassification(
        contribution.classification.id
      );
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

  public async getCollaboraDocument(
    calloutContributionInput: ICalloutContribution,
    relations?: FindOptionsRelations<ICalloutContribution>
  ): Promise<ICollaboraDocument | null> {
    const calloutContribution = await this.getCalloutContributionOrFail(
      calloutContributionInput.id,
      {
        relations: { collaboraDocument: true, ...relations },
      }
    );
    if (!calloutContribution.collaboraDocument) {
      return null;
    }

    return calloutContribution.collaboraDocument;
  }

  /**
   * The contribution's classification, present only for a task on a Tasks
   * board (it carries the task's column). Null for every other contribution.
   */
  public async getClassification(
    calloutContributionInput: ICalloutContribution,
    relations?: FindOptionsRelations<ICalloutContribution>
  ): Promise<IClassification | null> {
    const calloutContribution = await this.getCalloutContributionOrFail(
      calloutContributionInput.id,
      {
        relations: { classification: { tagsets: true }, ...relations },
      }
    );
    if (!calloutContribution.classification) {
      return null;
    }

    return calloutContribution.classification;
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
          collaboraDocument: {
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
    } else if (contribution.collaboraDocument) {
      return contribution.collaboraDocument.profile;
    }
    return undefined;
  }
}
