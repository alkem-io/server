import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
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
import { collaborationDefaults } from './collaboration.defaults';
import { UUID_LENGTH } from '@common/constants/entity.field.length.constants';
import { CommunityType } from '@common/enums/community.type';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { CollaborationArgsCallouts } from './dto/collaboration.args.callouts';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UpdateCollaborationCalloutsSortOrderInput } from './dto/collaboration.dto.update.callouts.sort.order';
import { Space } from '@domain/challenge/space/space.entity';
import { getJourneyByCollaboration } from '@common/utils';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { TagsetTemplateSetService } from '@domain/common/tagset-template-set/tagset.template.set.service';
import { CreateTagsetTemplateInput } from '@domain/common/tagset-template';

@Injectable()
export class CollaborationService {
  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private calloutService: CalloutService,
    private namingService: NamingService,
    private relationService: RelationService,
    private tagsetTemplateSetService: TagsetTemplateSetService,
    @InjectRepository(Collaboration)
    private collaborationRepository: Repository<Collaboration>,
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  async createCollaboration(): Promise<ICollaboration> {
    const collaboration: ICollaboration = Collaboration.create();
    collaboration.authorization = new AuthorizationPolicy();
    collaboration.relations = [];
    collaboration.callouts = [];
    collaboration.tagsetTemplateSet =
      await this.tagsetTemplateSetService.createTagsetTemplateSet();

    return await this.save(collaboration);
  }

  public async addTagsetTemplate(
    collaboration: ICollaboration,
    tagsetTemplateData: CreateTagsetTemplateInput
  ): Promise<ICollaboration> {
    if (!collaboration.tagsetTemplateSet) {
      throw new EntityNotInitializedException(
        `No tagset template set found for collaboration the given id: ${collaboration.id}`,
        LogContext.COLLABORATION
      );
    }
    collaboration.tagsetTemplateSet =
      await this.tagsetTemplateSetService.addTagsetTemplate(
        collaboration.tagsetTemplateSet,
        tagsetTemplateData
      );

    return await this.save(collaboration);
  }

  public async addDefaultCallouts(
    collaboration: ICollaboration,
    communityType: CommunityType
  ) {
    if (!collaboration.callouts) {
      throw new EntityNotInitializedException(
        `No callouts found for collaboration the given id: ${collaboration.id}`,
        LogContext.COLLABORATION
      );
    }
    for (const calloutDefault of collaborationDefaults.callouts) {
      const communityTypeForDefault = calloutDefault.communityType;
      // If communityType is not specified then create the callout; otherwise only create
      //  when it matches the given communityType
      if (
        !communityTypeForDefault ||
        communityTypeForDefault === communityType
      ) {
        const callout = await this.calloutService.createCallout(calloutDefault);
        // default callouts are already published
        callout.visibility = CalloutVisibility.PUBLISHED;
        collaboration.callouts.push(callout);
      }
    }
    return await this.save(collaboration);
  }

  async save(collaboration: ICollaboration): Promise<ICollaboration> {
    return await this.collaborationRepository.save(collaboration);
  }

