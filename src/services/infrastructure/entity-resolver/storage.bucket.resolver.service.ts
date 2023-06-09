import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { StorageBucketNotFoundException } from '@common/exceptions/storage.bucket.not.found.exception';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { EntityNotFoundException } from '@common/exceptions';
import { StorageBucket } from '@domain/storage/storage-bucket/storage.bucket.entity';

@Injectable()
export class StorageBucketResolverService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async getStorageBucketForProfile(profileID: string): Promise<IStorageBucket> {
    const storageBucketID = await this.getStorageBucketIdForProfile(profileID);

    if (!storageBucketID) {
      throw new EntityNotFoundException(
        `StorageBucket not found: ${storageBucketID}`,
        LogContext.STORAGE_BUCKET
      );
    }
    const storageBucket = await this.entityManager.findOneOrFail(
      StorageBucket,
      {
        where: { id: storageBucketID },
      }
    );
    if (!storageBucket)
      throw new EntityNotFoundException(
        `StorageBucket not found: ${storageBucketID}`,
        LogContext.STORAGE_BUCKET
      );
    return storageBucket;
  }

  public async getStorageBucketIdForProfile(
    profileID: string
  ): Promise<string> {
    // First iterate over all the entity types that have storage spaces directly
    for (const entityName of Object.values(DirectStorageBucketEntityType)) {
      const match = await this.getDirectStorageBucketForProfile(
        profileID,
        entityName
      );
      if (match) return match;
    }

    // Check the other places where a profile could be used
    const result = await this.getProfileType(profileID);
    if (!result) {
      throw new StorageBucketNotFoundException(
        `Unable to find StorageBucket for Profile with ID: ${profileID}`,
        LogContext.STORAGE_BUCKET
      );
    }

    this.logger.verbose?.(
      `Profile with id '${profileID}' identified as type: ${result.type}`,
      LogContext.STORAGE_BUCKET
    );

    return this.getStorageBucketIdForProfileResult(result);
  }

  public async getDocumentProfileType(
    profileID: string
  ): Promise<ProfileResult> {
    // Check the other places where a profile could be used
    const result = await this.getProfileType(profileID);
    if (!result) {
      throw new StorageBucketNotFoundException(
        `Unable to find StorageBucket for Profile with ID: ${profileID}`,
        LogContext.STORAGE_BUCKET
      );
    }
    return result;
  }

  public async getDirectStorageBucketForProfile(
    profileID: string,
    entityName: DirectStorageBucketEntityType
  ): Promise<string | undefined> {
    const query = `SELECT \`${entityName}\`.\`id\` as \`entityId\`, \`${entityName}\`.\`storageBucketId\` as \`storageBucketId\`
    FROM \`${entityName}\` WHERE \`${entityName}\`.\`profileId\` = '${profileID}'`;

    const [result]: {
      entityId: string;
      storageBucketId: string;
    }[] = await this.entityManager.connection.query(query);

    if (result) {
      return result.storageBucketId;
    }

    return undefined;
  }

  public async getStorageBucketIdForProfileResult(profile: ProfileResult) {
    switch (profile.type) {
      case ProfileType.USER:
        return await this.getPlatformStorageBucketId();
      case ProfileType.OPPORTUNITY:
        return await this.getStorageBucketIdForOpportunity(profile.entityID);
      case ProfileType.CALLOUT:
        return await this.getStorageBucketIdForCallout(profile.entityID);
      case ProfileType.POST:
        return await this.getStorageBucketIdForCalloutType(
          profile.entityID,
          'aspect'
        );
      case ProfileType.WHITEBOARD:
        return await this.getStorageBucketIdForCalloutType(
          profile.entityID,
          'canvas'
        );
      case ProfileType.INNOVATION_PACK:
        return await this.getPlatformStorageBucketId();
      case ProfileType.WHITEBOARD_TEMPLATE:
        return await this.getStorageBucketIdForTemplate(
          profile.entityID,
          'whiteboard_template'
        );
      case ProfileType.POST_TEMPLATE:
        return await this.getStorageBucketIdForTemplate(
          profile.entityID,
          'post_template'
        );
      case ProfileType.INNOVATION_FLOW_TEMPLATE:
        return await this.getStorageBucketIdForTemplate(
          profile.entityID,
          'innovation_flow_template'
        );
      case ProfileType.INNOVATION_HUB:
        return await this.getPlatformStorageBucketId();
      case ProfileType.DISCUSSION:
        return await this.getStorageBucketIdForDiscussion(profile.entityID);
      default:
        throw new StorageBucketNotFoundException(
          `Unrecognized profile type: ${profile.type}`,
          LogContext.STORAGE_BUCKET
        );
    }
  }
  private async getPlatformStorageBucketId(): Promise<string> {
    const query = `SELECT \`storageBucketId\`
    FROM \`platform\` LIMIT 1`;
    const [result]: {
      storageBucketId: string;
    }[] = await this.entityManager.connection.query(query);
    return result.storageBucketId;
  }

  private async getStorageBucketIdForTemplate(
    templateId: string,
    templateType: TemplateType
  ): Promise<string> {
    let query = `SELECT \`templatesSetId\` FROM \`${templateType}\`
  WHERE \`${templateType}\`.\`id\`='${templateId}'`;
    let [result]: {
      templatesSetId: string;
      storageBucketId: string;
    }[] = await this.entityManager.connection.query(query);

    if (result) {
      if (!result.templatesSetId) {
        return this.getPlatformStorageBucketId();
      } else {
        query = `SELECT \`storageBucketId\` FROM \`hub\`
      WHERE \`hub\`.\`templatesSetId\`='${result.templatesSetId}'`;
        [result] = await this.entityManager.connection.query(query);

        if (result) return result.storageBucketId;
        else {
          return this.getPlatformStorageBucketId();
        }
      }
    }

    throw new StorageBucketNotFoundException(
      `Could not find storage bucket for whiteboard template with id: ${templateId}`,
      LogContext.STORAGE_BUCKET
    );
  }

  private async getStorageBucketIdForOpportunity(
    opportunityId: string
  ): Promise<string> {
    const query = `SELECT \`storageBucketId\` FROM \`challenge\`
      LEFT JOIN \`opportunity\` ON \`challenge\`.\`id\` = \`opportunity\`.\`challengeId\`
      WHERE \`opportunity\`.\`id\`='${opportunityId}'`;
    const [result]: {
      storageBucketId: string;
    }[] = await this.entityManager.connection.query(query);
    return result.storageBucketId;
  }

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

    query = `SELECT \`storageBucketId\` FROM \`hub\`
      LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`hub\`.\`collaborationId\`
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

  private async getStorageBucketIdForCalloutType(
    entityId: string,
    calloutType: CalloutType
  ): Promise<string> {
    let query = `SELECT \`storageBucketId\` FROM \`challenge\`
      LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`challenge\`.\`collaborationId\`
      LEFT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
      LEFT JOIN \`${calloutType}\` ON \`${calloutType}\`.\`calloutId\` = \`callout\`.\`id\`
      WHERE \`${calloutType}\`.\`id\`='${entityId}'`;
    let [result]: {
      storageBucketId: string;
    }[] = await this.entityManager.connection.query(query);

    if (result && result.storageBucketId) return result.storageBucketId;

    query = `SELECT \`storageBucketId\` FROM \`hub\`
      LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`hub\`.\`collaborationId\`
      LEFT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
      LEFT JOIN \`${calloutType}\` ON \`${calloutType}\`.\`calloutId\` = \`callout\`.\`id\`
      WHERE \`${calloutType}\`.\`id\`='${entityId}'`;
    [result] = await this.entityManager.connection.query(query);
    if (result && result.storageBucketId) return result.storageBucketId;

    query = `SELECT \`storageBucketId\` FROM \`challenge\`
      LEFT JOIN \`opportunity\` ON \`opportunity\`.\`challengeId\` = \`challenge\`.\`id\`
      LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`opportunity\`.\`collaborationId\`
      LEFT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
      LEFT JOIN \`${calloutType}\` ON \`${calloutType}\`.\`calloutId\` = \`callout\`.\`id\`
      WHERE \`${calloutType}\`.\`id\`='${entityId}'`;
    [result] = await this.entityManager.connection.query(query);

    return result.storageBucketId;
  }
  private async getStorageBucketIdForDiscussion(
    discussionId: string
  ): Promise<string> {
    const query = `SELECT \`storageBucketId\` FROM \`hub\`
      LEFT JOIN \`communication\` ON \`communication\`.\`hubID\` = \`hub\`.\`id\`
      LEFT JOIN \`discussion\` ON \`discussion\`.\`communicationId\` = \`communication\`.\`id\`
      WHERE \`discussion\`.\`id\`='${discussionId}'`;
    const [result]: {
      storageBucketId: string;
    }[] = await this.entityManager.connection.query(query);

    if (result && result.storageBucketId) return result.storageBucketId;

    return this.getPlatformStorageBucketId();
  }

  private async getProfileType(
    profileID: string
  ): Promise<ProfileResult | undefined> {
    for (const entityName of Object.values(ProfileType)) {
      const match = await this.getEntityForProfile(profileID, entityName);
      if (match) return match;
    }

    return undefined;
  }

  private async getEntityForProfile(
    profileID: string,
    entityName: ProfileType
  ): Promise<ProfileResult | undefined> {
    const query = `SELECT \`${entityName}\`.\`id\` as \`entityId\`
      FROM \`${entityName}\` WHERE \`${entityName}\`.\`profileId\` = '${profileID}'`;
    const [result]: {
      entityId: string;
      storageBucketId: string;
    }[] = await this.entityManager.connection.query(query);

    if (result) {
      return {
        type: entityName,
        entityID: result.entityId,
      };
    }

    return undefined;
  }
}

type ProfileResult = {
  type: ProfileType;
  entityID: string;
};

type TemplateType =
  | 'whiteboard_template'
  | 'post_template'
  | 'innovation_flow_template';

type CalloutType = 'aspect' | 'canvas';

// Note: enum values must match the name of the underlying table
enum ProfileType {
  USER = 'user',
  OPPORTUNITY = 'opportunity',
  POST = 'aspect',
  WHITEBOARD = 'canvas',
  POST_TEMPLATE = 'post_template',
  WHITEBOARD_TEMPLATE = 'whiteboard_template',
  CALLOUT = 'callout',
  INNOVATION_PACK = 'innovation_pack',
  DISCUSSION = 'discussion',
  INNOVATION_FLOW_TEMPLATE = 'innovation_flow_template',
  INNOVATION_HUB = 'innovation_hub',
}

export enum DirectStorageBucketEntityType {
  HUB = 'hub',
  CHALLENGE = 'challenge',
  ORGANIZATION = 'organization',
}
