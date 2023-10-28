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
import { StorageAggregatorParentType } from '@common/enums/storage.aggregator.parent.type';

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
    type: StorageAggregatorParentType;
    nameID: string;
  }> {
    const spaceInfo = await this.getJourneyInfo('space', storageAggregatorID);
    if (spaceInfo) {
      return {
        type: StorageAggregatorParentType.SPACE,
        ...spaceInfo,
      };
    }
    const challengeInfo = await this.getJourneyInfo(
      'challenge',
      storageAggregatorID
    );
    if (challengeInfo) {
      return {
        type: StorageAggregatorParentType.CHALLENGE,
        ...challengeInfo,
      };
    }
    const opportunityInfo = await this.getJourneyInfo(
      'opportunity',
      storageAggregatorID
    );
    if (opportunityInfo) {
      return {
        type: StorageAggregatorParentType.OPPORTUNITY,
        ...opportunityInfo,
      };
    }
    throw new NotImplementedException(
      `Retrieval of parent entity information for storage aggregator on ${storageAggregatorID} type not yet implemented`,
      LogContext.STORAGE_AGGREGATOR
    );
  }

  public async getStorageAggregatorForTemplatesSet(
    templatesSetId: string
  ): Promise<IStorageAggregator> {
    let query = `SELECT \`storageAggregatorId\` FROM \`space\`
      WHERE \`space\`.\`templatesSetId\`='${templatesSetId}'`;
    let [result] = await this.entityManager.connection.query(query);

    if (result) {
      return await this.getStorageAggregatorOrFail(result.storageAggregatorId);
    }

    query = `SELECT \`id\` FROM \`innovation_pack\`
      WHERE \`innovation_pack\`.\`templatesSetId\`='${templatesSetId}'`;
    [result] = await this.entityManager.connection.query(query);
    if (result) {
      // use the library sorage aggregator
      return await this.getLibraryStorageAggregator();
    }

    throw new StorageAggregatorNotFoundException(
      `Could not find storage aggregator for templatesSet with id: ${templatesSetId}`,
      LogContext.STORAGE_AGGREGATOR
    );
  }

  public async getJourneyInfo(
    entityTableName: string,
    storageAggregatorID: string
  ): Promise<{ id: string; displayName: string; nameID: string } | null> {
    // Todo: get the displayName instead of the nameID
    const [result]: {
      id: string;
      displayName: string;
      nameID: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT \`${entityTableName}\`.\`id\` as \`id\`, \`profile\`.\`displayName\` as displayName, \`${entityTableName}\`.\`nameID\` as nameID FROM \`${entityTableName}\`
        LEFT JOIN \`profile\` ON \`profile\`.\`id\` = \`${entityTableName}\`.\`profileId\`
        WHERE \`${entityTableName}\`.\`storageAggregatorId\` = '${storageAggregatorID}'
      `
    );

    if (!result) {
      return null;
    }
    return result;
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
    let query = `SELECT \`storageAggregatorId\` FROM \`challenge\`
      LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`challenge\`.\`collaborationId\`
      WHERE \`collaboration\`.\`id\`='${collaborationID}'`;
    let [result]: {
      storageAggregatorId: string;
    }[] = await this.entityManager.connection.query(query);

    if (result && result.storageAggregatorId) return result.storageAggregatorId;

    query = `SELECT \`storageAggregatorId\` FROM \`space\`
      LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`space\`.\`collaborationId\`
       WHERE \`collaboration\`.\`id\`='${collaborationID}'`;
    [result] = await this.entityManager.connection.query(query);
    if (result && result.storageAggregatorId) return result.storageAggregatorId;

    query = `SELECT \`storageAggregatorId\` FROM \`opportunity\`
      LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`opportunity\`.\`collaborationId\`
      WHERE \`collaboration\`.\`id\`='${collaborationID}'`;
    [result] = await this.entityManager.connection.query(query);
    if (result && result.storageAggregatorId) return result.storageAggregatorId;

    throw new StorageAggregatorNotFoundException(
      `Could not find storage aggregator for collaboration with id: ${collaborationID}`,
      LogContext.STORAGE_AGGREGATOR
    );
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
    let query = `SELECT \`storageAggregatorId\` FROM \`challenge\`
      LEFT JOIN \`community\` ON \`community\`.\`id\` = \`challenge\`.\`communityId\`
      WHERE \`community\`.\`id\`='${communityID}'`;
    let [result]: {
      storageAggregatorId: string;
    }[] = await this.entityManager.connection.query(query);

    if (result && result.storageAggregatorId) return result.storageAggregatorId;

    query = `SELECT \`storageAggregatorId\` FROM \`space\`
      LEFT JOIN \`community\` ON \`community\`.\`id\` = \`space\`.\`communityId\`
      WHERE \`community\`.\`id\`='${communityID}'`;
    [result] = await this.entityManager.connection.query(query);
    if (result && result.storageAggregatorId) return result.storageAggregatorId;

    query = `SELECT \`storageAggregatorId\` FROM \`opportunity\`
      LEFT JOIN \`community\` ON \`community\`.\`id\` = \`opportunity\`.\`communityId\`
      WHERE \`community\`.\`id\`='${communityID}'`;
    [result] = await this.entityManager.connection.query(query);
    if (result && result.storageAggregatorId) return result.storageAggregatorId;

    throw new StorageAggregatorNotFoundException(
      `Could not find storage aggregator for community with id: ${communityID}`,
      LogContext.STORAGE_AGGREGATOR
    );
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
    let query = `SELECT \`storageAggregatorId\` FROM \`challenge\`
      LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`challenge\`.\`collaborationId\`
      LEFT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
      WHERE \`callout\`.\`id\`='${calloutId}'`;
    let [result]: {
      storageAggregatorId: string;
    }[] = await this.entityManager.connection.query(query);
    if (result && result.storageAggregatorId) return result.storageAggregatorId;

    query = `SELECT \`storageAggregatorId\` FROM \`space\`
      LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`space\`.\`collaborationId\`
      LEFT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
      WHERE \`callout\`.\`id\`='${calloutId}'`;
    [result] = await this.entityManager.connection.query(query);
    if (result && result.storageAggregatorId) return result.storageAggregatorId;

    query = `SELECT \`storageAggregatorId\` FROM \`opportunity\`
      LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`opportunity\`.\`collaborationId\`
      LEFT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
      WHERE \`callout\`.\`id\`='${calloutId}'`;
    [result] = await this.entityManager.connection.query(query);
    if (result && result.storageAggregatorId) return result.storageAggregatorId;

    throw new StorageAggregatorNotFoundException(
      `Could not find storage aggregator for callout with id: ${calloutId}`,
      LogContext.STORAGE_AGGREGATOR
    );
  }
}