  async getCollaborationOrFail(
    collaborationID: string,
    options?: FindOneOptions<Collaboration>
  ): Promise<ICollaboration | never> {
    const collaboration = await this.collaborationRepository.findOne({
      where: { id: collaborationID },
      ...options,
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
    // check if exists
    await this.getCollaborationOrFail(collaborationID);

    const { spaceId, challengeId } = await getJourneyByCollaboration(
      this.entityManager,
      collaborationID
    );

    if (spaceId) {
      const space = await this.entityManager.findOneOrFail(Space, {
        where: { id: spaceId },
        relations: {
          challenges: {
            collaboration: true,
          },
        },
      });

      if (!space.challenges) {
        throw new EntityNotInitializedException(
          `Challenges not found on Space ${spaceId}`,
          LogContext.COLLABORATION
        );
      }

      return space.challenges?.map(challenge => {
        if (!challenge.collaboration) {
          throw new EntityNotInitializedException(
            `Collaboration not found on challenge ${challenge.id}`,
            LogContext.COLLABORATION
          );
        }
        return challenge.collaboration;
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
    const collaboration = await this.getCollaborationOrFail(collaborationID, {
      relations: ['callouts'],
    });

    if (collaboration.callouts) {
      for (const callout of collaboration.callouts) {
        await this.calloutService.deleteCallout(callout.id);
      }
    }

    if (collaboration.relations) {
      for (const relation of collaboration.relations) {
        await this.relationService.deleteRelation({ ID: relation.id });
      }
    }

    if (collaboration.authorization)
      await this.authorizationPolicyService.delete(collaboration.authorization);

    return await this.collaborationRepository.remove(
      collaboration as Collaboration
    );
  }

  public async createCalloutOnCollaboration(
    calloutData: CreateCalloutOnCollaborationInput,
    userID: string
  ): Promise<ICallout> {
    const collaborationID = calloutData.collaborationID;
    const collaboration = await this.getCollaborationOrFail(collaborationID, {
      relations: ['callouts'],
    });
    if (!collaboration.callouts)
      throw new EntityNotInitializedException(
        `Collaboration (${collaborationID}) not initialised`,
        LogContext.CONTEXT
      );

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
        `${calloutData.profile.displayName}`
      );
    }

    const displayNameAvailable =
      await this.namingService.isCalloutDisplayNameAvailableInCollaboration(
        calloutData.profile.displayName,
        collaboration.id
      );
    if (!displayNameAvailable)
      throw new ValidationException(
        `Unable to create Callout: the provided displayName is already taken: ${calloutData.profile.displayName}`,
        LogContext.CHALLENGES
      );

    const callout = await this.calloutService.createCallout(
      calloutData,
      userID
    );
    collaboration.callouts.push(callout);
    await this.collaborationRepository.save(collaboration);

    return callout;
  }

  public async getCalloutsFromCollaboration(
    collaboration: ICollaboration,
    args: CollaborationArgsCallouts,
    agentInfo: AgentInfo
  ): Promise<ICallout[]> {
    const collaborationLoaded = await this.getCollaborationOrFail(
      collaboration.id,
      {
        relations: ['callouts'],
      }
    );
    const allCallouts = collaborationLoaded.callouts;
    if (!allCallouts)
      throw new EntityNotFoundException(
        `Callout not initialised, no whiteboards: ${collaboration.id}`,
        LogContext.COLLABORATION
      );

    // First filter the callouts the current user has READ privilege to
    const readableCallouts = allCallouts.filter(callout =>
      this.hasAgentAccessToCallout(callout, agentInfo)
    );

    // Filter by Callout group
    const availableCallouts = args.groups
      ? readableCallouts.filter(
          callout => callout.group && args.groups?.includes(callout.group)
        )
      : readableCallouts;

    // parameter order: (a) by IDs (b) by activity (c) shuffle (d) sort order
    // (a) by IDs, results in order specified by IDs
    if (args.IDs) {
      const results: ICallout[] = [];
      for (const calloutID of args.IDs) {
        let callout;
        if (calloutID.length === UUID_LENGTH)
          callout = availableCallouts.find(callout => callout.id === calloutID);
        else
          callout = availableCallouts.find(
            callout => callout.nameID === calloutID
          );

        if (!callout)
          throw new EntityNotFoundException(
            `Callout with requested ID (${calloutID}) not located within current Collaboration: ${collaboration.id}`,
            LogContext.COLLABORATION
          );
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

    const sortedCallouts = results.sort((a, b) =>
      a.sortOrder > b.sortOrder ? 1 : -1
    );
    return sortedCallouts;
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

  public async getCalloutsOnCollaboration(
    collaboration: ICollaboration
  ): Promise<ICallout[]> {
    const loadedCollaboration = await this.getCollaborationOrFail(
      collaboration.id,
      {
        relations: ['callouts'],
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
      relations: ['relations'],
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

  public async getRelationsOnCollaboration(
    collaboration: ICollaboration
  ): Promise<IRelation[]> {
    const loadedCollaboration = await this.getCollaborationOrFail(
      collaboration.id,
      {
        relations: ['relations'],
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
      SELECT COUNT(*) as postsCount
      FROM \`collaboration\` RIGHT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
      RIGHT JOIN \`post\` ON \`post\`.\`calloutId\` = \`callout\`.\`id\`
      WHERE \`collaboration\`.\`id\` = '${collaboration.id}' AND \`callout\`.\`visibility\` = '${CalloutVisibility.PUBLISHED}';
      `
    );

    return result.postsCount;
  }

  public async getWhiteboardesCount(
    collaboration: ICollaboration
  ): Promise<number> {
    const [result]: {
      whiteboardsCount: number;
    }[] = await this.entityManager.connection.query(
      `
      SELECT COUNT(*) as whiteboardsCount
      FROM \`collaboration\` RIGHT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
      RIGHT JOIN \`whiteboard\` ON \`whiteboard\`.\`calloutId\` = \`callout\`.\`id\`
      WHERE \`collaboration\`.\`id\` = '${collaboration.id}'  AND \`callout\`.\`visibility\` = '${CalloutVisibility.PUBLISHED}';
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
        relations: ['callouts'],
      }
    );
    const allCallouts = collaborationLoaded.callouts;
    if (!allCallouts)
      throw new EntityNotFoundException(
        `Callout not initialised, no Callouts: ${collaboration.id}`,
        LogContext.COLLABORATION
      );

    // Get the callouts specified
    const calloutsInOrder: ICallout[] = [];
    let minCalloutSortOrder = 10000;
    for (const calloutID of sortOrderData.calloutIDs) {
      let callout;
      if (calloutID.length === UUID_LENGTH)
        callout = allCallouts.find(callout => callout.id === calloutID);
      else callout = allCallouts.find(callout => callout.nameID === calloutID);

      if (!callout) {
        throw new EntityNotFoundException(
          `Callout with requested ID (${calloutID}) not located within current Collaboration: ${collaboration.id}`,
          LogContext.COLLABORATION
        );
      }
      if (callout.sortOrder < minCalloutSortOrder) {
        minCalloutSortOrder = callout.sortOrder;
      }
      calloutsInOrder.push(callout);
    }

    // Now update all the callouts sort order
    for (const callout of calloutsInOrder) {
      callout.sortOrder = minCalloutSortOrder;
      minCalloutSortOrder += 2;
      await this.calloutService.save(callout);
    }
    return calloutsInOrder;
  }
}
