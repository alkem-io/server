import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InnovationHub, InnovationHubType } from '@domain/innovation-hub';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';

@Injectable()
export class InnovationHubService {
  constructor(
    @InjectRepository(InnovationHub)
    private readonly hubRepo: Repository<InnovationHub>
  ) {}

  public async getInnovationHubs(options?: FindManyOptions<InnovationHub>) {
    return await this.hubRepo.find(options);
  }

  public async getInnovationHubOrFail(
    args: { subdomain?: string; id: string },
    options?: FindOneOptions<InnovationHub>
  ): Promise<InnovationHub | never> {
    if (!Object.keys(args).length) {
      throw new Error('No criteria provided for fetching the Innovation Hub');
    }

    const { id, subdomain } = args;

    const hub = await this.hubRepo.findOne({
      where: {
        ...options?.where,
        id,
        subdomain,
      },
      ...options,
    });

    if (!hub) {
      throw new EntityNotFoundException(
        `Innovation hub with id: '${id}' not found`,
        LogContext.INNOVATION_HUB
      );
    }

    return hub;
  }

  public async getSpaceListFilterOrFail(
    hubId: string
  ): Promise<string[] | undefined | never> {
    const hub = await this.hubRepo.findOneBy({
      id: hubId,
    });

    if (!hub) {
      throw new EntityNotFoundException(
        `Innovation Hub with id: '${hubId}' not found!`,
        LogContext.INNOVATION_HUB
      );
    }

    if (hub.type === InnovationHubType.LIST && !hub.spacesListFilter) {
      throw new EntityNotInitializedException(
        `Space list filter for Innovation Hub with id: '${hubId}' not found!`,
        LogContext.INNOVATION_HUB
      );
    }

    return hub.spacesListFilter;
  }
}
