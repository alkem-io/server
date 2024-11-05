import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  FindOneOptions,
  FindOptionsRelations,
  In,
  Repository,
} from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ForbiddenException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { CreateCalloutOnCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create.callout';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';
import { CollaborationArgsCallouts } from './dto/collaboration.args.callouts';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UpdateCollaborationCalloutsSortOrderInput } from './dto/collaboration.dto.update.callouts.sort.order';
import { TagsetTemplateSetService } from '@domain/common/tagset-template-set/tagset.template.set.service';
import { CreateTagsetTemplateInput } from '@domain/common/tagset-template';
import { ITagsetTemplateSet } from '@domain/common/tagset-template-set';
import { CreateCalloutInput } from '../callout/dto/callout.dto.create';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TimelineService } from '@domain/timeline/timeline/timeline.service';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { compact, keyBy } from 'lodash';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { CalloutType } from '@common/enums/callout.type';
import { InnovationFlowService } from '../innovation-flow/innovation.flow.service';
import { TagsetType } from '@common/enums/tagset.type';
import { IInnovationFlow } from '../innovation-flow/innovation.flow.interface';
import { CreateCollaborationInput } from './dto/collaboration.dto.create';
import { Space } from '@domain/space/space/space.entity';
import { ICalloutGroup } from '../callout-groups/callout.group.interface';
import { CalloutGroupsService } from '../callout-groups/callout.group.service';
import { CalloutGroupName } from '@common/enums/callout.group.name';
import { SpaceLevel } from '@common/enums/space.level';
import { Callout } from '@domain/collaboration/callout';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CreateInnovationFlowInput } from '../innovation-flow/dto/innovation.flow.dto.create';
import { IRoleSet } from '@domain/access/role-set';
import { CalloutState } from '@common/enums/callout.state';

