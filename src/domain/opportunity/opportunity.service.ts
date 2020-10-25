import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileService } from '../profile/profile.service';
import { OpportunityInput } from './opportunity.dto';
import { Opportunity } from './opportunity.entity';
import { IOpportunity } from './opportunity.interface';

@Injectable()
export class OpportunityService {
  constructor(
    private profileService: ProfileService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>
  ) {}

  async initialiseMembers(opportunity: IOpportunity): Promise<IOpportunity> {
    if (!opportunity.projects) {
      opportunity.projects = [];
    }

    // Initialise contained objects
    await this.profileService.initialiseMembers(opportunity.profile);

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
    OpportunityID: number,
    OpportunityData: OpportunityInput
  ): Promise<IOpportunity> {
    const Opportunity = await this.getOpportunityByID(OpportunityID);

    // Copy over the received data
    if (OpportunityData.name) {
      Opportunity.name = OpportunityData.name;
    }

    if (OpportunityData.state) {
      Opportunity.state = OpportunityData.state;
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
}
