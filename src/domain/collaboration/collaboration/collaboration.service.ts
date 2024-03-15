import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
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
import { CreateRelationOnCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create.relation';
import { IRelation } from '@domain/collaboration/relation/relation.interface';
import { RelationService } from '@domain/collaboration/relation/relation.service';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CollaborationArgsCallouts } from './dto/collaboration.args.callouts';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UpdateCollaborationCalloutsSortOrderInput } from './dto/collaboration.dto.update.callouts.sort.order';
import { getJourneyByCollaboration } from '@common/utils';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { TagsetTemplateSetService } from '@domain/common/tagset-template-set/tagset.template.set.service';
import {
  CreateTagsetTemplateInput,
  ITagsetTemplate,
} from '@domain/common/tagset-template';
import { ITagsetTemplateSet } from '@domain/common/tagset-template-set';
import { CreateCalloutInput } from '../callout/dto/callout.dto.create';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { TimelineService } from '@domain/timeline/timeline/timeline.service';
import { ITimeline } from '@domain/timeline/timeline/timeline.interface';
import { keyBy } from 'lodash';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { CalloutType } from '@common/enums/callout.type';
import { Opportunity } from '@domain/challenge/opportunity';
import { InnovationFlowService } from '../innovation-flow/innovaton.flow.service';
import { SpaceDefaultsService } from '@domain/challenge/space.defaults/space.defaults.service';
import { TagsetType } from '@common/enums/tagset.type';
import { IInnovationFlow } from '../innovation-flow/innovation.flow.interface';
import { CreateCollaborationInput } from './dto/collaboration.dto.create';
import { Space } from '@domain/challenge/space/space.entity';
import { ICalloutGroup } from '../callout-groups/callout.group.interface';
import { CalloutGroupsService } from '../callout-groups/callout.group.service';
import { IAccount } from '@domain/challenge/account/account.interface';
import { SpaceType } from '@common/enums/space.type';

