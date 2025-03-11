import { LogContext } from '@common/enums';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ISpace } from '../space/space.interface';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { Space } from '../space/space.entity';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  FindManyOptions,
  FindOneOptions,
  In,
  Repository,
} from 'typeorm';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { AccountLookupService } from '../account.lookup/account.lookup.service';
import { ISpaceAbout } from '../space.about';

@Injectable()
export class SpaceLookupService {
  constructor(
    private accountLookupService: AccountLookupService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getSpaceOrFail(
    spaceID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | never> {
    const space = await this.getSpace(spaceID, options);
    if (!space)
      throw new EntityNotFoundException(
        `Unable to find Space on Host with ID: ${spaceID}`,
        LogContext.ACCOUNT
      );
    return space;
  }

  public async getSpaceForSpaceAboutOrFail(
    spaceAboutID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | never> {
    const space = await this.getSpaceForSpaceAbout(spaceAboutID, options);
    if (!space)
      throw new EntityNotFoundException(
        `Unable to find Space with about with ID: ${spaceAboutID}`,
        LogContext.ACCOUNT
      );
    return space;
  }

  private async getSpace(
    spaceID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | null> {
    const space: ISpace | null = await this.entityManager.findOne(Space, {
      ...options,
      where: { ...options?.where, id: spaceID },
    });
    return space;
  }

  private async getSpaceForSpaceAbout(
    spaceAboutID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | null> {
    const space: ISpace | null = await this.entityManager.findOne(Space, {
      ...options,
      where: {
        ...options?.where,
        about: {
          id: spaceAboutID,
        },
      },
    });
    return space;
  }

  public async getFullSpaceHierarchy(spaceID: string): Promise<ISpace | null> {
    const space: ISpace | null = await this.entityManager.findOne(Space, {
      where: { id: spaceID },
      relations: {
        subspaces: {
          subspaces: true,
        },
      },
    });
    return space;
  }

  public async getAgent(spaceID: string): Promise<IAgent> {
    const space = await this.getSpaceOrFail(spaceID, {
      relations: {
        agent: true,
      },
    });

    if (!space.agent) {
      throw new RelationshipNotFoundException(
        `Unable to retrieve Agent for Space: ${space.id}`,
        LogContext.PLATFORM
      );
    }

    return space.agent;
  }

  /***
   * Checks if Spaces exists against a list of IDs
   * @param ids List of Space ids
   * @returns  <i>true</i> if all Spaces exist; list of ids of the Spaces that doesn't, otherwise
   */
  public async spacesExist(ids: string[]): Promise<true | string[]> {
    if (!ids.length) {
      return true;
    }

    const spaces = await this.spaceRepository.find({
      where: { id: In(ids) },
      select: { id: true },
    });

    if (!spaces.length) {
      return ids;
    }

    const notExist = [...ids];

    spaces.forEach(space => {
      const idIndex = notExist.findIndex(x => x === space.id);

      if (idIndex >= -1) {
        notExist.splice(idIndex, 1);
      }
    });

    return notExist.length > 0 ? notExist : true;
  }

  public getSpacesById(
    spaceIdsOrNameIds: string[],
    options?: FindManyOptions<Space>
  ) {
    return this.spaceRepository.find({
      ...options,
      where: options?.where
        ? Array.isArray(options.where)
          ? [
              { id: In(spaceIdsOrNameIds) },
              { nameID: In(spaceIdsOrNameIds) },
              ...options.where,
            ]
          : [
              { id: In(spaceIdsOrNameIds) },
              { nameID: In(spaceIdsOrNameIds) },
              options.where,
            ]
        : [{ id: In(spaceIdsOrNameIds) }, { nameID: In(spaceIdsOrNameIds) }],
    });
  }

  public async getCollaborationOrFail(
    spaceID: string
  ): Promise<ICollaboration> | never {
    const subspaceWithCollaboration = await this.getSpaceOrFail(spaceID, {
      relations: { collaboration: true },
    });
    const collaboration = subspaceWithCollaboration.collaboration;
    if (!collaboration)
      throw new RelationshipNotFoundException(
        `Unable to load collaboration for space ${spaceID} `,
        LogContext.COLLABORATION
      );
    return collaboration;
  }

  public async getProvider(spaceAbout: ISpaceAbout): Promise<IContributor> {
    const space = await this.spaceRepository.findOneOrFail({
      where: {
        about: {
          id: spaceAbout.id,
        },
      },
    });
    const l0Space = await this.spaceRepository.findOneOrFail({
      where: {
        id: space.levelZeroSpaceID,
      },
      relations: {
        account: true,
      },
    });
    if (!l0Space || !l0Space.account) {
      throw new RelationshipNotFoundException(
        `Unable to load Space with account to get Provider ${spaceAbout.id} `,
        LogContext.LIBRARY
      );
    }
    const provider = await this.accountLookupService.getHost(l0Space.account);
    if (!provider) {
      throw new RelationshipNotFoundException(
        `Unable to load provider for Space ${space.id} `,
        LogContext.SPACE_ABOUT
      );
    }
    return provider;
  }
}
