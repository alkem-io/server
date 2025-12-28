import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { ActorContext } from '@core/actor-context';
import { CreateTagsetTemplateInput } from '@domain/common/tagset-template';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TimelineService } from '@domain/timeline/timeline/timeline.service';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { InnovationFlowService } from '../innovation-flow/innovation.flow.service';
import { TagsetType } from '@common/enums/tagset.type';
import { IInnovationFlow } from '../innovation-flow/innovation.flow.interface';
import { CreateCollaborationInput } from './dto/collaboration.dto.create';
import { Space } from '@domain/space/space/space.entity';
import { SpaceLevel } from '@common/enums/space.level';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CreateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto';
import { LicenseService } from '@domain/common/license/license.service';
import { LicenseType } from '@common/enums/license.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { CalloutsSetService } from '../callouts-set/callouts.set.service';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { ICalloutsSet } from '../callouts-set/callouts.set.interface';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { sortBySortOrder } from '../innovation-flow-state/utils/sortBySortOrder';

@Injectable()
export class CollaborationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutsSetService: CalloutsSetService,
    private innovationFlowService: InnovationFlowService,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    private timelineService: TimelineService,
    private licenseService: LicenseService
  ) {}

  async createCollaboration(
    collaborationData: CreateCollaborationInput,
    storageAggregator: IStorageAggregator,
    actorContext?: ActorContext
  ): Promise<ICollaboration> {
    if (
      !collaborationData.calloutsSetData ||
      !collaborationData.innovationFlowData
    ) {
      throw new RelationshipNotFoundException(
        'Unable to create Collaboration: missing required data',
        LogContext.COLLABORATION
      );
    }
    const collaboration: ICollaboration = Collaboration.create();
    collaboration.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.COLLABORATION
    );

    collaboration.calloutsSet = this.calloutsSetService.createCalloutsSet(
      collaborationData.calloutsSetData,
      CalloutsSetType.COLLABORATION
    );

    const innovationFlowStatesTagsetInput =
      this.createInnovationFlowStatesTagsetTemplateInput(
        collaborationData.innovationFlowData
      );
    collaboration.calloutsSet.tagsetTemplateSet =
      this.calloutsSetService.addTagsetTemplate(
        collaboration.calloutsSet,
        innovationFlowStatesTagsetInput
      );

    // save the calloutsSet with the tagsetTemplates so can use it in the innovation flow as a template for it's tags
    await this.calloutsSetService.save(collaboration.calloutsSet);

    collaboration.isTemplate = collaborationData.isTemplate || false;

    if (!collaboration.isTemplate) {
      collaboration.timeline = this.timelineService.createTimeline();
    }

    collaboration.license = this.licenseService.createLicense({
      type: LicenseType.COLLABORATION,
      entitlements: [
        {
          type: LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: false,
        },
        {
          type: LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: false,
        },
        {
          type: LicenseEntitlementType.SPACE_FLAG_MEMO_MULTI_USER,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: false,
        },
      ],
    });

    const flowStatesTagsetTemplate = this.calloutsSetService.getTagsetTemplate(
      collaboration.calloutsSet.tagsetTemplateSet,
      TagsetReservedName.FLOW_STATE
    );

    if (!flowStatesTagsetTemplate) {
      throw new RelationshipNotFoundException(
        'Unable to create tagset template for flow states',
        LogContext.COLLABORATION
      );
    }
    // Note: need to create the innovation flow after creation of
    // tagsetTemplates on Collaboration so can pass it in to the InnovationFlow
    collaboration.innovationFlow =
      await this.innovationFlowService.createInnovationFlow(
        collaborationData.innovationFlowData,
        storageAggregator,
        flowStatesTagsetTemplate
      );

    if (collaborationData.calloutsSetData.calloutsData) {
      collaborationData.calloutsSetData.calloutsData.forEach(
        callout => (callout.isTemplate = collaboration.isTemplate)
      );
      collaboration.calloutsSet.callouts =
        await this.calloutsSetService.addCallouts(
          collaboration.calloutsSet,
          collaborationData.calloutsSetData.calloutsData,
          storageAggregator,
          actorContext?.actorId
        );
    }

    this.calloutsSetService.moveCalloutsToDefaultFlowState(
      flowStatesTagsetTemplate.allowedValues,
      collaboration.calloutsSet.callouts
    );

    return collaboration;
  }

  private createInnovationFlowStatesTagsetTemplateInput(
    innovationFlowData: CreateInnovationFlowInput
  ): CreateTagsetTemplateInput {
    this.innovationFlowService.validateInnovationFlowDefinition(
      innovationFlowData.states
    );
    const allowedValues = innovationFlowData.states
      .sort(sortBySortOrder)
      .map(state => state.displayName);
    let defaultSelectedValue = innovationFlowData.currentStateDisplayName;
    if (
      !defaultSelectedValue ||
      allowedValues.indexOf(defaultSelectedValue) === -1
    ) {
      defaultSelectedValue = allowedValues[0];
    }

    const tagsetTemplateDataStates: CreateTagsetTemplateInput = {
      name: TagsetReservedName.FLOW_STATE,
      type: TagsetType.SELECT_ONE,
      allowedValues,
      defaultSelectedValue,
    };
    return tagsetTemplateDataStates;
  }

  async save(collaboration: ICollaboration): Promise<ICollaboration> {
    return await this.collaborationRepository.save(collaboration);
  }

  async getCollaborationOrFail(
    collaborationID: string,
    options?: FindOneOptions<Collaboration>
  ): Promise<ICollaboration | never> {
    const { where, ...rest } = options ?? {};
    const collaboration = await this.collaborationRepository.findOne({
      where: {
        ...where,
        id: collaborationID,
      },
      ...rest,
    });
    if (!collaboration)
      throw new EntityNotFoundException(
        `No Collaboration found with the given id: ${collaborationID}`,
        LogContext.COLLABORATION
      );
    return collaboration;
  }

  public async getChildCollaborationsOrFail(
    collaborationID: string
  ): Promise<ICollaboration[] | never> {
    const space = await this.entityManager.findOne(Space, {
      where: { collaboration: { id: collaborationID } },
      relations: {
        subspaces: {
          collaboration: true,
        },
      },
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find Space for provided collaborationID: ${collaborationID}`,
        LogContext.COLLABORATION
      );
    }

    switch (space.level) {
      case SpaceLevel.L0:
        const spacesInAccount = await this.entityManager.find(Space, {
          where: {
            levelZeroSpaceID: space.id,
          },
          relations: {
            collaboration: true,
          },
          select: {
            collaboration: {
              id: true,
            },
          },
        });
        return [...spacesInAccount].map(x => {
          if (!x.collaboration) {
            throw new EntityNotInitializedException(
              `Collaboration not found in space level ${x.level} '${x.id}'`,
              LogContext.COLLABORATION
            );
          }
          return x.collaboration;
        });
      case SpaceLevel.L1:
        const subsubspaces = space.subspaces;
        if (!subsubspaces) {
          throw new EntityNotInitializedException(
            `Subsubspaces not found on subspace with level ${space.level}`,
            LogContext.COLLABORATION
          );
        }

        return subsubspaces?.map(subsubspace => {
          if (!subsubspace.collaboration) {
            throw new EntityNotInitializedException(
              `Collaboration not found on subsubspace ${subsubspace.id}`,
              LogContext.COLLABORATION
            );
          }
          return subsubspace.collaboration;
        });
    }

    return [];
  }

  public async deleteCollaborationOrFail(
    collaborationID: string
  ): Promise<ICollaboration | never> {
    // Note need to load it in with all contained entities so can remove fully
    const collaboration = await this.getCollaborationOrFail(collaborationID, {
      relations: {
        calloutsSet: true,
        timeline: true,
        innovationFlow: true,
        authorization: true,
        license: true,
      },
    });

    if (
      !collaboration.calloutsSet ||
      !collaboration.innovationFlow ||
      !collaboration.authorization ||
      !collaboration.license
    )
      throw new RelationshipNotFoundException(
        `Unable to remove Collaboration: missing child entities ${collaboration.id} `,
        LogContext.SPACE_ABOUT
      );

    await this.calloutsSetService.deleteCalloutsSet(
      collaboration.calloutsSet.id
    );

    if (collaboration.timeline) {
      // There's no timeline for collaboration templates
      await this.timelineService.deleteTimeline(collaboration.timeline.id);
    }

    await this.authorizationPolicyService.delete(collaboration.authorization);

    await this.innovationFlowService.deleteInnovationFlow(
      collaboration.innovationFlow.id
    );
    await this.licenseService.removeLicenseOrFail(collaboration.license.id);

    return await this.collaborationRepository.remove(
      collaboration as Collaboration
    );
  }

  async getTimelineOrFail(collaborationID: string): Promise<ITimeline> {
    const collaboration = await this.getCollaborationOrFail(collaborationID, {
      relations: { timeline: true },
    });
    const timeline = collaboration.timeline;

    if (!timeline) {
      throw new EntityNotFoundException(
        `Unable to find timeline for collaboration: ${collaboration.id}`,
        LogContext.COLLABORATION
      );
    }

    return timeline;
  }

  async getInnovationFlow(collaborationID: string): Promise<IInnovationFlow> {
    const collaboration = await this.getCollaborationOrFail(collaborationID, {
      relations: {
        innovationFlow: true,
      },
    });

    const innovationFlow = collaboration.innovationFlow;
    if (!innovationFlow)
      throw new RelationshipNotFoundException(
        `Unable to load InnovationFlow for Collaboration ${collaborationID} `,
        LogContext.SPACES
      );

    return innovationFlow;
  }

  public async getPostsCount(calloutsSet: ICalloutsSet): Promise<number> {
    const [result]: {
      postsCount: number;
    }[] = await this.entityManager.connection.query(
      `
      SELECT COUNT(*) as "postsCount" FROM "callouts_set"
      RIGHT JOIN "callout" ON "callout"."calloutsSetId" = "callouts_set"."id"
      RIGHT JOIN "callout_contribution" ON "callout_contribution"."calloutId" = "callout"."id"
      WHERE "callouts_set"."id" = $1
        AND "callout"."visibility" = $2
        AND "callout_contribution"."postId" IS NOT NULL
      `,
      [calloutsSet.id, CalloutVisibility.PUBLISHED]
    );

    return result.postsCount;
  }

  public async getWhiteboardsCount(calloutsSet: ICalloutsSet): Promise<number> {
    const [result]: {
      whiteboardsCount: number;
    }[] = await this.entityManager.connection.query(
      `
      SELECT COUNT(*) as "whiteboardsCount"
      FROM "callouts_set" RIGHT JOIN "callout" ON "callout"."calloutsSetId" = "callouts_set"."id"
      RIGHT JOIN "callout_contribution" ON "callout_contribution"."calloutId" = "callout"."id"
      WHERE "callouts_set"."id" = $1
        AND "callout"."visibility" = $2
        AND "callout_contribution"."whiteboardId" IS NOT NULL
      `,
      [calloutsSet.id, CalloutVisibility.PUBLISHED]
    );

    return result.whiteboardsCount;
  }
}
