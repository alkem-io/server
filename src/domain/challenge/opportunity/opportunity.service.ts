import { CreateActorGroupInput } from '@domain/context/actor-group';
import { IActorGroup } from '@domain/context/actor-group/actor-group.interface';
import { ActorGroupService } from '@domain/context/actor-group/actor-group.service';
import { CreateAspectInput } from '@domain/context/aspect';
import { IAspect } from '@domain/context/aspect/aspect.interface';
import { AspectService } from '@domain/context/aspect/aspect.service';
import { ContextService } from '@domain/context/context/context.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { FindOneOptions, Repository } from 'typeorm';
import {
  Opportunity,
  IOpportunity,
  CreateOpportunityInput,
  DeleteOpportunityInput,
  UpdateOpportunityInput,
  opportunityLifecycleConfigDefault,
  opportunityLifecycleConfigExtended,
} from '@domain/challenge/opportunity';
import { ICommunity } from '@domain/community/community';
import { CommunityService } from '@domain/community/community/community.service';
import { CommunityType } from '@common/enums/community.types';
import { TagsetService } from '@domain/common/tagset';
import validator from 'validator';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { OpportunityLifecycleTemplates } from '@common/enums/opportunity.lifecycle.templates';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { ICollaboration } from '@domain/collaboration/collaboration';

@Injectable()
export class OpportunityService {
  constructor(
    private actorGroupService: ActorGroupService,
    private aspectService: AspectService,
    private contextService: ContextService,
    private communityService: CommunityService,
    private tagsetService: TagsetService,
    private lifecycleService: LifecycleService,
    private collaborationService: CollaborationService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>
  ) {}

  async createOpportunity(
    opportunityData: CreateOpportunityInput
  ): Promise<IOpportunity> {
    const opportunity: IOpportunity = Opportunity.create(opportunityData);

    opportunity.actorGroups = [];
    opportunity.aspects = [];
    if (!opportunity.context) {
      opportunity.context = await this.contextService.createContext({});
    }
    opportunity.community = await this.communityService.createCommunity(
      opportunity.name,
      CommunityType.OPPORTUNITY
    );
    await this.createRestrictedActorGroups(opportunity);

    opportunity.collaboration = await this.collaborationService.createCollaboration();

    // Lifecycle, that has both a default and extended version
    let machineConfig: any = opportunityLifecycleConfigDefault;
    if (
      opportunityData.lifecycleTemplate &&
      opportunityData.lifecycleTemplate ===
        OpportunityLifecycleTemplates.EXTENDED
    ) {
      machineConfig = opportunityLifecycleConfigExtended;
    }

    // Save so get the ID for storing on the lifecycle
    await this.opportunityRepository.save(opportunity);

    opportunity.lifecycle = await this.lifecycleService.createLifecycle(
      opportunity.id.toString(),
      machineConfig
    );

    return await this.opportunityRepository.save(opportunity);
  }

  async getOpportunityOrFail(
    opportunityID: string,
    options?: FindOneOptions<Opportunity>
  ): Promise<IOpportunity> {
    if (validator.isNumeric(opportunityID)) {
      const idInt: number = parseInt(opportunityID);
      return await this.getOpportunityByIdOrFail(idInt, options);
    }

    return await this.getOpportunityByTextIdOrFail(opportunityID, options);
  }

  async getOpportunityByTextIdOrFail(
    opportunityID: string,
    options?: FindOneOptions<Opportunity>
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityRepository.findOne(
      { textID: opportunityID },
      options
    );
    if (!opportunity)
      throw new EntityNotFoundException(
        `Unable to find opportunity with ID: ${opportunityID}`,
        LogContext.CHALLENGES
      );
    return opportunity;
  }

  async getOpportunityByIdOrFail(
    opportunityID: number,
    options?: FindOneOptions<Opportunity>
  ): Promise<IOpportunity> {
    const opportunity = await this.opportunityRepository.findOne(
      { id: opportunityID },
      options
    );
    if (!opportunity)
      throw new EntityNotFoundException(
        `Unable to find Opportunity with ID: ${opportunityID}`,
        LogContext.CHALLENGES
      );
    return opportunity;
  }