@Injectable()
export class CollaborationService {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutService: CalloutService,
    private namingService: NamingService,
    private tagsetTemplateSetService: TagsetTemplateSetService,
    private innovationFlowService: InnovationFlowService,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    private timelineService: TimelineService,
    private calloutGroupsService: CalloutGroupsService
  ) {}

  async createCollaboration(
    collaborationData: CreateCollaborationInput,
    storageAggregator: IStorageAggregator,
    agentInfo?: AgentInfo
  ): Promise<ICollaboration> {
    if (
      !collaborationData.calloutGroups ||
      !collaborationData.calloutsData ||
      !collaborationData.innovationFlowData ||
      !collaborationData.defaultCalloutGroupName
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
    collaboration.callouts = [];
    collaboration.groupsStr = this.calloutGroupsService.serializeGroups(
      collaborationData.calloutGroups
    );
    collaboration.isTemplate = collaborationData.isTemplate || false;

    if (!collaboration.isTemplate) {
      collaboration.timeline = this.timelineService.createTimeline();
    }

    collaboration.tagsetTemplateSet =
      this.tagsetTemplateSetService.createTagsetTemplateSet();

    const innovationFlowStatesTagsetInput =
      this.createInnovationFlowStatesTagsetTemplateInput(
        collaborationData.innovationFlowData
      );
    collaboration.tagsetTemplateSet =
      this.tagsetTemplateSetService.addTagsetTemplate(
        collaboration.tagsetTemplateSet,
        innovationFlowStatesTagsetInput
      );

    const groupTagsetTemplateInput = this.createCalloutGroupTagsetTemplateInput(
      collaboration,
      collaborationData.defaultCalloutGroupName
    );
    collaboration.tagsetTemplateSet =
      this.tagsetTemplateSetService.addTagsetTemplate(
        collaboration.tagsetTemplateSet,
        groupTagsetTemplateInput
      );

    // save the tagset template so can use it in the innovation flow as a template for it's tags
    await this.tagsetTemplateSetService.save(collaboration.tagsetTemplateSet);

    collaboration.callouts = await this.addCallouts(
      collaboration,
      collaborationData.calloutsData,
      storageAggregator,
      agentInfo?.userID
    );

    // Note: need to create the innovation flow after creation of
    // tagsetTemplates on Collabration so can pass it in to the InnovationFlow
    const statesTagsetTemplate =
      collaboration.tagsetTemplateSet.tagsetTemplates.find(
        template => template.name === TagsetReservedName.FLOW_STATE
      );
    if (!statesTagsetTemplate) {
      throw new EntityNotInitializedException(
        `Unable to find states tagset template on collaboration ${collaboration.id}`,
        LogContext.COLLABORATION
      );
    }
    collaboration.innovationFlow =
      await this.innovationFlowService.createInnovationFlow(
        collaborationData.innovationFlowData,
        [statesTagsetTemplate],
        storageAggregator
      );

    this.moveCalloutsToDefaultGroupAndState(
      groupTagsetTemplateInput.allowedValues,
      statesTagsetTemplate.allowedValues,
      collaboration.callouts
    );

    return collaboration;
  }

  public getCalloutGroupNames(collaboration: ICollaboration): string[] {
    return this.calloutGroupsService.getGroupNames(collaboration.groupsStr);
  }

  private createCalloutGroupTagsetTemplateInput(
    collaboration: ICollaboration,
    defaultGroup: CalloutGroupName
  ): CreateTagsetTemplateInput {
    const tagsetTemplateData: CreateTagsetTemplateInput = {
      name: TagsetReservedName.CALLOUT_GROUP,
      type: TagsetType.SELECT_ONE,
      allowedValues: this.getCalloutGroupNames(collaboration),
      defaultSelectedValue: defaultGroup,
    };
    return tagsetTemplateData;
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

  public async addCallouts(
    collaboration: ICollaboration,
    calloutsData: CreateCalloutInput[],
    storageAggregator: IStorageAggregator,
    userID: string | undefined
  ): Promise<ICallout[]> {
    if (!collaboration.tagsetTemplateSet || !collaboration.callouts) {
      throw new EntityNotInitializedException(
        `Collaboration (${collaboration.id}) not initialised`,
        LogContext.COLLABORATION
      );
    }
    const calloutNameIds: string[] = compact(
      collaboration.callouts?.map(callout => callout.nameID)
    );

    const callouts: ICallout[] = [];
    for (const calloutDefault of calloutsData) {
      if (
        !calloutDefault.nameID ||
        calloutNameIds.includes(calloutDefault.nameID)
      ) {
        calloutDefault.nameID =
          this.namingService.createNameIdAvoidingReservedNameIDs(
            calloutDefault.framing.profile.displayName,
            calloutNameIds
          );
        calloutNameIds.push(calloutDefault.nameID);
      }
      if (
        calloutDefault.isTemplate === false &&
        calloutDefault.type === CalloutType.POST &&
        calloutDefault.contributionPolicy?.state === CalloutState.OPEN
      ) {
        calloutDefault.enableComments = true;
      }
      const callout = await this.calloutService.createCallout(
        calloutDefault,
        collaboration.tagsetTemplateSet.tagsetTemplates,
        storageAggregator,
        userID
      );
      callouts.push(callout);
    }
    return callouts;
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

  public async deleteCollaboration(
    collaborationID: string
  ): Promise<ICollaboration> {
    // Note need to load it in with all contained entities so can remove fully
    const collaboration = await this.getCollaborationOrFail(collaborationID, {
      relations: {
        callouts: true,
        timeline: true,
        innovationFlow: true,
        authorization: true,
      },
    });

    if (
      !collaboration.callouts ||
      !collaboration.innovationFlow ||
      !collaboration.authorization
    )
      throw new RelationshipNotFoundException(
        `Unable to remove Collaboration: missing child entities ${collaboration.id} `,
        LogContext.CONTEXT
      );

    for (const callout of collaboration.callouts) {
      await this.calloutService.deleteCallout(callout.id);
    }

    if (collaboration.timeline) {
      // There's no timeline for collaboration templates
      await this.timelineService.deleteTimeline(collaboration.timeline.id);
    }

    await this.authorizationPolicyService.delete(collaboration.authorization);

    await this.innovationFlowService.deleteInnovationFlow(
      collaboration.innovationFlow.id
    );

    return await this.collaborationRepository.remove(
      collaboration as Collaboration
    );
  }

  public getGroups(collaboration: ICollaboration): ICalloutGroup[] {
    return this.calloutGroupsService.getGroups(collaboration.groupsStr);
  }

  public async createCalloutOnCollaboration(
    calloutData: CreateCalloutOnCollaborationInput,
    userID: string
  ): Promise<ICallout> {
    const collaborationID = calloutData.collaborationID;
    const collaboration = await this.getCollaborationOrFail(collaborationID, {
      relations: { callouts: true, tagsetTemplateSet: true },
    });
    if (!collaboration.callouts || !collaboration.tagsetTemplateSet) {
      throw new EntityNotInitializedException(
        `Collaboration (${collaborationID}) not initialised`,
        LogContext.CONTEXT
      );
    }
    if (!calloutData.sortOrder) {
      calloutData.sortOrder =
        1 +
        Math.max(
          ...collaboration.callouts.map(callout => callout.sortOrder),
          0 // Needed in case there are no callouts. In that case the first callout will have sortOrder = 1
        );
    }

    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInCollaboration(
        collaboration.id
      );
    if (calloutData.nameID && calloutData.nameID.length > 0) {
      if (reservedNameIDs.includes(calloutData.nameID)) {
        throw new ValidationException(
          `Unable to create Callout: the provided nameID is already taken: ${calloutData.nameID}`,
          LogContext.SPACES
        );
      }
      // Just use the provided nameID
    } else {
      calloutData.nameID =
        this.namingService.createNameIdAvoidingReservedNameIDs(
          `${calloutData.framing.profile.displayName}`,
          reservedNameIDs
        );
    }

    const tagsetTemplates = collaboration.tagsetTemplateSet.tagsetTemplates;
    const storageAggregator =
      await this.storageAggregatorResolverService.getStorageAggregatorForCollaboration(
        collaboration.id
      );
    const callout = await this.calloutService.createCallout(
      calloutData,
      tagsetTemplates,
      storageAggregator,
      userID
    );
    // this has the effect of adding the callout to the collaboration
    callout.collaboration = collaboration;

    return callout;
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

  public async getCalloutsFromCollaboration(
    collaboration: ICollaboration,
    args: CollaborationArgsCallouts,
    agentInfo: AgentInfo
  ): Promise<ICallout[]> {
    const collaborationLoaded = await this.getCollaborationOrFail(
      collaboration.id,
      {
        relations: {
          callouts: {
            framing: {
              profile: {
                tagsets: true,
              },
            },
          },
        },
      }
    );
    const allCallouts = collaborationLoaded.callouts;
    if (!allCallouts) {
      throw new EntityNotFoundException(
        `Callouts not initialised on Collaboration: ${collaboration.id}`,
        LogContext.COLLABORATION
      );
    }

    // Single pass filter operation
    const groupNames: string[] = [];
    if (args.groups && args.groups.length) {
      const allowedGroups = await this.calloutGroupsService.getGroups(
        collaboration.groupsStr
      );

      for (const group of args.groups) {
        // Validate that the groups are valid
        const groupAllowed = allowedGroups.find(g => g.displayName === group);
        if (!groupAllowed) {
          throw new ValidationException(
            `Specified group not found: ${group}; allowed groups: ${allowedGroups
              .map(g => g.displayName)
              .join(', ')}`,
            LogContext.COLLABORATION
          );
        }
        groupNames.push(group);
      }
    }
    const availableCallouts = allCallouts.filter(callout => {
      // Check for READ privilege
      const hasAccess = this.hasAgentAccessToCallout(callout, agentInfo);
      if (!hasAccess) return false;

      // Filter by Callout groups
      if (groupNames.length > 0) {
        const hasMatchingTagset = callout.framing.profile.tagsets?.some(
          tagset =>
            tagset.name === TagsetReservedName.CALLOUT_GROUP &&
            tagset.tags.length > 0 &&
            groupNames?.includes(tagset.tags[0])
        );
        if (!hasMatchingTagset) return false;
      }

      // Filter by tagsets
      const tagsetCheck =
        args.tagsets && args.tagsets.length
          ? callout.framing.profile?.tagsets?.some(calloutTagset =>
              args.tagsets?.some(
                argTagset =>
                  argTagset.name === calloutTagset.name &&
                  argTagset.tags.some(argTag =>
                    calloutTagset.tags.includes(argTag)
                  )
              )
            )
          : true;

      return tagsetCheck;
    });

    // parameter order: (a) by IDs (b) by activity (c) shuffle (d) sort order
    // (a) by IDs, results in order specified by IDs
    if (args.IDs) {
      const results: ICallout[] = [];
      for (const calloutID of args.IDs) {
        let callout;
        if (calloutID.length === UUID_LENGTH)
          callout = allCallouts.find(callout => callout.id === calloutID);
        else
          callout = allCallouts.find(callout => callout.nameID === calloutID);

        if (!callout)
          throw new EntityNotFoundException(
            `Callout with requested ID (${calloutID}) not located within current Collaboration: ${collaboration.id}`,
            LogContext.COLLABORATION
          );

        if (!this.hasAgentAccessToCallout(callout, agentInfo)) {
          throw new ForbiddenException(
            `User does not have access to callout: ${callout.id}`,
            LogContext.COLLABORATION
          );
        }

        results.push(callout);
      }
      return results;
    }

    // (b) by activity. First get the activity for all callouts + sort by it; shuffle does not make sense.
    if (args.sortByActivity) {
      for (const callout of availableCallouts) {
        callout.activity = await this.calloutService.getActivityCount(callout);
      }
      const sortedCallouts = availableCallouts.sort((a, b) =>
        a.activity < b.activity ? 1 : -1
      );
      if (args.limit) {
        return sortedCallouts.slice(0, args.limit);
      }
      return sortedCallouts;
    }

    // (c) shuffle
    if (args.shuffle) {
      // No need to sort
      return limitAndShuffle(availableCallouts, args.limit, args.shuffle);
    }

    // (d) by sort order
    let results = availableCallouts;
    if (args.limit) {
      results = limitAndShuffle(availableCallouts, args.limit, false);
    }

    return results.sort((a, b) => (a.sortOrder > b.sortOrder ? 1 : -1));
  }

  private hasAgentAccessToCallout(
    callout: ICallout,
    agentInfo: AgentInfo
  ): boolean {
    switch (callout.visibility) {
      case CalloutVisibility.PUBLISHED:
        return this.authorizationService.isAccessGranted(
          agentInfo,
          callout.authorization,
          AuthorizationPrivilege.READ
        );
      case CalloutVisibility.DRAFT:
        return this.authorizationService.isAccessGranted(
          agentInfo,
          callout.authorization,
          AuthorizationPrivilege.UPDATE
        );
    }
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

  public async getCalloutsOnCollaboration(
    collaboration: ICollaboration,
    opts: {
      calloutIds?: string[];
      relations?: FindOptionsRelations<Callout>;
    } = {}
  ): Promise<ICallout[]> {
    const { calloutIds, relations } = opts;
    const loadedCollaboration = await this.collaborationRepository.findOne({
      where: {
        id: collaboration.id,
        callouts: calloutIds ? { id: In(calloutIds) } : undefined,
      },
      relations: { callouts: relations ?? true },
    });

    if (!loadedCollaboration) {
      throw new EntityNotFoundException(
        'Collaboration not found',
        LogContext.COLLABORATION,
        {
          collaborationID: collaboration.id,
        }
      );
    }

    if (!loadedCollaboration.callouts) {
      throw new EntityNotFoundException(
        'Callouts not initialised on collaboration',
        LogContext.COLLABORATION,
        {
          collaborationID: collaboration.id,
        }
      );
    }

    return loadedCollaboration.callouts;
  }

  public async getTagsetTemplatesSet(
    collaborationID: string
  ): Promise<ITagsetTemplateSet> {
    const collaboration = await this.getCollaborationOrFail(collaborationID, {
      relations: { tagsetTemplateSet: true },
    });

    if (!collaboration.tagsetTemplateSet) {
      throw new EntityNotInitializedException(
        `No tagset template set found for collaboration the given id: ${collaborationID}`,
        LogContext.COLLABORATION
      );
    }

    return collaboration.tagsetTemplateSet;
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

  public async updateCalloutsSortOrder(
    collaboration: ICollaboration,
    sortOrderData: UpdateCollaborationCalloutsSortOrderInput
  ): Promise<ICallout[]> {
    const collaborationLoaded = await this.getCollaborationOrFail(
      collaboration.id,
      {
        relations: { callouts: true },
      }
    );
    const allCallouts = collaborationLoaded.callouts;
    if (!allCallouts)
      throw new EntityNotFoundException(
        `Callout not initialised, no Callouts: ${collaboration.id}`,
        LogContext.COLLABORATION
      );

    const calloutsByID = {
      ...keyBy(allCallouts, 'nameID'),
      ...keyBy(allCallouts, 'id'),
    };

    const minimumSortOrder = Math.min(
      ...sortOrderData.calloutIDs
        .map(calloutId => calloutsByID[calloutId]?.sortOrder)
        .filter(sortOrder => sortOrder)
    );
    const modifiedCallouts: ICallout[] = [];

    // Get the callouts specified
    const calloutsInOrder: ICallout[] = [];
    let index = 1;
    for (const calloutID of sortOrderData.calloutIDs) {
      const callout = calloutsByID[calloutID];
      if (!callout) {
        throw new EntityNotFoundException(
          `Callout with requested ID (${calloutID}) not located within current Collaboration: ${collaboration.id}`,
          LogContext.COLLABORATION
        );
      }
      calloutsInOrder.push(callout);
      const newSortOrder = minimumSortOrder + index;
      if (callout.sortOrder !== newSortOrder) {
        callout.sortOrder = newSortOrder;
        modifiedCallouts.push(callout);
      }
      index++;
    }

    await Promise.all(
      modifiedCallouts.map(
        async callout => await this.calloutService.save(callout)
      )
    );

    return calloutsInOrder;
  }

  /**
   * Move callouts that are not in valid groups or flowStates to the default group & first flowState
   * @param callouts
   */
  public moveCalloutsToDefaultGroupAndState(
    validGroupNames: string[],
    validFlowStateNames: string[],
    callouts: {
      framing: {
        profile: {
          tagsets?: {
            name: string;
            type?: TagsetType;
            tags?: string[];
          }[];
        };
      };
    }[]
  ): void {
    const defaultGroupName: string | undefined = validGroupNames?.[0];
    const defaultFlowStateName: string | undefined = validFlowStateNames?.[0];

    for (const callout of callouts) {
      if (!callout.framing.profile.tagsets) {
        callout.framing.profile.tagsets = [];
      }
      let calloutGroupTagset = callout.framing.profile.tagsets?.find(
        tagset => tagset.name === TagsetReservedName.CALLOUT_GROUP
      );
      let flowStateTagset = callout.framing.profile.tagsets?.find(
        tagset => tagset.name === TagsetReservedName.FLOW_STATE
      );

      if (defaultGroupName) {
        if (!calloutGroupTagset) {
          calloutGroupTagset = {
            name: TagsetReservedName.CALLOUT_GROUP,
            type: TagsetType.SELECT_ONE,
            tags: [defaultGroupName],
          };
          callout.framing.profile.tagsets.push(calloutGroupTagset);
        } else {
          const calloutGroup = calloutGroupTagset.tags?.[0];
          if (!calloutGroup || !validGroupNames.includes(calloutGroup)) {
            calloutGroupTagset.tags = [defaultGroupName];
          }
        }
      }
      if (defaultFlowStateName) {
        if (!flowStateTagset) {
          flowStateTagset = {
            name: TagsetReservedName.FLOW_STATE,
            type: TagsetType.SELECT_ONE,
            tags: [defaultFlowStateName],
          };
          callout.framing.profile.tagsets.push(flowStateTagset);
        } else {
          const flowState = flowStateTagset.tags?.[0];
          if (!flowState || !validFlowStateNames.includes(flowState)) {
            flowStateTagset.tags = [defaultFlowStateName];
          }
        }
      }
    }
  }
}
