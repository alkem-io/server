import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { StorageBucketNotFoundException } from '@common/exceptions/storage.bucket.not.found.exception';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class StorageBucketResolverService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async getStorageBucketIdForProfile(
    profileID: string
  ): Promise<string | never> {
    // First iterate over all the entity types that have storage spaces directly
    for (const entityName of Object.values(DirectStorageBucketEntityType)) {
      const match = await this.getDirectStorageBucketForProfile(
        profileID,
        entityName,
        this.entityManager
      );
      if (match) return match;
    }

    // Check the other places where a profile could be used
    const result = await getProfileType(profileID, this.entityManager);
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

    return this.getStorageBucketIdForProfileResult(this.entityManager, result);
  }

  async getDocumentProfileType(
    profileID: string,
    entityManager: EntityManager
  ): Promise<ProfileResult | never> {
    // Check the other places where a profile could be used
    const result = await getProfileType(profileID, entityManager);
    if (!result) {
      throw new StorageBucketNotFoundException(
        `Unable to find StorageBucket for Profile with ID: ${profileID}`,
        LogContext.STORAGE_BUCKET
      );
    }
    return result;
  }

  async getDirectStorageBucketForProfile(
    profileID: string,
    entityName: DirectStorageBucketEntityType,
    entityManager: EntityManager
  ): Promise<string | undefined> {
    const query = `SELECT \`${entityName}\`.\`id\` as \`entityId\`, \`${entityName}\`.\`storageBucketId\` as \`storageBucketId\`
    FROM \`${entityName}\` WHERE \`${entityName}\`.\`profileId\` = '${profileID}'`;

    const [result]: {
      entityId: string;
      storageBucketId: string;
    }[] = await entityManager.connection.query(query);

    if (result) {
      return result.storageBucketId;
    }

    return undefined;
  }

  async getStorageBucketIdForProfileResult(
    entityManager: EntityManager,
    profile: ProfileResult
  ) {
    switch (profile.type) {
      case ProfileType.USER:
        return await getPlatformStorageBucketId(entityManager);
      case ProfileType.OPPORTUNITY:
        return await getStorageBucketIdForOpportunity(
          entityManager,
          profile.entityID
        );
      case ProfileType.CALLOUT:
        return await getStorageBucketIdForCallout(
          entityManager,
          profile.entityID
        );
      case ProfileType.POST:
        return await getStorageBucketIdForCalloutType(
          entityManager,
          profile.entityID,
          'aspect'
        );
      case ProfileType.WHITEBOARD:
        return await getStorageBucketIdForCalloutType(
          entityManager,
          profile.entityID,
          'canvas'
        );
      case ProfileType.INNOVATION_PACK:
        return await getPlatformStorageBucketId(entityManager);
      case ProfileType.WHITEBOARD_TEMPLATE:
        return await getStorageBucketIdForTemplate(
          entityManager,
          profile.entityID,
          'whiteboard_template'
        );
      case ProfileType.POST_TEMPLATE:
        return await getStorageBucketIdForTemplate(
          entityManager,
          profile.entityID,
          'post_template'
        );
      case ProfileType.INNOVATION_FLOW_TEMPLATE:
        return await getStorageBucketIdForTemplate(
          entityManager,
          profile.entityID,
          'innovation_flow_template'
        );
      case ProfileType.DISCUSSION:
        return await getStorageBucketIdForDiscussion(
          entityManager,
          profile.entityID
        );
      default:
        throw new StorageBucketNotFoundException(
          `Unrecognized profile type: ${profile.type}`,
          LogContext.STORAGE_BUCKET
        );
    }
  }
}
async function getPlatformStorageBucketId(
  entityManager: EntityManager
): Promise<string> {
  const query = `SELECT \`storageBucketId\`
  FROM \`platform\` LIMIT 1`;
  const [result]: {
    storageBucketId: string;
  }[] = await entityManager.connection.query(query);
  return result.storageBucketId;
}

async function getStorageBucketIdForOpportunity(
  entityManager: EntityManager,
  opportunityId: string
): Promise<string> {
  const query = `SELECT \`storageBucketId\` FROM \`challenge\`
  LEFT JOIN \`opportunity\` ON \`challenge\`.\`id\` = \`opportunity\`.\`challengeId\`
  WHERE \`opportunity\`.\`id\`='${opportunityId}'`;
  const [result]: {
    storageBucketId: string;
  }[] = await entityManager.connection.query(query);
  return result.storageBucketId;
}

