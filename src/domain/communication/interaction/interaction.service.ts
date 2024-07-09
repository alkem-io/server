import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { Interaction } from './interaction.entity';
import { IInteraction } from './interaction.interface';
import { CreateInteractionInput } from './dto/interaction.dto.create';

@Injectable()
export class InteractionService {
  constructor(
    @InjectRepository(Interaction)
    private interactionRepository: Repository<Interaction>
  ) {}

  public createInteraction(
    interactionData: CreateInteractionInput
  ): IInteraction {
    const interaction = new Interaction();
    interaction.threadID = interactionData.threadID;
    interaction.virtualContributorID = interactionData.virtualContributorID;
    return interaction;
  }

  async getInteractionOrFail(interactionID: string): Promise<IInteraction> {
    const interaction = await this.interactionRepository.findOneBy({
      id: interactionID,
    });
    if (!interaction)
      throw new EntityNotFoundException(
        `Not able to locate Interaction with the specified ID: ${interactionID}`,
        LogContext.SPACES
      );
    return interaction;
  }

  async getInteraction(interactionID: string): Promise<IInteraction> {
    const Interaction = await this.interactionRepository.findOneBy({
      id: interactionID,
    });
    if (!Interaction)
      throw new EntityNotFoundException(
        `Not able to locate Interaction with the specified ID: ${interactionID}`,
        LogContext.SPACES
      );
    return Interaction;
  }

  async removeInteraction(interactionID: string): Promise<Interaction> {
    const interaction = await this.getInteractionOrFail(interactionID);
    return await this.interactionRepository.remove(interaction as Interaction);
  }
}
