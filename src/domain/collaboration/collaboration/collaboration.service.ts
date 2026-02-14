import { LogContext } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseType } from '@common/enums/license.type';
import { SpaceLevel } from '@common/enums/space.level';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TagsetType } from '@common/enums/tagset.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import { CreateTagsetTemplateInput } from '@domain/common/tagset-template';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { TimelineService } from '@domain/timeline/timeline/timeline.service';
import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { ICalloutsSet } from '../callouts-set/callouts.set.interface';
import { CalloutsSetService } from '../callouts-set/callouts.set.service';
import { CreateInnovationFlowInput } from '../innovation-flow/dto/innovation.flow.dto.create';
import { IInnovationFlow } from '../innovation-flow/innovation.flow.interface';
import { InnovationFlowService } from '../innovation-flow/innovation.flow.service';
import { sortBySortOrder } from '../innovation-flow-state/utils/sortBySortOrder';
import { collaborations } from './collaboration.schema';
import { CreateCollaborationInput } from './dto/collaboration.dto.create';
import { spaces } from '@domain/space/space/space.schema';

@Injectable()
export class CollaborationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutsSetService: CalloutsSetService,
    private innovationFlowService: InnovationFlowService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private timelineService: TimelineService,
    private licenseService: LicenseService
  ) {}

  async createCollaboration(
    collaborationData: CreateCollaborationInput,
    storageAggregator: IStorageAggregator,
    agentInfo?: AgentInfo
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
          agentInfo?.userID
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
    if (collaboration.id) {
      const [updated] = await this.db
        .update(collaborations)
        .set({
          isTemplate: collaboration.isTemplate,
          calloutsSetId: collaboration.calloutsSet?.id,
          timelineId: collaboration.timeline?.id,
          innovationFlowId: collaboration.innovationFlow?.id,
          licenseId: collaboration.license?.id,
          authorizationId: collaboration.authorization?.id,
        })
        .where(eq(collaborations.id, collaboration.id))
        .returning();
      return updated as unknown as ICollaboration;
    }
    const [inserted] = await this.db
      .insert(collaborations)
      .values({
        isTemplate: collaboration.isTemplate,
        calloutsSetId: collaboration.calloutsSet?.id,
        timelineId: collaboration.timeline?.id,
        innovationFlowId: collaboration.innovationFlow?.id,
        licenseId: collaboration.license?.id,
        authorizationId: collaboration.authorization?.id,
      })
      .returning();
    return inserted as unknown as ICollaboration;
  }

  async getCollaborationOrFail(
    collaborationID: string,
    options?: {
      relations?: {
        calloutsSet?: boolean | {
          tagsetTemplateSet?: boolean;
          callouts?: boolean | {
            classification?: boolean | {
              tagsets?: boolean;
            };
          };
        };
        timeline?: boolean;
        innovationFlow?: boolean | {
          profile?: boolean;
          states?: boolean;
          flowStatesTagsetTemplate?: boolean;
        };
        authorization?: boolean;
        license?: boolean | {
          entitlements?: boolean;
        };
      };
    }
  ): Promise<ICollaboration | never> {
    const withClause: any = {};
    if (options?.relations) {
      if (options.relations.calloutsSet) {
        if (typeof options.relations.calloutsSet === 'object') {
          const csNested: any = {};
          if (options.relations.calloutsSet.tagsetTemplateSet) csNested.tagsetTemplateSet = true;
          if (options.relations.calloutsSet.callouts) {
            if (typeof options.relations.calloutsSet.callouts === 'object') {
              const calloutNested: any = {};
              if (options.relations.calloutsSet.callouts.classification) {
                if (typeof options.relations.calloutsSet.callouts.classification === 'object') {
                  calloutNested.classification = { with: { tagsets: !!options.relations.calloutsSet.callouts.classification.tagsets } };
                } else {
                  calloutNested.classification = true;
                }
              }
              csNested.callouts = Object.keys(calloutNested).length > 0 ? { with: calloutNested } : true;
            } else {
              csNested.callouts = true;
            }
          }
          withClause.calloutsSet = Object.keys(csNested).length > 0 ? { with: csNested } : true;
        } else {
          withClause.calloutsSet = true;
        }
      }
      if (options.relations.timeline) withClause.timeline = true;
      if (options.relations.innovationFlow) {
        if (typeof options.relations.innovationFlow === 'object') {
          const nested: any = {};
          if (options.relations.innovationFlow.profile) nested.profile = true;
          if (options.relations.innovationFlow.states) nested.states = true;
          if (options.relations.innovationFlow.flowStatesTagsetTemplate) nested.flowStatesTagsetTemplate = true;
          withClause.innovationFlow = Object.keys(nested).length > 0 ? { with: nested } : true;
        } else {
          withClause.innovationFlow = true;
        }
      }
      if (options.relations.authorization) withClause.authorization = true;
      if (options.relations.license) {
        if (typeof options.relations.license === 'object') {
          const nested: any = {};
          if (options.relations.license.entitlements) nested.entitlements = true;
          withClause.license = { with: nested };
        } else {
          withClause.license = true;
        }
      }
    }

    const queryOptions: any = {
      where: eq(collaborations.id, collaborationID),
    };
    if (Object.keys(withClause).length > 0) {
      queryOptions.with = withClause;
    }

    const collaboration =
      await this.db.query.collaborations.findFirst(queryOptions);
    if (!collaboration)
      throw new EntityNotFoundException(
        `No Collaboration found with the given id: ${collaborationID}`,
        LogContext.COLLABORATION
      );
    return collaboration as unknown as ICollaboration;
  }

  public async getChildCollaborationsOrFail(
    collaborationID: string
  ): Promise<ICollaboration[] | never> {
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.collaborationId, collaborationID),
      with: {
        subspaces: {
          with: { collaboration: true },
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
      case SpaceLevel.L0: {
        const spacesInAccount = await this.db.query.spaces.findMany({
          where: eq(spaces.levelZeroSpaceID, space.id),
          with: {
            collaboration: { columns: { id: true } },
          },
        });
        return [...spacesInAccount].map(x => {
          if (!x.collaboration) {
            throw new EntityNotInitializedException(
              `Collaboration not found in space level ${x.level} '${x.id}'`,
              LogContext.COLLABORATION
            );
          }
          return x.collaboration as unknown as ICollaboration;
        });
      }
      case SpaceLevel.L1: {
        const subsubspaces = (space as any).subspaces;
        if (!subsubspaces) {
          throw new EntityNotInitializedException(
            `Subsubspaces not found on subspace with level ${space.level}`,
            LogContext.COLLABORATION
          );
        }

        return subsubspaces?.map((subsubspace: any) => {
          if (!subsubspace.collaboration) {
            throw new EntityNotInitializedException(
              `Collaboration not found on subsubspace ${subsubspace.id}`,
              LogContext.COLLABORATION
            );
          }
          return subsubspace.collaboration as unknown as ICollaboration;
        });
      }
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

    const [deleted] = await this.db
      .delete(collaborations)
      .where(eq(collaborations.id, collaboration.id))
      .returning();
    return deleted as unknown as ICollaboration;
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
    const result = await this.db.execute<{ postsCount: string }>(sql`
      SELECT COUNT(*) as "postsCount" FROM "callouts_set"
      RIGHT JOIN "callout" ON "callout"."calloutsSetId" = "callouts_set"."id"
      RIGHT JOIN "callout_contribution" ON "callout_contribution"."calloutId" = "callout"."id"
      WHERE "callouts_set"."id" = ${calloutsSet.id}
        AND "callout"."visibility" = ${CalloutVisibility.PUBLISHED}
        AND "callout_contribution"."postId" IS NOT NULL
    `);

    return Number(result[0]?.postsCount ?? 0);
  }

  public async getWhiteboardsCount(calloutsSet: ICalloutsSet): Promise<number> {
    const result = await this.db.execute<{ whiteboardsCount: string }>(sql`
      SELECT COUNT(*) as "whiteboardsCount"
      FROM "callouts_set" RIGHT JOIN "callout" ON "callout"."calloutsSetId" = "callouts_set"."id"
      RIGHT JOIN "callout_contribution" ON "callout_contribution"."calloutId" = "callout"."id"
      WHERE "callouts_set"."id" = ${calloutsSet.id}
        AND "callout"."visibility" = ${CalloutVisibility.PUBLISHED}
        AND "callout_contribution"."whiteboardId" IS NOT NULL
    `);

    return Number(result[0]?.whiteboardsCount ?? 0);
  }
}
