import {
  Inject,
  Injectable,
  LoggerService,
  NotImplementedException,
} from '@nestjs/common';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { LogContext } from '@common/enums';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { TimelineResolverService } from '../entity-resolver/timeline.resolver.service';
import { StorageAggregatorNotFoundException } from '@common/exceptions/storage.aggregator.not.found.exception';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Space } from '@domain/space/space/space.entity';
import { isUUID } from 'class-validator';
import { InvalidUUID } from '@common/exceptions/invalid.uuid';
import { ISpace } from '@domain/space/space/space.interface';
import { IOrganization, Organization } from '@domain/community/organization';
import { IUser, User } from '@domain/community/user';
import { Account } from '@domain/space/account/account.entity';
import { IAccount } from '@domain/space/account/account.interface';

@Injectable()
export class StorageAggregatorResolverService {
  constructor(
    private timelineResolverService: TimelineResolverService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @InjectRepository(StorageAggregator)
    private storageAggregatorRepository: Repository<StorageAggregator>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async getStorageAggregatorOrFail(
    storageAggregatorID: string,
    options?: FindOneOptions<StorageAggregator>
  ): Promise<StorageAggregator | never> {
    if (!storageAggregatorID) {
      throw new EntityNotFoundException(
        `StorageAggregator not found: ${storageAggregatorID}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    const storageAggregator =
      await this.storageAggregatorRepository.findOneOrFail({
        where: { id: storageAggregatorID },
        ...options,
      });
    if (!storageAggregator)
      throw new EntityNotFoundException(
        `StorageAggregator not found: ${storageAggregatorID}`,
        LogContext.STORAGE_AGGREGATOR
      );
    return storageAggregator;
  }

  public async getPlatformStorageAggregator(): Promise<IStorageAggregator> {
    const query = `SELECT \`storageAggregatorId\`
    FROM \`platform\` LIMIT 1`;
    const [result]: {
      storageAggregatorId: string;
    }[] = await this.entityManager.connection.query(query);
    return this.getStorageAggregatorOrFail(result.storageAggregatorId);
  }

  public async getParentAccountForStorageAggregator(
    storageAggregator: IStorageAggregator
  ): Promise<IAccount> {
    const account = await this.entityManager.findOne(Account, {
      where: {
        storageAggregator: {
          id: storageAggregator.id,
        },
      },
    });
    if (!account) {
      throw new NotImplementedException(
        `Unable to retrieve Account for storage aggregator ${storageAggregator.id}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    return account;
  }

  public async getParentSpaceForStorageAggregator(
    storageAggregator: IStorageAggregator
  ): Promise<ISpace> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        storageAggregator: {
          id: storageAggregator.id,
        },
      },
      relations: {
        profile: true,
      },
    });
    if (!space) {
      throw new NotImplementedException(
        `Unable to retrieve Space for storage aggregator ${storageAggregator.id}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    return space;
  }

  public async getParentOrganizationForStorageAggregator(
    storageAggregator: IStorageAggregator
  ): Promise<IOrganization> {
    const organization = await this.entityManager.findOne(Organization, {
      where: {
        storageAggregator: {
          id: storageAggregator.id,
        },
      },
      relations: {
        profile: true,
      },
    });
    if (!organization) {
      throw new NotImplementedException(
        `Unable to retrieve Organization for storage aggregator ${storageAggregator.id}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    return organization;
  }

  public async getParentUserForStorageAggregator(
    storageAggregator: IStorageAggregator
  ): Promise<IUser> {
    const user = await this.entityManager.findOne(User, {
      where: {
        storageAggregator: {
          id: storageAggregator.id,
        },
      },
      relations: {
        profile: true,
      },
    });
    if (!user) {
      throw new NotImplementedException(
        `Unable to retrieve User for storage aggregator ${storageAggregator.id}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    return user;
  }

  public async getStorageAggregatorForTemplatesSet(
    templatesSetId: string
  ): Promise<IStorageAggregator> {
    // This query is a bit tricky because we have a TemplateSetId and we need to find the StorageAggregator
    // associated to it's parent.
    // TemplatesSets can be in a Space (the space's templates), or an InnovationPack (the templates of that IP).
    // In practice it's just a ManyToMany relationship between Spaces/IPs and the templates associated to them.

    // The parent of Spaces and IPs is an Account, Spaces have a StorageAggregator but Account also has a StorageAggregator.
    // So for templatesSets in spaces we return the Space's StoreAggregator, and for templatesSets in IPs we return the Account's StorageAggregator.

    if (!isUUID(templatesSetId)) {
      throw new InvalidUUID(
        'Invalid UUID provided to find the StorageAggregator of a templateSet',
        LogContext.COMMUNITY,
        { provided: templatesSetId }
      );
    }

    // We are doing this UNION here, but only one of them will return a result.
    const query = `
      SELECT account.storageAggregatorId FROM account
        WHERE account.libraryId = '${templatesSetId}'
      UNION
      SELECT account.storageAggregatorId FROM innovation_pack
        JOIN account ON innovation_pack.accountId = account.id
        WHERE innovation_pack.templatesSetId = '${templatesSetId}'`;

    // If we want to get the storageAggregator of the space in the first case, we would do:
    //  SELECT space.storageAggregatorId FROM space
    //    JOIN account ON space.accountId = account.id
    //    WHERE space.level = 0 AND account.libraryId = '${templatesSetId}'

    const [result] = await this.entityManager.connection.query(query);
    if (result) {
      return this.getStorageAggregatorOrFail(result.storageAggregatorId);
    }

    throw new StorageAggregatorNotFoundException(
      `Could not find storage aggregator for templatesSet with id: ${templatesSetId}`,
      LogContext.STORAGE_AGGREGATOR
    );
  }

  public async getStorageAggregatorForCollaboration(
    collaborationID: string
  ): Promise<IStorageAggregator> {
    const storageAggregatorId =
      await this.getStorageAggregatorIdForCollaboration(collaborationID);
    return await this.getStorageAggregatorOrFail(storageAggregatorId);
  }

  public async getStorageAggregatorForCalendar(
    calendarID: string
  ): Promise<IStorageAggregator> {
    const storageAggregatorId =
      await this.getStorageAggregatorIdForCalendar(calendarID);
    return await this.getStorageAggregatorOrFail(storageAggregatorId);
  }

  private async getStorageAggregatorIdForCollaboration(
    collaborationID: string
  ): Promise<string> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          id: collaborationID,
        },
      },
      relations: {
        storageAggregator: true,
      },
    });
    if (!space || !space.storageAggregator) {
      throw new NotImplementedException(
        `Unable to retrieve storage aggregator for collaborationID: ${collaborationID}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    return space.storageAggregator.id;
  }

  private async getStorageAggregatorIdForCalendar(
    calendarID: string
  ): Promise<string> {
    const collaborationId =
      await this.timelineResolverService.getCollaborationIdForCalendar(
        calendarID
      );
    return await this.getStorageAggregatorIdForCollaboration(collaborationId);
  }

  public async getStorageAggregatorForForum(): Promise<IStorageAggregator> {
    return await this.getPlatformStorageAggregator();
  }

  public async getStorageAggregatorForCommunity(
    communityID: string
  ): Promise<IStorageAggregator> {
    const storageAggregatorId =
      await this.getStorageAggregatorIdForCommunity(communityID);
    return await this.getStorageAggregatorOrFail(storageAggregatorId);
  }

  private async getStorageAggregatorIdForCommunity(
    communityID: string
  ): Promise<string> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        community: {
          id: communityID,
        },
      },
      relations: {
        storageAggregator: true,
      },
    });
    if (!space || !space.storageAggregator) {
      throw new NotImplementedException(
        `Unable to retrieve storage aggregator for communityID: ${communityID}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    return space.storageAggregator.id;
  }

  public async getStorageAggregatorForCallout(
    calloutID: string
  ): Promise<IStorageAggregator> {
    const storageAggregatorId =
      await this.getStorageAggregatorIdForCallout(calloutID);
    return await this.getStorageAggregatorOrFail(storageAggregatorId);
  }

  private async getStorageAggregatorIdForCallout(
    calloutId: string
  ): Promise<string> {
    const space = await this.entityManager.findOne(Space, {
      where: {
        collaboration: {
          callouts: {
            id: calloutId,
          },
        },
      },
      relations: {
        storageAggregator: true,
      },
    });
    if (!space || !space.storageAggregator) {
      throw new NotImplementedException(
        `Unable to retrieve storage aggregator for calloutID: ${calloutId} `,
        LogContext.STORAGE_AGGREGATOR
      );
    }
    return space.storageAggregator.id;
  }
}