async function getStorageBucketIdForCallout(
  entityManager: EntityManager,
  calloutId: string
): Promise<string> {
  let query = `SELECT \`storageBucketId\` FROM \`challenge\`
  LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`challenge\`.\`collaborationId\`
  LEFT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
  WHERE \`callout\`.\`id\`='${calloutId}'`;
  let [result]: {
    storageBucketId: string;
  }[] = await entityManager.connection.query(query);

  if (result && result.storageBucketId) return result.storageBucketId;

  query = `SELECT \`storageBucketId\` FROM \`hub\`
  LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`hub\`.\`collaborationId\`
  LEFT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
  WHERE \`callout\`.\`id\`='${calloutId}'`;
  [result] = await entityManager.connection.query(query);
  if (result && result.storageBucketId) return result.storageBucketId;

  query = `SELECT \`storageBucketId\` FROM \`challenge\`
  LEFT JOIN \`opportunity\` ON \`opportunity\`.\`challengeId\` = \`challenge\`.\`id\`
  LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`opportunity\`.\`collaborationId\`
  LEFT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
  WHERE \`callout\`.\`id\`='${calloutId}'`;
  [result] = await entityManager.connection.query(query);

  return result.storageBucketId;
}

async function getStorageBucketIdForCalloutType(
  entityManager: EntityManager,
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
  }[] = await entityManager.connection.query(query);

  if (result && result.storageBucketId) return result.storageBucketId;

  query = `SELECT \`storageBucketId\` FROM \`hub\`
  LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`hub\`.\`collaborationId\`
  LEFT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
  LEFT JOIN \`${calloutType}\` ON \`${calloutType}\`.\`calloutId\` = \`callout\`.\`id\`
  WHERE \`${calloutType}\`.\`id\`='${entityId}'`;
  [result] = await entityManager.connection.query(query);
  if (result && result.storageBucketId) return result.storageBucketId;

  query = `SELECT \`storageBucketId\` FROM \`challenge\`
  LEFT JOIN \`opportunity\` ON \`opportunity\`.\`challengeId\` = \`challenge\`.\`id\`
  LEFT JOIN \`collaboration\` ON \`collaboration\`.\`id\` = \`opportunity\`.\`collaborationId\`
  LEFT JOIN \`callout\` ON \`callout\`.\`collaborationId\` = \`collaboration\`.\`id\`
  LEFT JOIN \`${calloutType}\` ON \`${calloutType}\`.\`calloutId\` = \`callout\`.\`id\`
  WHERE \`${calloutType}\`.\`id\`='${entityId}'`;
  [result] = await entityManager.connection.query(query);

  return result.storageBucketId;
}

async function getStorageBucketIdForTemplate(
  entityManager: EntityManager,
  templateId: string,
  templateType: TemplateType
): Promise<string | never> {
  let query = `SELECT \`templatesSetId\` FROM \`${templateType}\`
WHERE \`${templateType}\`.\`id\`='${templateId}'`;
  let [result]: {
    templatesSetId: string;
    storageBucketId: string;
  }[] = await entityManager.connection.query(query);

  if (result) {
    if (!result.templatesSetId) {
      return getPlatformStorageBucketId(entityManager);
    } else {
      query = `SELECT \`storageBucketId\` FROM \`hub\`
    WHERE \`hub\`.\`templatesSetId\`='${result.templatesSetId}'`;
      [result] = await entityManager.connection.query(query);

      if (result) return result.storageBucketId;
      else {
        return getPlatformStorageBucketId(entityManager);
      }
    }
  }

  throw new StorageBucketNotFoundException(
    `Could not find storage bucket for whiteboard template with id: ${templateId}`,
    LogContext.STORAGE_BUCKET
  );
}

async function getStorageBucketIdForDiscussion(
  entityManager: EntityManager,
  discussionId: string
): Promise<string> {
  const query = `SELECT \`storageBucketId\` FROM \`hub\`
  LEFT JOIN \`communication\` ON \`communication\`.\`hubID\` = \`hub\`.\`id\`
  LEFT JOIN \`discussion\` ON \`discussion\`.\`communicationId\` = \`communication\`.\`id\`
  WHERE \`discussion\`.\`id\`='${discussionId}'`;
  const [result]: {
    storageBucketId: string;
  }[] = await entityManager.connection.query(query);

  if (result && result.storageBucketId) return result.storageBucketId;

  return getPlatformStorageBucketId(entityManager);
}

async function getProfileType(
  profileID: string,
  entityManager: EntityManager
): Promise<ProfileResult | undefined> {
  for (const entityName of Object.values(ProfileType)) {
    const match = await getEntityForProfile(
      profileID,
      entityName,
      entityManager
    );
    if (match) return match;
  }

  return undefined;
}

async function getEntityForProfile(
  profileID: string,
  entityName: ProfileType,
  entityManager: EntityManager
): Promise<ProfileResult | undefined> {
  const query = `SELECT \`${entityName}\`.\`id\` as \`entityId\`
  FROM \`${entityName}\` WHERE \`${entityName}\`.\`profileId\` = '${profileID}'`;
  const [result]: {
    entityId: string;
    storageBucketId: string;
  }[] = await entityManager.connection.query(query);

  if (result) {
    return {
      type: entityName,
      entityID: result.entityId,
    };
  }

  return undefined;
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
}

export enum DirectStorageBucketEntityType {
  HUB = 'hub',
  CHALLENGE = 'challenge',
  ORGANIZATION = 'organization',
}
