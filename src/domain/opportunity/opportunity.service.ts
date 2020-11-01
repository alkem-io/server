import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { ActorGroupInput } from '../actor-group/actor-group.dto';
import { RestrictedActorGroupNames } from '../actor-group/actor-group.entity';
import { IActorGroup } from '../actor-group/actor-group.interface';
import { ActorGroupService } from '../actor-group/actor-group.service';
import { AspectInput } from '../aspect/aspect.dto';
import { IAspect } from '../aspect/aspect.interface';
import { AspectService } from '../aspect/aspect.service';
import { ProfileService } from '../profile/profile.service';
import { OpportunityInput } from './opportunity.dto';
import { Opportunity } from './opportunity.entity';
import { IOpportunity } from './opportunity.interface';

@Injectable()
export class OpportunityService {
  constructor(
    private actorGroupService: ActorGroupService,
    private aspectService: AspectService,
    private profileService: ProfileService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger
  ) {}

  async initialiseMembers(opportunity: IOpportunity): Promise<IOpportunity> {
    if (!opportunity.projects) {
      opportunity.projects = [];
    }

    if (!opportunity.actorGroups) {
      opportunity.actorGroups = [];
    }

    if (!opportunity.aspects) {
      opportunity.aspects = [];
    }

    // Initialise contained objects
    await this.profileService.initialiseMembers(opportunity.profile);
    await this.createRestrictedActorGroups(opportunity);

    return opportunity;
  }

  async getOpportunityByID(OpportunityID: number): Promise<IOpportunity> {
    const Opportunity = await this.opportunityRepository.findOne({
      where: { id: OpportunityID },
    });
    if (!Opportunity)
      throw new Error(`Unable to find Opportunity with ID: ${OpportunityID}`);
    return Opportunity;
  }

  async createOpportunity(
    opportunityData: OpportunityInput
  ): Promise<IOpportunity> {
    // Verify that required textID field is present and that it has the right format
    const textID = opportunityData.textID;
    if (!textID) throw new Error('Required field textID not specified');
    const expression = /^[a-zA-Z0-9.\-_]+$/;
    const textIdCheck = expression.test(String(textID).toLowerCase());
    if (!textIdCheck)
      throw new Error(
        `Required field textID provided not in the correct format: ${textID}`
      );

    // reate and initialise a new Opportunity using the first returned array item
    const opportunity = Opportunity.create(opportunityData);
    await this.initialiseMembers(opportunity);
    await this.opportunityRepository.save(opportunity);

    return opportunity;
  }

  async updateOpportunity(
    opportunityID: number,
    opportunityData: OpportunityInput
  ): Promise<IOpportunity> {
    const Opportunity = await this.getOpportunityByID(opportunityID);

    // Copy over the received data
    if (opportunityData.name) {
      Opportunity.name = opportunityData.name;
    }

    if (opportunityData.state) {
      Opportunity.state = opportunityData.state;
    }

    await this.opportunityRepository.save(Opportunity);

    return Opportunity;
  }

  async getOpportunites(challengeId: number): Promise<Opportunity[]> {
    const opportunites = await this.opportunityRepository.find({
      where: { challenge: { id: challengeId } },
    });
    return opportunites || [];
  }


  async createRestrictedActorGroups(
    opportunity: IOpportunity
  ): Promise<boolean> {
    if (!opportunity.restrictedActorGroupNames) {
      throw new Error('Non-initialised Opportunity submitted');
    }
    for (const name of opportunity.restrictedActorGroupNames) {
      const actorGroupData = new ActorGroupInput();
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

  // Get the default ActorGroup
  getCollaboratorsActorGroup(
    opportunity: IOpportunity
  ): IActorGroup | undefined {
    if (!opportunity.actorGroups)
      throw new Error('actorGroups not initialised');
    const collaboratorsActorGroup = opportunity.actorGroups.find(
      t => t.name === RestrictedActorGroupNames.Collaborators
    );
    return collaboratorsActorGroup;
  }

  hasActorGroupWithName(opportunity: IOpportunity, name: string): boolean {
    // Double check groups array is initialised
    if (!opportunity.actorGroups) {
      throw new Error('Non-initialised Opportunity submitted');
    }

    // Find the right group
    const actorGroup = opportunity.actorGroups.find(t => t.name === name);
    if (actorGroup) {
      return true;
    }
    return false;
  }

  getActorGroupByName(opportunity: IOpportunity, name: string): IActorGroup {
    // Double check groups array is initialised
    if (!opportunity.actorGroups) {
      throw new Error('Non-initialised Opportunity submitted');
    }

    const actorGroup = opportunity.actorGroups.find(t => t.name === name);
    if (!actorGroup)
      throw new Error(`Unable to find ActorGroup with the name: ${name}`);

    return actorGroup;
  }

  async addActorGroupWithName(
    opportunity: IOpportunity,
    actorGroupData: ActorGroupInput
  ): Promise<IActorGroup> {
    const name = actorGroupData.name;
    // Check if the group already exists, if so log a warning
    if (this.hasActorGroupWithName(opportunity, name)) {
      throw new Error(
        `Unable to add ActorGroup "${name}" as an ActorGroup with that name already exists`
      );
    }

    if (opportunity.restrictedActorGroupNames?.includes(name)) {
      throw new Error(
        `Attempted to create a ActorGroup using a restricted name: ${name}`
      );
    }

    const newActorGroup = await this.actorGroupService.createActorGroup(
      actorGroupData
    );
    opportunity.actorGroups?.push(newActorGroup as IActorGroup);
    await this.opportunityRepository.save(opportunity);
    return newActorGroup;
}

  async createAspect(
    opportunityId: number,
    aspectData: AspectInput
  ): Promise<IAspect> {
    const opportunity = await this.getOpportunityByID(opportunityId);
    if (!opportunity)
      throw new Error(`Unalbe to locate opportunity with id: ${opportunityId}`);

    // Check that do not already have an aspect with the same title
    const title = aspectData.title;
    const existingAspect = opportunity.aspects?.find(
      aspect => aspect.title === title
    );
    if (existingAspect)
      throw new Error(
        `Already have an aspect with the provided title: ${title}`
      );

    const aspect = await this.aspectService.createAspect(aspectData);
    if (!opportunity.aspects)
      throw new Error(`Opportunity (${opportunityId}) not initialised`);
    opportunity.aspects.push(aspect);
    await this.opportunityRepository.save(opportunity);
    return aspect;

  }
}
