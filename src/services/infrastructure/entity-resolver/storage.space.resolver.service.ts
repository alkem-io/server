import { Injectable } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { StorageSpaceNotFoundException } from '@common/exceptions/storage.space.not.found.exception';

@Injectable()
export class StorageSpaceResolverService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  public async getStorageSpaceIdForProfile(profileID: string): Promise<string> {
    // First iterate over all the entity types that have storage spaces directly
    const directStorageSpaceEntities = ['hub', 'challenge', 'organisation'];
    for (const entityName of directStorageSpaceEntities) {
      const match = await this.getDirectStorageSpaceForProfile(
        profileID,
        entityName
      );
      if (match) return match;
    }

    throw new StorageSpaceNotFoundException(
      `Unable to find StorageSpace for Profile with ID: ${profileID}`,
      LogContext.STORAGE_SPACE
    );
  }

  private async getDirectStorageSpaceForProfile(
    profileID: string,
    entityName: string
  ): Promise<string | undefined> {
    const [result]: {
      entityId: string;
      storageSpaceId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT \`${entityName}\`.\`id\` as \`entityId\`, \`${entityName}\`.\`storageSpaceId\` as \`storageSpaceId\`
        WHERE \`${entityName}\`.\`profileId\` = '${profileID}'`
    );

    if (result) {
      return result.storageSpaceId;
    }

    return undefined;
  }
}
