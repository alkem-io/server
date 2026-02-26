import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LogContext } from '@common/enums/logging.context';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import {
  EntityNotInitializedException,
  NotSupportedException,
} from '@common/exceptions';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import { IStorageBucket } from '../storage-bucket/storage.bucket.interface';
import { StorageBucketService } from '../storage-bucket/storage.bucket.service';
import { IStorageAggregatorParent } from './dto/storage.aggregator.dto.parent';
import { StorageAggregator } from './storage.aggregator.entity';
import { IStorageAggregator } from './storage.aggregator.interface';
@Injectable()
export class StorageAggregatorService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private storageBucketService: StorageBucketService,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    private urlGeneratorService: UrlGeneratorService,
    @InjectRepository(StorageAggregator)
    private storageAggregatorRepository: Repository<StorageAggregator>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async createStorageAggregator(
    type: StorageAggregatorType,
    parentStorageAggregator?: IStorageAggregator,
    mgr?: EntityManager
  ): Promise<IStorageAggregator> {
    const doCreate = async (m: EntityManager): Promise<IStorageAggregator> => {
      const storageAggregator: IStorageAggregator = new StorageAggregator();
      storageAggregator.type = type;
      storageAggregator.authorization = new AuthorizationPolicy(
        AuthorizationPolicyType.STORAGE_AGGREGATOR
      );

      storageAggregator.parentStorageAggregator = parentStorageAggregator;

      storageAggregator.directStorage =
        this.storageBucketService.createStorageBucket({});
      // Need to save the storage bucket to avoid a TypeORM saving circular dependency
      storageAggregator.directStorage = await this.storageBucketService.save(
        storageAggregator.directStorage,
        m
      );
      return await this.save(storageAggregator, m);
    };

    if (mgr) return doCreate(mgr);
    return this.storageAggregatorRepository.manager.transaction(doCreate);
  }

  async delete(storageAggregatorID: string): Promise<IStorageAggregator> {
    const storageAggregator = await this.getStorageAggregatorOrFail(
      storageAggregatorID,
      {
        relations: {
          directStorage: true,
        },
      }
    );

    if (!storageAggregator.directStorage) {
      throw new EntityNotInitializedException(
        `Unable to load direct storage on storage aggregator: ${storageAggregator.id}`,
        LogContext.STORAGE_AGGREGATOR
      );
    }

    if (storageAggregator.authorization)
      await this.authorizationPolicyService.delete(
        storageAggregator.authorization
      );

    await this.storageBucketService.deleteStorageBucket(
      storageAggregator.directStorage.id
    );

    const result = await this.storageAggregatorRepository.remove(
      storageAggregator as StorageAggregator
    );
    result.id = storageAggregatorID;
    return result;
  }

  async getStorageAggregatorOrFail(
    storageAggregatorID: string,
    options?: FindOneOptions<StorageAggregator>
  ): Promise<IStorageAggregator | never> {
    const storageAggregator =
      await this.storageAggregatorRepository.findOneOrFail({
        where: { id: storageAggregatorID },
        ...options,
      });
    if (!storageAggregator)
      throw new EntityNotFoundException(
        `StorageAggregator not found: ${storageAggregatorID}`,
        LogContext.STORAGE_BUCKET
      );
    return storageAggregator;
  }

  async save(
    storageAggregator: IStorageAggregator,
    mgr?: EntityManager
  ): Promise<IStorageAggregator> {
    if (mgr)
      return await mgr.save(storageAggregator as StorageAggregator);
    return await this.storageAggregatorRepository.save(storageAggregator);
  }

  public async size(storageAggregator: IStorageAggregator): Promise<number> {
    const directStorage = await this.getDirectStorageBucket(storageAggregator);
    const directStorageSize =
      await this.storageBucketService.size(directStorage);
    const childStorageAggregatorsSize =
      await this.sizeChildStorageAggregators(storageAggregator);
    const childStorageBucketsSize =
      await this.sizeChildStorageBuckets(storageAggregator);
    const totalSize =
      +directStorageSize +
      +childStorageBucketsSize +
      +childStorageAggregatorsSize;
    return totalSize;
  }

  public async sizeChildStorageBuckets(
    storageAggregator: IStorageAggregator
  ): Promise<number> {
    const childStorageBuckets =
      await this.storageBucketService.getStorageBucketsForAggregator(
        storageAggregator.id
      );
    let result = 0;
    for (const storageBucket of childStorageBuckets) {
      const size = await this.storageBucketService.size(storageBucket);
      result += +size;
    }
    return result;
  }

  public async sizeChildStorageAggregators(
    storageAggregator: IStorageAggregator
  ): Promise<number> {
    const childStorageAggregators =
      await this.getChildStorageAggregators(storageAggregator);
    let result = 0;
    for (const childStorageAggregator of childStorageAggregators) {
      const size = await this.size(childStorageAggregator);
      result += +size;
    }
    return result;
  }

  public async getChildStorageAggregators(
    storageAggregator: IStorageAggregator
  ): Promise<IStorageAggregator[]> {
    const result = await this.storageAggregatorRepository.find({
      where: {
        parentStorageAggregator: {
          id: storageAggregator.id,
        },
      },
    });
    if (!result) return [];
    return result;
  }

  public async getStorageBuckets(
    storageAggregator: IStorageAggregator
  ): Promise<IStorageBucket[]> {
    const result =
      await this.storageBucketService.getStorageBucketsForAggregator(
        storageAggregator.id
      );
    if (!result) return [];
    return result;
  }

  public async getParentStorageAggregator(
    storageAggregatorInput: IStorageAggregator
  ): Promise<IStorageAggregator | null> {
    const storageAggregator = await this.getStorageAggregatorOrFail(
      storageAggregatorInput.id,
      {
        relations: {
          parentStorageAggregator: true,
        },
      }
    );
    if (!storageAggregator.parentStorageAggregator) return null;
    return storageAggregator.parentStorageAggregator;
  }

  async getDirectStorageBucket(
    storageAggregatorInput: IStorageAggregator
  ): Promise<IStorageBucket> {
    const storageAggregator = await this.getStorageAggregatorOrFail(
      storageAggregatorInput.id,
      {
        relations: {
          directStorage: true,
        },
      }
    );

    if (!storageAggregator.directStorage) {
      throw new EntityNotFoundException(
        `Unable to find direct storage bucket for storage aggregator: ${storageAggregator.id}`,
        LogContext.COMMUNITY
      );
    }

    return storageAggregator.directStorage;
  }

  public async getParentEntity(
    storageAggregator: IStorageAggregator
  ): Promise<IStorageAggregatorParent> {
    const result: IStorageAggregatorParent = {
      id: '',
      displayName: '',
      url: '',
    };
    switch (storageAggregator.type) {
      case StorageAggregatorType.SPACE: {
        const space =
          await this.storageAggregatorResolverService.getParentSpaceForStorageAggregator(
            storageAggregator
          );
        result.id = space.id;
        result.displayName = space.about.profile.displayName;
        result.level = space.level;
        result.url = await this.urlGeneratorService.getSpaceUrlPathByID(
          space.id
        );
        break;
      }
      case StorageAggregatorType.PLATFORM:
        result.displayName = 'platform';
        result.url = this.urlGeneratorService.generateUrlForPlatform();
        break;

      case StorageAggregatorType.ORGANIZATION: {
        const organization =
          await this.storageAggregatorResolverService.getParentOrganizationForStorageAggregator(
            storageAggregator
          );
        result.id = organization.id;
        result.displayName = organization.profile.displayName;
        result.url = this.urlGeneratorService.createUrlForOrganizationNameID(
          organization.nameID
        );
        break;
      }
      case StorageAggregatorType.USER: {
        const user =
          await this.storageAggregatorResolverService.getParentUserForStorageAggregator(
            storageAggregator
          );
        result.id = user.id;
        result.displayName = user.profile.displayName;
        result.url = this.urlGeneratorService.createUrlForUserNameID(
          user.nameID
        );
        break;
      }
      case StorageAggregatorType.ACCOUNT: {
        const account =
          await this.storageAggregatorResolverService.getParentAccountForStorageAggregator(
            storageAggregator
          );
        result.id = account.id;
        // TODO: when account-spaces is in then can consider making these fields specific; for now
        // to get it accurate would involve too many dependencies
        result.displayName = 'account';
        result.url = this.urlGeneratorService.generateUrlForPlatform();
        break;
      }
      default:
        throw new NotSupportedException(
          `Retrieval of parent entity information for storage aggregator on ${storageAggregator.id} of type ${storageAggregator.type} not yet implemented`,
          LogContext.STORAGE_AGGREGATOR
        );
    }
    return result;
  }
}
