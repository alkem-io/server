import { LogContext } from '@common/enums';
import { ConfigurationTypes } from '@common/enums/configuration.type';
import { EntityNotFoundException } from '@common/exceptions';
import { ProfileService } from '@domain/common/profile/profile.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';

@Injectable()
export class UrlGeneratorService {
  PATH_USER = 'user';
  PATH_ORGANIZATION = 'organization';
  PATH_INNOVATION_LIBRARY = 'innovation-library';
  PATH_INNOVATION_PACKS = 'innovation-packs';
  PATH_CHALLENGES = 'challenges';
  PATH_OPPORTUNITIES = 'opportunities';
  PATH_COLLABORATION = 'collaboration';
  PATH_CONTRIBUTE = 'contribute';
  PATH_FORUM = 'forum';
  PATH_DISCUSSION = 'discussion';

  constructor(
    private profileService: ProfileService,
    private configService: ConfigService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async generateUrlForProfile(profileID: string): Promise<string> {
    const profile = await this.profileService.getProfileOrFail(profileID);
    const endpoint_cluster = this.configService.get(
      ConfigurationTypes.HOSTING
    )?.endpoint_cluster;

    let profileType = 'organization'; // to pick up the right profile type later
    profileType = 'user';

    switch (profileType) {
      case 'user':
        const userNameID = await this.getNameableEntityNameIDFromProfileOrFail(
          'user',
          profile.id
        );
        return `${endpoint_cluster}/${this.PATH_USER}/${userNameID}`;
      case 'organization':
        const organizationNameID =
          await this.getNameableEntityNameIDFromProfileOrFail(
            'organization',
            profile.id
          );
        return `${endpoint_cluster}/${this.PATH_ORGANIZATION}/${organizationNameID}`;
    }

    throw new Error(
      `Unable to generate URL for profile (${profileID}) of type: ${profileType}`
    );
  }

  public async getNameableEntityNameIDFromProfileOrFail(
    entityTableName: string,
    profileID: string
  ): Promise<string> {
    const [result]: {
      entityId: string;
      nameID: string;
    }[] = await this.entityManager.connection.query(
      `
        SELECT \`${entityTableName}\`.\`id\` as \`entityId\`, \`${entityTableName}\`.\`nameID\` as nameID FROM \`${entityTableName}\`
        WHERE \`${entityTableName}\`.\`profileId\` = '${profileID}'
      `
    );

    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find nameable parent on entity type '${entityTableName}' for profile: ${profileID}`,
        LogContext.COMMUNITY
      );
    }
    return result.nameID;
  }
}