  async getOpportunites(): Promise<Opportunity[]> {
    const opportunites = await this.opportunityRepository.find();
    return opportunites || [];
  }

  // Loads the actorGroups into the Opportunity entity if not already present
  async loadActorGroups(opportunity: Opportunity): Promise<IActorGroup[]> {
    if (opportunity.actorGroups && opportunity.actorGroups.length > 0) {
      // opportunity already has actor groups loaded
      return opportunity.actorGroups;
    }
    // Opportunity is not populated so load it with actorGroups
    const opportunityLoaded = await this.getOpportunityByIdOrFail(
      opportunity.id,
      {
        relations: ['actorGroups'],
      }
    );
    if (!opportunityLoaded.actorGroups)
      throw new EntityNotInitializedException(
        `Opportunity not initialised: ${opportunity.id}`,
        LogContext.CHALLENGES
      );

    return opportunityLoaded.actorGroups;
  }

  // Loads the aspects into the Opportunity entity if not already present
  async loadAspects(opportunity: Opportunity): Promise<IAspect[]> {
    if (opportunity.aspects && opportunity.aspects.length > 0) {
      // opportunity already has actor groups loaded
      return opportunity.aspects;
    }
    // Opportunity is not populated so load it with actorGroups
    const opportunityLoaded = await this.getOpportunityByIdOrFail(
      opportunity.id,
      {
        relations: ['aspects'],
      }
    );
    if (!opportunityLoaded.aspects)
      throw new EntityNotFoundException(
        `Opportunity not initialised: ${opportunity.id}`,
        LogContext.CHALLENGES
      );

    return opportunityLoaded.aspects;
  }

  async updateOpportunity(
    opportunityData: UpdateOpportunityInput
  ): Promise<IOpportunity> {
    const opportunity = await this.getOpportunityOrFail(opportunityData.ID);

    // Copy over the received data
    if (opportunityData.name) {
      opportunity.name = opportunityData.name;
    }

    if (opportunityData.context && opportunity.context) {
      opportunity.context = await this.contextService.updateContext(
        opportunity.context,
        opportunityData.context
      );
    }

    await this.opportunityRepository.save(opportunity);

    return opportunity;
  }

  async deleteOpportunity(
    deleteData: DeleteOpportunityInput
  ): Promise<IOpportunity> {
    const opportunityID = deleteData.ID;
    // Note need to load it in with all contained entities so can remove fully
    const opportunity = await this.getOpportunityByIdOrFail(opportunityID, {
      relations: [
        'actorGroups',
        'collaboration',
        'aspects',
        'community',
        'lifecycle',
      ],
    });

    // First remove all groups
    if (opportunity.aspects) {
      for (const aspect of opportunity.aspects) {
        await this.aspectService.removeAspect({ ID: aspect.id });
      }
    }

    if (opportunity.actorGroups) {
      for (const actorGroup of opportunity.actorGroups) {
        await this.actorGroupService.deleteActorGroup({ ID: actorGroup.id });
      }
    }

    // Remove the community
    if (opportunity.community) {
      await this.communityService.removeCommunity(opportunity.community.id);
    }

    // Remove the collaboration
    if (opportunity.collaboration) {
      await this.collaborationService.deleteCollaboration(
        opportunity.collaboration.id
      );
    }

    // Remove the context
    if (opportunity.context) {
      await this.contextService.removeContext(opportunity.context.id);
    }

    // Remove the lifecycle
    if (opportunity.lifecycle) {
      await this.lifecycleService.deleteLifecycle(opportunity.lifecycle.id);
    }

    if (opportunity.tagset) {
      await this.tagsetService.removeTagset({ ID: opportunity.tagset.id });
    }

    const { id } = opportunity;
    const result = await this.opportunityRepository.remove(
      opportunity as Opportunity
    );
    return {
      ...result,
      id,
    };
  }

  async getChallengeID(opportunityID: number): Promise<number> {
    const opportunity = await this.getOpportunityByIdOrFail(opportunityID, {
      relations: ['challenge'],
    });
    const challenge = (opportunity as Opportunity).challenge;
    if (!challenge)
      throw new ValidationException(
        `Opportunity with given ID is not in a challenge: ${opportunityID}`,
        LogContext.CHALLENGES
      );
    return challenge.id;
  }

