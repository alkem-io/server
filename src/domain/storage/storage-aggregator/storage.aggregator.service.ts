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

    const savedAggregator = await this.save(storageAggregator);
    const directStorage = await this.storageBucketService.createStorageBucket({
      storageAggregator: savedAggregator,
    });
    savedAggregator.directStorage = directStorage;
    return await this.save(savedAggregator);
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
    const directStorageSize = await this.storageBucketService.size(
      storageAggregator.directStorage
    );
    const childStorageAggregatorsSize = await this.sizeChildStorageAggregators(
      storageAggregator
    );
    const childStorageBucketsSize = await this.sizeChildStorageBuckets(
      storageAggregator
    );
    return (
      directStorageSize + childStorageAggregatorsSize + childStorageBucketsSize
    );
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
      result = result + size;
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
      result = result + size;
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

  public async getParentEntity(
    storageAggregator: IStorageAggregator
  ): Promise<IStorageAggregatorParent> {
    const journeyInfo =
      await this.storageAggregatorResolverService.getParentEntityInformation(
        storageAggregator.id
      );

    let url = '';
    switch (journeyInfo.type) {
      case 'challenge':
        url = await this.urlGeneratorService.generateUrlForChallenge(
          journeyInfo.id
        );
        break;
      case 'space':
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
