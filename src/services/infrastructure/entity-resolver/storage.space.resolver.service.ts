import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { StorageSpaceNotFoundException } from '@common/exceptions/storage.space.not.found.exception';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class StorageSpaceResolverService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async getStorageSpaceIdForProfile(profileID: string): Promise<string> {
    // First iterate over all the entity types that have storage spaces directly
    const directStorageSpaceEntities = ['hub', 'challenge', 'organization'];
    for (const entityName of directStorageSpaceEntities) {
      const match = await this.getDirectStorageSpaceForProfile(
        profileID,
        entityName
      );
      if (match) return match;
    }

    // Check the other places where a profile could be used
    const result = await this.getProfileType(profileID);
    if (!result) {
      throw new StorageSpaceNotFoundException(
        `Unable to find StorageSpace for Profile with ID: ${profileID}`,
        LogContext.STORAGE_SPACE
      );
    }

    this.logger.verbose?.(
      `Profile with id '${profileID}' identified as type: ${result.type}`,
      LogContext.STORAGE_SPACE
    );

    switch (result.type) {
      case ProfileType.USER:
        //;
        break;
      case ProfileType.OPPORTUNITY:
        //;
        break;
      case ProfileType.CALLOUT:
        //;
        break;
      case ProfileType.POST:
        //
        break;
      case ProfileType.WHITEBOARD:
        //
        break;
      case ProfileType.INNOVATION_PACK:
        //
        break;
      case ProfileType.WHITEBOARD_TEMPLATE:
        //
        break;
      case ProfileType.POST_TEMPLATE:
        //
        break;
      default:
        throw new StorageSpaceNotFoundException(
          `Unrecognized profile type: ${result.type}`,
          LogContext.STORAGE_SPACE
        );
    }
    return '';
  }

  private async getDirectStorageSpaceForProfile(
    profileID: string,
    entityName: string
  ): Promise<string | undefined> {
    const query = `SELECT \`${entityName}\`.\`id\` as \`entityId\`, \`${entityName}\`.\`storageSpaceId\` as \`storageSpaceId\`
    FROM \`${entityName}\` WHERE \`${entityName}\`.\`profileId\` = '${profileID}'`;

    const [result]: {
      entityId: string;
      storageSpaceId: string;
    }[] = await this.entityManager.connection.query(query);

    if (result) {
      return result.storageSpaceId;
    }

    return undefined;
  }

  private async getEntityForProfile(
    profileID: string,
    entityName: string
  ): Promise<ProfileResult | undefined> {
    const query = `SELECT \`${entityName}\`.\`id\` as \`entityId\`
    FROM \`${entityName}\` WHERE \`${entityName}\`.\`profileId\` = '${profileID}'`;
    console.log(query);
    const [result]: {
      entityId: string;
      storageSpaceId: string;
    }[] = await this.entityManager.connection.query(query);

    if (result) {
      return {
        type: entityName,
        entityID: result.entityId,
      };
    }

    return undefined;
  }

  private async getProfileType(
    profileID: string
  ): Promise<ProfileResult | undefined> {
    const indirectProfileEntries = [
      'user',
      'opportunity',
      'callout',
      'aspect',
      'canvas',
      'post_template',
      'whiteboard_template',
      'innovation_flow_template',
    ];

    for (const entityName of indirectProfileEntries) {
      const match = await this.getEntityForProfile(profileID, entityName);
      if (match) return match;
    }

    return undefined;
  }
}

type ProfileResult = {
  type: string;
  entityID: string;
};

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
}