@Injectable()
export class CollaborationService {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutService: CalloutService,
    private namingService: NamingService,
    private relationService: RelationService,
    private tagsetTemplateSetService: TagsetTemplateSetService,
    private innovationFlowService: InnovationFlowService,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    private timelineService: TimelineService,
    private spaceDefaultsService: SpaceDefaultsService,
    private calloutGroupsService: CalloutGroupsService
  ) {}

  async createCollaboration(
    collaborationData: CreateCollaborationInput,
    storageAggregator: IStorageAggregator,
    account: IAccount,
    spaceType: SpaceType
  ): Promise<ICollaboration> {
    const collaboration: ICollaboration = Collaboration.create();
    collaboration.authorization = new AuthorizationPolicy();
    collaboration.relations = [];
    collaboration.callouts = [];
    collaboration.timeline = await this.timelineService.createTimeline();
    const calloutGroups = this.spaceDefaultsService.getCalloutGroups(spaceType);
    collaboration.groups =
      this.calloutGroupsService.serializeGroups(calloutGroups);

    collaboration.tagsetTemplateSet =
      await this.tagsetTemplateSetService.createTagsetTemplateSet();

    // Rely on the logic in Space Defaults to create the right innovation flow input
    const innovationFlowInput =
      await this.spaceDefaultsService.getCreateInnovationFlowInput(
        account.id,
        collaborationData.innovationFlowTemplateID
      );
    const allowedStates = innovationFlowInput.states.map(
      state => state.displayName
    );

    const tagsetTemplateDataStates: CreateTagsetTemplateInput = {
      name: TagsetReservedName.FLOW_STATE,
      type: TagsetType.SELECT_ONE,
      allowedValues: allowedStates,
      defaultSelectedValue:
        allowedStates.length > 0 ? allowedStates[0] : undefined,
    };
    const statesTagsetTemplate =
      await this.tagsetTemplateSetService.addTagsetTemplate(
        collaboration.tagsetTemplateSet,
        tagsetTemplateDataStates
      );

    // Note: need to create the innovation flow after creation of
    // tagsetTemplates on Collabration so can pass it in to the InnovationFlow
    collaboration.innovationFlow =
      await this.innovationFlowService.createInnovationFlow(
        innovationFlowInput,
        [statesTagsetTemplate],
        storageAggregator
      );

    return await this.save(collaboration);
  }

  public async addTagsetTemplate(
    collaboration: ICollaboration,
    tagsetTemplateData: CreateTagsetTemplateInput
  ): Promise<ITagsetTemplate> {
    collaboration.tagsetTemplateSet = await this.getTagsetTemplatesSet(
      collaboration.id
    );

    const tagsetTemplate =
      await this.tagsetTemplateSetService.addTagsetTemplate(
        collaboration.tagsetTemplateSet,
        tagsetTemplateData
      );
    await this.save(collaboration);
    return tagsetTemplate;
  }

  public async addDefaultCallouts(
    collaboration: ICollaboration,
    calloutsData: CreateCalloutInput[],
    storageAggregator: IStorageAggregator,
    userID: string | undefined
  ): Promise<ICollaboration> {
    collaboration.callouts = await this.getCalloutsOnCollaboration(
      collaboration
    );

    collaboration.tagsetTemplateSet = await this.getTagsetTemplatesSet(
      collaboration.id
    );
    for (const calloutDefault of calloutsData) {
      const callout = await this.calloutService.createCallout(
        calloutDefault,
        collaboration.tagsetTemplateSet.tagsetTemplates,
        storageAggregator,
        userID
      );
      // default callouts are already published
      callout.visibility = CalloutVisibility.PUBLISHED;
      collaboration.callouts.push(callout);
    }
    return await this.save(collaboration);
  }

  public async createCalloutInputsFromCollaboration(
    collaborationSource: ICollaboration
  ): Promise<CreateCalloutInput[]> {
    const calloutsData: CreateCalloutInput[] = [];

    const sourceCallouts = await this.getCalloutsOnCollaboration(
      collaborationSource
    );

    for (const sourceCallout of sourceCallouts) {
      const sourceCalloutInput =
        await this.calloutService.createCalloutInputFromCallout(sourceCallout);
      calloutsData.push(sourceCalloutInput);
    }
    return calloutsData;
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

  public async createCalloutInputsFromCollaborationTemplate(
    collaborationTemplateID?: string
  ): Promise<CreateCalloutInput[]> {
    if (collaborationTemplateID) {
      const collaboration = await this.getCollaborationOrFail(
        collaborationTemplateID
      );
      return await this.createCalloutInputsFromCollaboration(collaboration);
    }
    return [];
  }

  public async getChildCollaborationsOrFail(
    collaborationID: string
  ): Promise<ICollaboration[] | never> {
    // check if exists
    await this.getCollaborationOrFail(collaborationID);

    const { spaceId, challengeId } = await getJourneyByCollaboration(
      this.entityManager,
      collaborationID
    );

    if (spaceId) {
      const space = await this.entityManager.findOne(Space, {
        where: { id: spaceId },
        relations: {
          account: true,
        },
      });
      if (!space?.account) {
        throw new EntityNotFoundException(
          `Unable to find Space found with the given id: ${spaceId}`,
          LogContext.COLLABORATION
        );
      }
      const accountID = space.account.id;
      const challengesWithCollab = await this.entityManager.find(Challenge, {
        where: {
          account: {
            id: accountID,
          },
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
      const oppsWithCollab = await this.entityManager.find(Opportunity, {
        where: {
          account: {
            id: accountID,
          },
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

      return [...challengesWithCollab, ...oppsWithCollab].map(x => {
        if (!x.collaboration) {
          throw new EntityNotInitializedException(
            `Collaboration not found on ${
              x instanceof Challenge ? 'Challenge' : 'Opportunity'
            } '${x.id}'`,
            LogContext.COLLABORATION
          );
        }
        return x.collaboration;
      });
    }

    if (challengeId) {
      const challenge = await this.entityManager.findOneOrFail(Challenge, {
        where: { id: challengeId },
        relations: {
          opportunities: {
            collaboration: true,
          },
        },
      });

      if (!challenge.opportunities) {
        throw new EntityNotInitializedException(
          `Opportunities not found on challenge ${challengeId}`,
          LogContext.COLLABORATION
        );
      }

      return challenge.opportunities?.map(opp => {
        if (!opp.collaboration) {
          throw new EntityNotInitializedException(
            `Collaboration not found on opportunity ${opp.id}`,
            LogContext.COLLABORATION
          );
        }
        return opp.collaboration;
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
        relations: true,
        authorization: true,
      },
    });

    if (
      !collaboration.callouts ||
      !collaboration.timeline ||
      !collaboration.innovationFlow ||
      !collaboration.relations ||
      !collaboration.authorization
    )
      throw new RelationshipNotFoundException(
        `Unable to remove Collaboration: missing child entities ${collaboration.id} `,
        LogContext.CONTEXT
      );

    for (const callout of collaboration.callouts) {
      await this.calloutService.deleteCallout(callout.id);
    }

    await this.timelineService.deleteTimeline(collaboration.timeline.id);

    for (const relation of collaboration.relations) {
      await this.relationService.deleteRelation({ ID: relation.id });
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
    return this.calloutGroupsService.getGroups(collaboration.groups);
  }

  public async createCalloutOnCollaboration(
    calloutData: CreateCalloutOnCollaborationInput,
    userID: string
  ): Promise<ICallout> {
    const collaborationID = calloutData.collaborationID;
    const collaboration = await this.getCollaborationOrFail(collaborationID, {
      relations: { callouts: true, tagsetTemplateSet: true },
    });
    if (!collaboration.callouts || !collaboration.tagsetTemplateSet)
      throw new EntityNotInitializedException(
        `Collaboration (${collaborationID}) not initialised`,
        LogContext.CONTEXT
      );
    if (!calloutData.sortOrder) {
      calloutData.sortOrder =
        1 +
        Math.max(
          ...collaboration.callouts.map(callout => callout.sortOrder),
          0 // Needed in case there are no callouts. In that case the first callout will have sortOrder = 1
        );
    }

    if (calloutData.nameID && calloutData.nameID.length > 0) {
      const nameAvailable =
        await this.namingService.isCalloutNameIdAvailableInCollaboration(
          calloutData.nameID,
          collaboration.id
        );
      if (!nameAvailable)
        throw new ValidationException(
          `Unable to create Callout: the provided nameID is already taken: ${calloutData.nameID}`,
          LogContext.CHALLENGES
        );
    } else {
      calloutData.nameID = this.namingService.createNameID(
        `${calloutData.framing.profile.displayName}`
      );
    }

    const displayNameAvailable =
      await this.namingService.isCalloutDisplayNameAvailableInCollaboration(
        calloutData.framing.profile.displayName,
        collaboration.id
      );
    if (!displayNameAvailable)
      throw new ValidationException(
        `Unable to create Callout: the provided displayName is already taken: ${calloutData.framing.profile.displayName}`,
        LogContext.CHALLENGES
      );

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
    collaboration.callouts.push(callout);
    await this.collaborationRepository.save(collaboration);

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
        collaboration.groups
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
    const challenge = await this.getCollaborationOrFail(collaborationID, {
      relations: {
        innovationFlow: true,
      },
    });

    const innovationFlow = challenge.innovationFlow;
    if (!innovationFlow)
      throw new RelationshipNotFoundException(
        `Unable to load InnovationFlow for Collaboration ${collaborationID} `,
        LogContext.CHALLENGES
      );

    return innovationFlow;
  }

  public async getCalloutsOnCollaboration(
    collaboration: ICollaboration
  ): Promise<ICallout[]> {
    const loadedCollaboration = await this.getCollaborationOrFail(
      collaboration.id,
      {
        relations: { callouts: true },
      }
    );
    if (!loadedCollaboration.callouts)
      throw new EntityNotFoundException(
        `Callouts not initialised on collaboration: ${collaboration.id}`,
        LogContext.CONTEXT
      );

    return loadedCollaboration.callouts;
  }

  public async createRelationOnCollaboration(
    relationData: CreateRelationOnCollaborationInput
  ): Promise<IRelation> {
    const collaborationId = relationData.collaborationID;
    const collaboration = await this.getCollaborationOrFail(collaborationId, {
      relations: { relations: true },
    });

    if (!collaboration.relations)
      throw new EntityNotInitializedException(
        `Collaboration (${collaborationId}) not initialised`,
        LogContext.COLLABORATION
      );

    const relation = await this.relationService.createRelation(relationData);
    collaboration.relations.push(relation);
    await this.collaborationRepository.save(collaboration);
    return relation;
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

  public async getRelationsOnCollaboration(
    collaboration: ICollaboration
  ): Promise<IRelation[]> {
    const loadedCollaboration = await this.getCollaborationOrFail(
      collaboration.id,
      {
        relations: { relations: true },
      }
    );

    if (!loadedCollaboration.relations)
      throw new EntityNotInitializedException(
        `Collaboration not initialised: ${collaboration.id}`,
        LogContext.COLLABORATION
      );

    return loadedCollaboration.relations;
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

  public async getRelationsCount(
    collaboration: ICollaboration
  ): Promise<number> {
    const postsCount =
      await this.relationService.getRelationsInCollaborationCount(
        collaboration.id
      );

    return postsCount;
  }

  public async getCommunityPolicy(
    collaborationID: string
  ): Promise<ICommunityPolicy> {
    return await this.namingService.getCommunityPolicyForCollaboration(
      collaborationID
    );
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

  public async getJourneyFromCollaboration(collaborationId: string): Promise<
    | {
        spaceId?: string;
        challengeId?: string;
        opportunityId?: string;
      }
    | undefined
  > {
    const [space]: { id: string }[] = await this.entityManager.query(
      `
      SELECT space.id FROM alkemio.collaboration
      RIGHT JOIN space on collaboration.id = space.collaborationId
      WHERE collaboration.id = '${collaborationId}'
    `
    );

    if (space) {
      return {
        spaceId: space.id,
      };
    }

    const [challenge]: { id: string }[] = await this.entityManager.query(
      `
      SELECT challenge.id FROM alkemio.collaboration
      RIGHT JOIN challenge on collaboration.id = challenge.collaborationId
      WHERE collaboration.id = '${collaborationId}'
    `
    );

    if (challenge) {
      return {
        challengeId: challenge.id,
      };
    }

    const [opportunity]: { id: string }[] = await this.entityManager.query(
      `
      SELECT opportunity.id FROM alkemio.collaboration
      RIGHT JOIN opportunity on collaboration.id = opportunity.collaborationId
      WHERE collaboration.id = '${collaborationId}'
    `
    );

    if (opportunity) {
      return {
        opportunityId: opportunity.id,
      };
    }

    return undefined;
  }
}
