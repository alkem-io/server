import { Injectable } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { StorageSpaceNotFoundException } from '@common/exceptions/storage.space.not.found.exception';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { Platform } from '@platform/platfrom/platform.entity';
import { Visual } from '@domain/common/visual/visual.entity';

@Injectable()
export class StorageSpaceResolverService {
  constructor(
    @InjectRepository(Hub)
    private hubRepository: Repository<Hub>,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @InjectRepository(InnovationPack)
    private innovationPackepository: Repository<InnovationPack>,
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>,
    @InjectRepository(Visual)
    private visualRepository: Repository<Visual>
  ) {}

  public async getStorageSpaceIdForCollaborationOrFail(
    collaborationID: string
  ): Promise<string> {
    const hub = await this.hubRepository
      .createQueryBuilder('hub')
      .leftJoinAndSelect('hub.collaboration', 'collaboration')
      .leftJoinAndSelect('hub.storageSpace', 'storageSpace')
      .where('collaboration.id = :id')
      .setParameters({ id: `${collaborationID}` })
      .getOne();

    if (hub && hub.storageSpace) {
      return hub.storageSpace.id;
    }

    const challenge = await this.challengeRepository
      .createQueryBuilder('challenge')
      .leftJoinAndSelect('challenge.collaboration', 'collaboration')
      .leftJoinAndSelect('challenge.storageSpace', 'storageSpace')
      .where('collaboration.id = :id')
      .setParameters({ id: `${collaborationID}` })
      .getOne();

    if (challenge && challenge.storageSpace) {
      return challenge.storageSpace.id;
    }

    throw new StorageSpaceNotFoundException(
      `Unable to find StorageSpace for Collaboration: ${collaborationID}`,
      LogContext.STORAGE_ACCESS
    );
  }

  public async getStorageSpaceIdForCommunityOrFail(
    communityID: string
  ): Promise<string> {
    const hub = await this.hubRepository
      .createQueryBuilder('hub')
      .leftJoinAndSelect('hub.community', 'community')
      .leftJoinAndSelect('hub.storageSpace', 'storageSpace')
      .where('community.id = :id')
      .setParameters({ id: `${communityID}` })
      .getOne();

    if (hub && hub.storageSpace) {
      return hub.storageSpace.id;
    }

    const challenge = await this.challengeRepository
      .createQueryBuilder('challenge')
      .leftJoinAndSelect('challenge.community', 'community')
      .leftJoinAndSelect('challenge.storageSpace', 'storageSpace')
      .where('community.id = :id')
      .setParameters({ id: `${communityID}` })
      .getOne();

    if (challenge && challenge.storageSpace) {
      return challenge.storageSpace.id;
    }

    throw new StorageSpaceNotFoundException(
      `Unable to find StorageSpace for Community: ${communityID}`,
      LogContext.STORAGE_ACCESS
    );
  }

  public async getStorageSpaceIdForCalendarOrFail(
    calendarID: string
  ): Promise<string> {
    const hub = await this.hubRepository
      .createQueryBuilder('hub')
      .leftJoinAndSelect('hub.storageSpace', 'storageSpace')
      .leftJoinAndSelect('hub.timeline', 'timeline')
      .leftJoinAndSelect('timeline.calendar', 'calendar')
      .where('calendar.id = :id')
      .setParameters({ id: `${calendarID}` })
      .getOne();

    if (hub && hub.storageSpace) {
      return hub.storageSpace.id;
    }

    throw new StorageSpaceNotFoundException(
      `Unable to find StorageSpace for Calendar: ${calendarID}`,
      LogContext.STORAGE_ACCESS
    );
  }

  public async getStorageSpaceIdForTemplatesSetOrFail(
    templatesSetID: string
  ): Promise<string> {
    const hub = await this.hubRepository
      .createQueryBuilder('hub')
      .leftJoinAndSelect('hub.templatesSet', 'templatesSet')
      .leftJoinAndSelect('hub.storageSpace', 'storageSpace')
      .where('templatesSet.id = :id')
      .setParameters({ id: `${templatesSetID}` })
      .getOne();

    if (hub && hub.storageSpace) {
      return hub.storageSpace.id;
    }

    const innovationPack = await this.innovationPackepository
      .createQueryBuilder('innovation-pack')
      .leftJoinAndSelect('innovation-pack.templatesSet', 'templatesSet')
      .leftJoinAndSelect('innovation-pack.profile', 'profile')
      .where('templatesSet.id = :id')
      .setParameters({ id: `${templatesSetID}` })
      .getOne();

    if (innovationPack && innovationPack.profile) {
      return innovationPack.profile.storageSpaceId;
    }

    throw new StorageSpaceNotFoundException(
      `Unable to find StorageSpace for TemplatesSet: ${templatesSetID}`,
      LogContext.STORAGE_ACCESS
    );
  }

  public async getStorageSpaceIdForContributors(): Promise<string> {
    const platform = await this.platformRepository
      .createQueryBuilder('platform')
      .leftJoinAndSelect('platform.storageSpace', 'storageSpace')
      .getOne();

    if (platform && platform.storageSpace) {
      return platform.storageSpace.id;
    }

    throw new StorageSpaceNotFoundException(
      'Unable to find StorageSpace for Contributors',
      LogContext.STORAGE_ACCESS
    );
  }

  public async getStorageSpaceIdForVisual(visualID: string): Promise<string> {
    const visual = await this.visualRepository
      .createQueryBuilder('visual')
      .leftJoinAndSelect('visual.profile', 'profile')
      .where('visual.id = :id')
      .setParameters({ id: `${visualID}` })
      .getOne();

    if (visual && visual.profile) {
      return visual.profile.storageSpaceId;
    }

    // tbd: deal with Branding entity here

    throw new StorageSpaceNotFoundException(
      'Unable to find StorageSpace for Visual',
      LogContext.STORAGE_ACCESS
    );
  }
}
