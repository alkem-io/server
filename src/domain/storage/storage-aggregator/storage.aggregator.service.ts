import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { StorageAggregator } from './storage.aggregator.entity';
import { IStorageAggregator } from './storage.aggregator.interface';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { StorageBucketService } from '../storage-bucket/storage.bucket.service';
import { IStorageAggregatorParent } from './dto/storage.aggregator.dto.parent';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { IStorageBucket } from '../storage-bucket/storage.bucket.interface';
import { EntityNotInitializedException } from '@common/exceptions';
import { SpaceType } from '@common/enums/space.type';
@Injectable()
export class StorageAggregatorService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private urlGeneratorService: UrlGeneratorService,
    private storageBucketService: StorageBucketService,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    @InjectRepository(StorageAggregator)
    private storageAggregatorRepository: Repository<StorageAggregator>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async createStorageAggregator(
    parentStorageAggregator?: IStorageAggregator
  ): Promise<IStorageAggregator> {
    const storageAggregator: IStorageAggregator = new StorageAggregator();
    storageAggregator.authorization = new AuthorizationPolicy();

    storageAggregator.parentStorageAggregator = parentStorageAggregator;

    // Do not set the storage aggregator on direct storage buckets as this causes
    // a circular loop
    storageAggregator.directStorage =
      await this.storageBucketService.createStorageBucket({});
    return await this.save(storageAggregator);
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
    storageAggregator: IStorageAggregator
  ): Promise<IStorageAggregator> {
    return await this.storageAggregatorRepository.save(storageAggregator);
  }

  public async size(storageAggregator: IStorageAggregator): Promise<number> {
    const directStorage = await this.getDirectStorageBucket(storageAggregator);
    const directStorageSize = await this.storageBucketService.size(
      directStorage
    );
    const childStorageAggregatorsSize = await this.sizeChildStorageAggregators(
      storageAggregator
    );
    const childStorageBucketsSize = await this.sizeChildStorageBuckets(
      storageAggregator
    );
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
    const childStorageAggregators = await this.getChildStorageAggregators(
      storageAggregator
    );
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
    const journeyInfo =
      await this.storageAggregatorResolverService.getParentEntityInformation(
        storageAggregator.id
      );

    let url = '';
    switch (journeyInfo.type) {
      case SpaceType.OPPORTUNITY:
        url = await this.urlGeneratorService.generateUrlForSubsubspace(
          journeyInfo.id
        );
        break;
      case SpaceType.CHALLENGE:
        url = await this.urlGeneratorService.generateUrlForSubspace(
          journeyInfo.id
        );
        break;
      case SpaceType.SPACE:
        url = this.urlGeneratorService.generateUrlForSpace(journeyInfo.nameID);
        break;
    }
    const result: IStorageAggregatorParent = {
      url: url,
      ...journeyInfo,
    };
    return result;
  }
}
