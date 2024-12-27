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
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CreateTagsetTemplateInput } from '@domain/common/tagset-template';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TimelineService } from '@domain/timeline/timeline/timeline.service';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { CalloutType } from '@common/enums/callout.type';
import { InnovationFlowService } from '../innovation-flow/innovation.flow.service';
import { TagsetType } from '@common/enums/tagset.type';
import { IInnovationFlow } from '../innovation-flow/innovation.flow.interface';
import { CreateCollaborationInput } from './dto/collaboration.dto.create';
import { Space } from '@domain/space/space/space.entity';
import { SpaceLevel } from '@common/enums/space.level';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CreateInnovationFlowInput } from '../innovation-flow/dto/innovation.flow.dto.create';
import { IRoleSet } from '@domain/access/role-set';
import { LicenseService } from '@domain/common/license/license.service';
import { LicenseType } from '@common/enums/license.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { CalloutsSetService } from '../callouts-set/callouts.set.service';
import { CalloutVisibility } from '@common/enums/callout.visibility';

@Injectable()
export class CollaborationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutsSetService: CalloutsSetService,
    private namingService: NamingService,
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
    collaboration.calloutsSet = await this.calloutsSetService.createCalloutsSet(
      collaborationData.calloutsSetData,
      storageAggregator,
      agentInfo
    );

    collaboration.isTemplate = collaborationData.isTemplate || false;

    if (!collaboration.isTemplate) {
      collaboration.timeline = this.timelineService.createTimeline();
    }

    const innovationFlowStatesTagsetInput =
      this.createInnovationFlowStatesTagsetTemplateInput(
        collaborationData.innovationFlowData
      );
    collaboration.calloutsSet.tagsetTemplateSet =
      await this.calloutsSetService.addTagsetTemplate(
        collaboration.calloutsSet.id,
        innovationFlowStatesTagsetInput
      );

    collaboration.license = await this.licenseService.createLicense({
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
      ],
    });

    const statesTagsetTemplate = this.calloutsSetService.getTagsetTemplate(
      collaboration.calloutsSet.tagsetTemplateSet,
      TagsetReservedName.FLOW_STATE
    );

    const groupsTagsetTemplate = this.calloutsSetService.getTagsetTemplate(
      collaboration.calloutsSet.tagsetTemplateSet,
      TagsetReservedName.CALLOUT_GROUP
    );

    if (!statesTagsetTemplate || !groupsTagsetTemplate) {
      throw new RelationshipNotFoundException(
        'Unable to create tagst template for flow states',
        LogContext.COLLABORATION
      );
    }

    collaboration.innovationFlow =
      await this.innovationFlowService.createInnovationFlow(
        collaborationData.innovationFlowData,
        [statesTagsetTemplate],
        storageAggregator
      );

    this.calloutsSetService.moveCalloutsToDefaultGroupAndState(
      groupsTagsetTemplate.allowedValues,
      statesTagsetTemplate.allowedValues,
      collaboration.calloutsSet.callouts
    );

    return collaboration;
  }

  private createInnovationFlowStatesTagsetTemplateInput(
    innovationFlowData: CreateInnovationFlowInput
  ): CreateTagsetTemplateInput {
    const allowedStates = innovationFlowData.states.map(
      state => state.displayName
    );
    const tagsetTemplateDataStates: CreateTagsetTemplateInput = {
      name: TagsetReservedName.FLOW_STATE,
      type: TagsetType.SELECT_ONE,
      allowedValues: allowedStates,
      defaultSelectedValue:
        allowedStates.length > 0 ? allowedStates[0] : undefined,
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
      case SpaceLevel.SPACE:
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
              `Collaboration not found on ${x.type} '${x.id}'`,
              LogContext.COLLABORATION
            );
          }
          return x.collaboration;
        });
      case SpaceLevel.CHALLENGE:
        const subsubspaces = space.subspaces;
        if (!subsubspaces) {
          throw new EntityNotInitializedException(
            `Subsubspaces not found on subspace ${space.type}`,
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
        LogContext.CONTEXT
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

  public async getPostsCount(collaboration: ICollaboration): Promise<number> {
    const [result]: {
      postsCount: number;
    }[] = await this.entityManager.connection.query(
      `
      SELECT COUNT(*) as postsCount FROM \`collaboration\`
      RIGHT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
      RIGHT JOIN \`callout_contribution\` ON \`callout_contribution\`.\`calloutId\` = \`callout\`.\`id\`
      WHERE \`collaboration\`.\`id\` = '${collaboration.id}' AND \`callout\`.\`visibility\` = '${CalloutVisibility.PUBLISHED}' AND \`callout\`.\`type\` = '${CalloutType.POST_COLLECTION}';
      `
    );

    return result.postsCount;
  }

  public async getWhiteboardsCount(
    collaboration: ICollaboration
  ): Promise<number> {
    const [result]: {
      whiteboardsCount: number;
    }[] = await this.entityManager.connection.query(
      `
      SELECT COUNT(*) as whiteboardsCount
      FROM \`collaboration\` RIGHT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
      RIGHT JOIN \`callout_contribution\` ON \`callout_contribution\`.\`calloutId\` = \`callout\`.\`id\`
      WHERE \`collaboration\`.\`id\` = '${collaboration.id}'
        AND \`callout\`.\`visibility\` = '${CalloutVisibility.PUBLISHED}'
        AND \`callout\`.\`type\` = '${CalloutType.WHITEBOARD_COLLECTION}';
      `
    );

    return result.whiteboardsCount;
  }

  public async getRoleSet(collaborationID: string): Promise<IRoleSet> {
    const { roleSet } =
      await this.namingService.getRoleSetAndSettingsForCollaboration(
        collaborationID
      );
    return roleSet;
  }
}
