import {
  Inject,
  Injectable,
  LoggerService,
  NotImplementedException,
} from '@nestjs/common';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { LogContext } from '@common/enums';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { TimelineResolverService } from '../entity-resolver/timeline.resolver.service';
import { StorageAggregatorNotFoundException } from '@common/exceptions/storage.aggregator.not.found.exception';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Space } from '@domain/challenge/space/space.entity';
import { SpaceType } from '@common/enums/space.type';

@Injectable()
export class StorageAggregatorResolverService {
  constructor(
    private timelineResolverService: TimelineResolverService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @InjectRepository(StorageAggregator)
    private storageAggregatorRepository: Repository<StorageAggregator>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async getStorageAggregatorOrFail(
    storageAggregatorID: string,
    options?: FindOneOptions<StorageAggregator>
  ): Promise<StorageAggregator | never> {
    if (!storageAggregatorID) {
      throw new EntityNotFoundException(
        `StorageAggregator not found: ${storageAggregatorID}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    const storageAggregator =
      await this.storageAggregatorRepository.findOneOrFail({
        where: { id: storageAggregatorID },
        ...options,
      });
    if (!storageAggregator)
      throw new EntityNotFoundException(
        `StorageAggregator not found: ${storageAggregatorID}`,
        LogContext.STORAGE_AGGREGATOR
      );
    return storageAggregator;
  }

  public async getPlatformStorageAggregator(): Promise<IStorageAggregator> {
    const query = `SELECT \`storageAggregatorId\`
    FROM \`platform\` LIMIT 1`;
    const [result]: {
      storageAggregatorId: string;
    }[] = await this.entityManager.connection.query(query);
    return this.getStorageAggregatorOrFail(result.storageAggregatorId);
  }

  public async getLibraryStorageAggregator(): Promise<IStorageAggregator> {
    const query = `SELECT \`storageAggregatorId\`
    FROM \`library\` LIMIT 1`;
    const [result]: {
      storageAggregatorId: string;
    }[] = await this.entityManager.connection.query(query);
    return this.getStorageAggregatorOrFail(result.storageAggregatorId);
  }

  public async getParentEntityInformation(
    storageAggregatorID: string
  ): Promise<{
    id: string;
    displayName: string;
    type: SpaceType;
    nameID: string;
  }> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        storageAggregator: {
          id: storageAggregatorID,
        },
      },
      relations: {
        profile: true,
      },
    });
    if (!space) {
      throw new NotImplementedException(
        `Retrieval of parent entity information for storage aggregator on ${storageAggregatorID} type not yet implemented`,
        LogContext.STORAGE_AGGREGATOR
      );
    }

    return {
      id: space.id,
      displayName: space.profile.displayName,
      nameID: space.nameID,
      type: space.type,
    };
  }

  public async getStorageAggregatorForTemplatesSet(
    templatesSetId: string
  ): Promise<IStorageAggregator> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        account: {
          library: {
            id: templatesSetId,
          },
        },
      },
      relations: {
        storageAggregator: true,
      },
    });

    if (space && space.storageAggregator) {
      return await this.getStorageAggregatorOrFail(space.storageAggregator.id);
    }

    const query = `SELECT \`id\` FROM \`innovation_pack\`
      WHERE \`innovation_pack\`.\`templatesSetId\`='${templatesSetId}'`;
    const [result] = await this.entityManager.connection.query(query);
    if (result) {
      // use the library sorage aggregator
      return await this.getLibraryStorageAggregator();
    }

    throw new StorageAggregatorNotFoundException(
      `Could not find storage aggregator for templatesSet with id: ${templatesSetId}`,
      LogContext.STORAGE_AGGREGATOR
    );
  }

  public async getStorageAggregatorForCollaboration(
    collaborationID: string
  ): Promise<IStorageAggregator> {
    const storageAggregatorId =
      await this.getStorageAggregatorIdForCollaboration(collaborationID);
    return await this.getStorageAggregatorOrFail(storageAggregatorId);
  }

  public async getStorageAggregatorForCalendar(
    calendarID: string
  ): Promise<IStorageAggregator> {
    const storageAggregatorId = await this.getStorageAggregatorIdForCalendar(
      calendarID
    );
    return await this.getStorageAggregatorOrFail(storageAggregatorId);
  }

  private async getStorageAggregatorIdForCollaboration(
    collaborationID: string
  ): Promise<string> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          id: collaborationID,
        },
      },
      relations: {
        storageAggregator: true,
      },
    });
    if (!space || !space.storageAggregator) {
      throw new NotImplementedException(
        `Unable to retrieve storage aggregator for collaborationID: ${collaborationID}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    return space.storageAggregator.id;
  }

  private async getStorageAggregatorIdForCalendar(
    calendarID: string
  ): Promise<string> {
    const collaborationId =
      await this.timelineResolverService.getCollaborationIdForCalendar(
        calendarID
      );
    return await this.getStorageAggregatorIdForCollaboration(collaborationId);
  }

  public async getStorageAggregatorForCommunication(
    communicationID: string
  ): Promise<IStorageAggregator> {
    const storageAggregatorId =
      await this.getStorageAggregatorIdForCommunication(communicationID);
    return await this.getStorageAggregatorOrFail(storageAggregatorId);
  }

  public async getStorageAggregatorForCommunity(
    communityID: string
  ): Promise<IStorageAggregator> {
    const storageAggregatorId = await this.getStorageAggregatorIdForCommunity(
      communityID
    );
    return await this.getStorageAggregatorOrFail(storageAggregatorId);
  }

  private async getStorageAggregatorIdForCommunity(
    communityID: string
  ): Promise<string> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        community: {
          id: communityID,
        },
      },
      relations: {
        storageAggregator: true,
      },
    });
    if (!space || !space.storageAggregator) {
      throw new NotImplementedException(
        `Unable to retrieve storage aggregator for communityID: ${communityID}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    return space.storageAggregator.id;
  }

  private async getStorageAggregatorIdForCommunication(
    communicationID: string
  ): Promise<string> {
    const query = `SELECT \`id\` FROM \`community\`
      WHERE \`community\`.\`communicationId\`='${communicationID}'`;
    const [communityQueryResult]: {
      id: string;
    }[] = await this.entityManager.connection.query(query);

    if (!communityQueryResult) {
      const query = `SELECT \`id\` FROM \`platform\`
      WHERE \`platform\`.\`communicationId\`='${communicationID}'`;
      const [platformQueryResult]: {
        id: string;
      }[] = await this.entityManager.connection.query(query);
      if (!platformQueryResult) {
        this.logger.error(
          `lookup for communication ${communicationID} - community / platform not found`,
          undefined,
          LogContext.STORAGE_BUCKET
        );
      }
      const platformStorageAggregator =
        await this.getPlatformStorageAggregator();
      return platformStorageAggregator.id;
    }
    return await this.getStorageAggregatorIdForCommunity(
      communityQueryResult.id
    );
  }

  public async getStorageAggregatorForCallout(
    calloutID: string
  ): Promise<IStorageAggregator> {
    const storageAggregatorId = await this.getStorageAggregatorIdForCallout(
      calloutID
    );
    return await this.getStorageAggregatorOrFail(storageAggregatorId);
  }

  private async getStorageAggregatorIdForCallout(
    calloutId: string
  ): Promise<string> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          callouts: {
            id: calloutId,
          },
        },
      },
      relations: {
        storageAggregator: true,
      },
    });
    if (!space || !space.storageAggregator) {
      throw new NotImplementedException(
        `Unable to retrieve storage aggregator for calloutID: ${calloutId} `,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    return space.storageAggregator.id;
  }
}
