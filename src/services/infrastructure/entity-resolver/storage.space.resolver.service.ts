import { Injectable } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { StorageSpaceNotFoundException } from '@common/exceptions/storage.space.not.found.exception';

@Injectable()
export class StorageSpaceResolverService {
  constructor(@InjectEntityManager() private entityManager: EntityManager) {}

  public async getStorageSpaceIdForProfile(profileID: string): Promise<string> {
    const hubMatch = await this.getParentEntityForProfile(profileID, 'hub');
    if (hubMatch) return hubMatch;
    throw new StorageSpaceNotFoundException(
      `Unable to find StorageSpace for Profile with ID: ${profileID}`,
      LogContext.STORAGE_SPACE
    );
  }
  private async getParentEntityForProfile(
    profileID: string,
    entityName: string
  ): Promise<string | undefined> {
    const [result]: {
      entityId: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT \`${entityName}\`.\`id\` as \`entityId\`,
        WHERE \`${entityName}\`.\`profileId\` = '${profileID}'`
    );

    if (result) {
      return result.entityId;
    }

    return undefined;
  }
}
