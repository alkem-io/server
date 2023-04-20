import { Injectable } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { EntityManager, Repository } from 'typeorm';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { StorageSpaceNotFoundException } from '@common/exceptions/storage.space.not.found.exception';
import { Visual } from '@domain/common/visual/visual.entity';

@Injectable()
export class StorageSpaceResolverService {
  constructor(
    @InjectRepository(Visual)
    private visualRepository: Repository<Visual>,
    @InjectEntityManager() private entityManager: EntityManager
  ) {}

  public async getStorageSpaceIdForVisual(visualID: string): Promise<string> {
    const visual = await this.visualRepository
      .createQueryBuilder('visual')
      .leftJoinAndSelect('visual.profile', 'profile')
      .where('visual.id = :id')
      .setParameters({ id: `${visualID}` })
      .getOne();

    if (visual && visual.profile) {
      return ''; // TODO TODO TODO
    }

    throw new StorageSpaceNotFoundException(
      'Unable to find StorageSpace for Visual',
      LogContext.STORAGE_SPACE
    );
  }

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
