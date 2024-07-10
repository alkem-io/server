import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { VcInteraction } from './vc.interaction.entity';
import { IVcInteraction } from './vc.interaction.interface';
import { CreateVcInteractionInput } from './dto/vc.interaction.dto.create';

@Injectable()
export class VcInteractionService {
  constructor(
    @InjectRepository(VcInteraction)
    private interactionRepository: Repository<VcInteraction>
  ) {}

  public createVcInteraction(
    interactionData: CreateVcInteractionInput
  ): IVcInteraction {
    const interaction = new VcInteraction();
    interaction.threadID = interactionData.threadID;
    interaction.virtualContributorID = interactionData.virtualContributorID;
    return interaction;
  }

  async getVcInteractionOrFail(
    interactionID: string,
    options: FindOneOptions<VcInteraction> = {}
  ): Promise<IVcInteraction> {
    const interaction = await this.interactionRepository.findOne({
      ...options,
      where: {
        id: interactionID,
      },
    });
    if (!interaction)
      throw new EntityNotFoundException(
        `Not able to locate VcInteraction with the specified ID: ${interactionID}`,
        LogContext.SPACES
      );
    return interaction;
  }

  async getVcInteraction(interactionID: string): Promise<IVcInteraction> {
    const VcInteraction = await this.interactionRepository.findOneBy({
      id: interactionID,
    });
    if (!VcInteraction)
      throw new EntityNotFoundException(
        `Not able to locate VcInteraction with the specified ID: ${interactionID}`,
        LogContext.SPACES
      );
    return VcInteraction;
  }

  async getVcInteractionForRoomByThreadId(
    roomId: string,
    threadID: string
  ): Promise<IVcInteraction | null> {
    return this.interactionRepository.findOne({
      where: {
        room: {
          id: roomId,
        },
        threadID,
      },
    });
  }

  async removeVcInteraction(interactionID: string): Promise<VcInteraction> {
    const interaction = await this.getVcInteractionOrFail(interactionID);
    return await this.interactionRepository.remove(
      interaction as VcInteraction
    );
  }
}
