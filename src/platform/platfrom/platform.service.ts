import { COMMUNICATION_PLATFORM_SPACEID } from '@common/constants';
import { DiscussionCategoryPlatform } from '@common/enums/communication.discussion.category.platform';
import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ICommunication } from '@domain/communication/communication/communication.interface';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { ILibrary } from '@library/library/library.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { Platform } from './platform.entity';
import { IPlatform } from './platform.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';

@Injectable()
export class PlatformService {
  constructor(
    private communicationService: CommunicationService,
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getPlatformOrFail(
    options?: FindOneOptions<Platform>
  ): Promise<IPlatform | never> {
    let platform: IPlatform | null = null;
    platform = (
      await this.platformRepository.find({ take: 1, ...options })
    )?.[0];

    if (!platform)
      throw new EntityNotFoundException(
        'No Platform found!',
        LogContext.PLATFORM
      );
    return platform;
  }

  async savePlatform(platform: IPlatform): Promise<IPlatform> {
    return await this.platformRepository.save(platform);
  }

  async getLibraryOrFail(
    relations?: FindOptionsRelations<IPlatform>
  ): Promise<ILibrary> {
    const platform = await this.getPlatformOrFail({
      relations: { library: true, ...relations },
    });
    const library = platform.library;
    if (!library) {
      throw new EntityNotFoundException(
        'No Platform Library found!',
        LogContext.PLATFORM
      );
    }
    return library;
  }

  async getCommunicationOrFail(): Promise<ICommunication> {
    const platform = await this.getPlatformOrFail({
      relations: { communication: true },
    });
    const communication = platform.communication;
    if (!communication) {
      throw new EntityNotFoundException(
        'No Platform Communication found!',
        LogContext.PLATFORM
      );
    }
    return communication;
  }

  async ensureCommunicationCreated(): Promise<ICommunication> {
    const platform = await this.getPlatformOrFail({
      relations: { communication: true },
    });
    const communication = platform.communication;
    if (!communication) {
      platform.communication =
        await this.communicationService.createCommunication(
          'platform',
          COMMUNICATION_PLATFORM_SPACEID,
          Object.values(DiscussionCategoryPlatform)
        );
      await this.savePlatform(platform);
      return platform.communication;
    }
    return communication;
  }

  async getStorageAggregator(
    platformInput: ILibrary
  ): Promise<IStorageAggregator> {
    const platform = await this.getPlatformOrFail({
      relations: {
        storageAggregator: true,
      },
    });
    const storageAggregator = platform.storageAggregator;

    if (!storageAggregator) {
      throw new EntityNotFoundException(
        `Unable to find storage aggregator for Platform: ${platformInput.id}`,
        LogContext.LIBRARY
      );
    }

    return storageAggregator;
  }
}