  async createRestrictedActorGroups(
    opportunity: IOpportunity
  ): Promise<boolean> {
    if (!opportunity.restrictedActorGroupNames) {
      throw new EntityNotInitializedException(
        'Non-initialised Opportunity submitted',
        LogContext.CHALLENGES
      );
    }
    for (const name of opportunity.restrictedActorGroupNames) {
      const actorGroupData = new CreateActorGroupInput();
      actorGroupData.name = name;
      actorGroupData.description = 'Default actor group';
      const actorGroup = await this.actorGroupService.createActorGroup(
        actorGroupData
      );
      opportunity.actorGroups?.push(actorGroup);
      await this.opportunityRepository.save(opportunity);
    }
    return true;
  }

  async getCollaboration(opportunityId: number): Promise<ICollaboration> {
    const opportunity = await this.getOpportunityByIdOrFail(opportunityId, {
      relations: ['collaboration'],
    });
    const collaboration = opportunity.collaboration;
    if (!collaboration)
      throw new RelationshipNotFoundException(
        `Unable to load collaboration for opportunity ${opportunityId}`,
        LogContext.COLLABORATION
      );
    return collaboration;
  }

  // Loads the challenges into the challenge entity if not already present
  async getCommunity(opportunityId: number): Promise<ICommunity> {
    const opportunity = await this.getOpportunityByIdOrFail(opportunityId, {
      relations: ['community'],
    });
    const community = opportunity.community;
    if (!community)
      throw new RelationshipNotFoundException(
        `Unable to load community for opportunity ${opportunityId}`,
        LogContext.COMMUNITY
      );
    return community;
  }

  async createAspect(aspectData: CreateAspectInput): Promise<IAspect> {
    const opportunityID = aspectData.parentID;
    const opportunity = await this.getOpportunityByIdOrFail(opportunityID, {
      relations: ['aspects'],
    });
    if (!opportunity.aspects)
      throw new EntityNotInitializedException(
        `Opportunity (${opportunityID}) not initialised`,
        LogContext.CHALLENGES
      );

    // Check that do not already have an aspect with the same title
    const title = aspectData.title;
    const existingAspect = opportunity.aspects?.find(
      aspect => aspect.title === title
    );
    if (existingAspect)
      throw new ValidationException(
        `Already have an aspect with the provided title: ${title}`,
        LogContext.CHALLENGES
      );

    const aspect = await this.aspectService.createAspect(aspectData);

    opportunity.aspects.push(aspect);
    await this.opportunityRepository.save(opportunity);
    return aspect;
  }

  async createActorGroup(
    actorGroupData: CreateActorGroupInput
  ): Promise<IActorGroup> {
    const opportunityId = actorGroupData.parentID;
    const opportunity = await this.getOpportunityByIdOrFail(opportunityId, {
      relations: ['actorGroups'],
    });

    // Check that do not already have an aspect with the same title
    const name = actorGroupData.name;
    const existingActorGroup = opportunity.actorGroups?.find(
      actorGroup => actorGroup.name === name
    );
    if (existingActorGroup)
      throw new ValidationException(
        `Already have an actor group with the provided name: ${name}`,
        LogContext.CHALLENGES
      );

    const actorGroup = await this.actorGroupService.createActorGroup(
      actorGroupData
    );
    if (!opportunity.actorGroups)
      throw new EntityNotInitializedException(
        `Opportunity (${opportunityId}) not initialised`,
        LogContext.CHALLENGES
      );
    opportunity.actorGroups.push(actorGroup);
    await this.opportunityRepository.save(opportunity);
    return actorGroup;
  }

  // Lazy load the lifecycle
  async getLifecycle(opportunityId: number): Promise<ILifecycle> {
    const opportunity = await this.getOpportunityByIdOrFail(opportunityId, {
      relations: ['lifecycle'],
    });

    // if no lifecycle then create + save...
    if (!opportunity.lifecycle) {
      opportunity.lifecycle = await this.lifecycleService.createLifecycle(
        opportunityId.toString(),
        opportunityLifecycleConfigDefault
      );
      await this.opportunityRepository.save(opportunity);
    }

    return opportunity.lifecycle;
  }
}
