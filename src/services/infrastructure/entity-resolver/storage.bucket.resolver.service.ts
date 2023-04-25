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
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async getStorageBucketIdForProfile(
    profileID: string
  ): Promise<string> {
    // First iterate over all the entity types that have storage spaces directly
    const directStorageBucketEntities = ['hub', 'challenge', 'organization'];
    for (const entityName of directStorageBucketEntities) {
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
        LogContext.STORAGE_SPACE
      );
    }

    this.logger.verbose?.(
      `Profile with id '${profileID}' identified as type: ${result.type}`,
      LogContext.STORAGE_SPACE
    );

    switch (result.type) {
      case ProfileType.USER:
        // to go onto platform storage space
        break;
      case ProfileType.OPPORTUNITY:
        // to go onto challenge storage space
        break;
      case ProfileType.CALLOUT:
        // to go onto hub / challenge storage space
        break;
      case ProfileType.POST:
        // to go onto hub / challenge storage space
        break;
      case ProfileType.WHITEBOARD:
        // to go onto hub / challenge storage space
        break;
      case ProfileType.INNOVATION_PACK:
        // to go onto platform storage space
        break;

      // Note: templates are part of a templates set, so first get the templates set,
      // then determine if in a Hub or a InnovationPack
      // If on a Hub, then use that storage space
      // If on a InnovationPack then use the Platform storage space
      case ProfileType.WHITEBOARD_TEMPLATE:
        // to go onto hub / platform template
        break;
      case ProfileType.POST_TEMPLATE:
        // to go onto hub / platform template
        break;
      case ProfileType.INNOVATION_FLOW_TEMPLATE:
        // to go onto hub / platform template
        break;
      default:
        throw new StorageBucketNotFoundException(
          `Unrecognized profile type: ${result.type}`,
          LogContext.STORAGE_SPACE
        );
    }
    return '';
  }

  private async getDirectStorageBucketForProfile(
    profileID: string,
    entityName: string
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

  private async getEntityForProfile(
    profileID: string,
    entityName: string
  ): Promise<ProfileResult | undefined> {
    const query = `SELECT \`${entityName}\`.\`id\` as \`entityId\`
    FROM \`${entityName}\` WHERE \`${entityName}\`.\`profileId\` = '${profileID}'`;
    console.log(query);
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
      'discussion',
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
  INNOVATION_FLOW_TEMPLATE = 'innovation_flow_template',
}
