import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ILibrary } from '@library/library/library.interface';
import { LibraryService } from '@library/library/library.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Platform } from './platform.entity';
import { IPlatform } from './platform.interface';

@Injectable()
export class PlatformService {
  constructor(
    private libraryService: LibraryService,
    @InjectRepository(Platform)
    private platformRepository: Repository<Platform>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getPlatformOrFail(): Promise<IPlatform> {
    const platform = await this.platformRepository.findOne();
    if (!platform)
      throw new EntityNotFoundException(
        'No Platform found!',
        LogContext.LIBRARY
      );
    return platform;
  }

  async getLibraryOrFail(): Promise<ILibrary> {
    return this.libraryService.getLibraryOrFail();
  }
}
