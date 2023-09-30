import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { StorageBucketNotFoundException } from '@common/exceptions/storage.bucket.not.found.exception';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { EntityNotFoundException } from '@common/exceptions';
import { StorageBucket } from '@domain/storage/storage-bucket/storage.bucket.entity';
import { TimelineResolverService } from '../entity-resolver/timeline.resolver.service';

@Injectable()
export class StorageBucketResolverService {
  constructor(
    private timelineResolverService: TimelineResolverService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @InjectRepository(StorageBucket)
    private storageBucketRepository: Repository<StorageBucket>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  private async getStorageBucketIdForCallout(
    calloutId: string
  ): Promise<string> {
    let query = `SELECT \`storageBucketId\` FROM \`challenge\`
      LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`challenge\`.\`collaborationId\`
      LEFT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
      WHERE \`callout\`.\`id\`='${calloutId}'`;
    let [result]: {
      storageBucketId: string;
    }[] = await this.entityManager.connection.query(query);

    if (result && result.storageBucketId) return result.storageBucketId;

    query = `SELECT \`storageBucketId\` FROM \`space\`
      LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`space\`.\`collaborationId\`
      LEFT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
      WHERE \`callout\`.\`id\`='${calloutId}'`;
    [result] = await this.entityManager.connection.query(query);
    if (result && result.storageBucketId) return result.storageBucketId;

    query = `SELECT \`storageBucketId\` FROM \`challenge\`
      LEFT JOIN \`opportunity\` ON \`opportunity\`.\`challengeId\` = \`challenge\`.\`id\`
      LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`opportunity\`.\`collaborationId\`
      LEFT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
      WHERE \`callout\`.\`id\`='${calloutId}'`;
    [result] = await this.entityManager.connection.query(query);

    return result.storageBucketId;
  }

  public async getPlatformStorageBucket(): Promise<IStorageBucket> {
    const query = `SELECT \`storageBucketId\`
    FROM \`platform\` LIMIT 1`;
    const [result]: {
      storageBucketId: string;
    }[] = await this.entityManager.connection.query(query);
    return this.getStorageBucketOrFail(result.storageBucketId);
  }

  async getStorageBucketOrFail(
    storageBucketID: string,
    options?: FindOneOptions<StorageBucket>
  ): Promise<IStorageBucket | never> {
    if (!storageBucketID) {
      throw new EntityNotFoundException(
        `StorageBucket not found: ${storageBucketID}`,
        LogContext.STORAGE_BUCKET
      );
    }
    const storageBucket = await this.storageBucketRepository.findOneOrFail({
      where: { id: storageBucketID },
      ...options,
    });
    if (!storageBucket)
      throw new EntityNotFoundException(
        `StorageBucket not found: ${storageBucketID}`,
        LogContext.STORAGE_BUCKET
      );
    return storageBucket;
  }

  public async getStorageBucketForTemplatesSet(
    templatesSetId: string
  ): Promise<IStorageBucket> {
    const storageBucketId = await this.getStorageBucketIdForTemplatesSet(
      templatesSetId
    );
    return await this.getStorageBucketOrFail(storageBucketId);
  }

  public async getStorageBucketForCommunication(
    communicationID: string
  ): Promise<IStorageBucket> {
    const storageBucketId = await this.getStorageBucketIdForCommunication(
      communicationID
    );
    return await this.getStorageBucketOrFail(storageBucketId);
  }

  public async getStorageBucketForCommunity(
    communityID: string
  ): Promise<IStorageBucket> {
    const storageBucketId = await this.getStorageBucketIdForCommunity(
      communityID
    );
    return await this.getStorageBucketOrFail(storageBucketId);
  }

  public async getStorageBucketForCalendar(
    calendarID: string
  ): Promise<IStorageBucket> {
    const storageBucketId = await this.getStorageBucketIdForCalendar(
      calendarID
    );
    return await this.getStorageBucketOrFail(storageBucketId);
  }

  public async getStorageBucketForCollaboration(
    collaborationID: string
  ): Promise<IStorageBucket> {
    const storageBucketId = await this.getStorageBucketIdForCollaboration(
      collaborationID
    );
    return await this.getStorageBucketOrFail(storageBucketId);
  }

  public async getStorageBucketForCallout(
    calloutID: string
  ): Promise<IStorageBucket> {
    const storageBucketId = await this.getStorageBucketIdForCallout(calloutID);
    return await this.getStorageBucketOrFail(storageBucketId);
  }

  private async getStorageBucketIdForTemplatesSet(
    templatesSetId: string
  ): Promise<string> {
    let query = `SELECT \`storageBucketId\` FROM \`space\`
      WHERE \`space\`.\`templatesSetId\`='${templatesSetId}'`;
    let [result] = await this.entityManager.connection.query(query);

    if (result) {
      return result.storageBucketId;
    }

    query = `SELECT \`storageBucketId\` FROM \`innovation_pack\`
      WHERE \`innovation_pack\`.\`templatesSetId\`='${templatesSetId}'`;
    [result] = await this.entityManager.connection.query(query);
    if (result) {
      return result.storageBucketId;
    }

    throw new StorageBucketNotFoundException(
      `Could not find storage bucket for templatesSet with id: ${templatesSetId}`,
      LogContext.STORAGE_BUCKET
    );
  }

  private async getStorageBucketIdForCommunity(
    communityID: string
  ): Promise<string> {
    let query = `SELECT \`storageBucketId\` FROM \`challenge\`
      LEFT JOIN \`community\` ON \`community\`.\`id\` = \`challenge\`.\`communityId\`
      WHERE \`community\`.\`id\`='${communityID}'`;
    let [result]: {
      storageBucketId: string;
    }[] = await this.entityManager.connection.query(query);

    if (result && result.storageBucketId) return result.storageBucketId;

    query = `SELECT \`storageBucketId\` FROM \`space\`
      LEFT JOIN \`community\` ON \`community\`.\`id\` = \`space\`.\`communityId\`
       WHERE \`community\`.\`id\`='${communityID}'`;
    [result] = await this.entityManager.connection.query(query);
    if (result && result.storageBucketId) return result.storageBucketId;

    query = `SELECT \`storageBucketId\` FROM \`challenge\`
      LEFT JOIN \`opportunity\` ON \`opportunity\`.\`challengeId\` = \`challenge\`.\`id\`
      LEFT JOIN \`community\` ON \`community\`.\`id\` = \`opportunity\`.\`communityId\`
      WHERE \`collaboration\`.\`id\`='${communityID}'`;
    [result] = await this.entityManager.connection.query(query);

    return result.storageBucketId;
  }

  private async getStorageBucketIdForCollaboration(
    collaborationID: string
  ): Promise<string> {
    let query = `SELECT \`storageBucketId\` FROM \`challenge\`
      LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`challenge\`.\`collaborationId\`
      WHERE \`collaboration\`.\`id\`='${collaborationID}'`;
    let [result]: {
      storageBucketId: string;
    }[] = await this.entityManager.connection.query(query);

    if (result && result.storageBucketId) return result.storageBucketId;

    query = `SELECT \`storageBucketId\` FROM \`space\`
      LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`space\`.\`collaborationId\`
       WHERE \`collaboration\`.\`id\`='${collaborationID}'`;
    [result] = await this.entityManager.connection.query(query);
    if (result && result.storageBucketId) return result.storageBucketId;

    query = `SELECT \`storageBucketId\` FROM \`challenge\`
      LEFT JOIN \`opportunity\` ON \`opportunity\`.\`challengeId\` = \`challenge\`.\`id\`
      LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`opportunity\`.\`collaborationId\`
      WHERE \`collaboration\`.\`id\`='${collaborationID}'`;
    [result] = await this.entityManager.connection.query(query);

    return result.storageBucketId;
  }

  private async getStorageBucketIdForCommunication(
    communicationID: string
  ): Promise<string> {
    const query = `SELECT \`id\` FROM \`community\`
      WHERE \`community\`.\`communicationId\`='${communicationID}'`;
    const [result]: {
      id: string;
    }[] = await this.entityManager.connection.query(query);

    if (!result) {
      this.logger.error(
        `lookup for communication ${communicationID} - community not found`,
        LogContext.STORAGE_BUCKET
      );
    }
    return await this.getStorageBucketIdForCommunity(result.id);
  }

  private async getStorageBucketIdForCalendar(
    calendarID: string
  ): Promise<string> {
    const collaborationId =
      await this.timelineResolverService.getCollaborationIdForCalendar(
        calendarID
      );
    return await this.getStorageBucketIdForCollaboration(collaborationId);
  }
}
