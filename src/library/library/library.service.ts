import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { ValidationException } from '@common/exceptions/validation.exception';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { InnovationPackService } from '@library/innovation-pack/innovaton.pack.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { CreateInnovationPackOnLibraryInput } from './dto/library.dto.create.innovation.pack';
import { Library } from './library.entity';
import { ILibrary } from './library.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { InnovationPacksOrderBy } from '@common/enums/innovation.packs.orderBy';

@Injectable()
export class LibraryService {
  constructor(
    private innovationPackService: InnovationPackService,
    private namingService: NamingService,
    @InjectRepository(Library)
    private libraryRepository: Repository<Library>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getLibraryOrFail(options?: FindOneOptions<Library>): Promise<ILibrary> {
    const library = (
      await this.libraryRepository.find({ take: 1, ...options })
    )?.[0];
    if (!library)
      throw new EntityNotFoundException(
        'No Library found!',
        LogContext.LIBRARY
      );
    return library;
  }

  public async getInnovationPacks(
    library: ILibrary,
    limit?: number,
    orderBy: InnovationPacksOrderBy = InnovationPacksOrderBy.NUMBER_OF_TEMPLATES_DESC
  ): Promise<IInnovationPack[]> {
    const innovationPacks = library.innovationPacks;
    if (!innovationPacks)
      throw new EntityNotFoundException(
        `Undefined innovation packs found: ${library.id}`,
        LogContext.LIBRARY
      );

    // Sort based on the amount of Templates in the InnovationPacks
    const innovationPacksWithCounts = await Promise.all(
      innovationPacks.map(async innovationPack => {
        const templatesCount =
          await this.innovationPackService.getTemplatesCount(innovationPack.id);
        return { ...innovationPack, templatesCount };
      })
    );

    const sortedPacks = innovationPacksWithCounts.sort((a, b) => {
      switch (orderBy) {
        case InnovationPacksOrderBy.RANDOM:
          return 0.5 - Math.random();
        case InnovationPacksOrderBy.NUMBER_OF_TEMPLATES_ASC:
          return a.templatesCount < b.templatesCount ? -1 : 1;
        case InnovationPacksOrderBy.NUMBER_OF_TEMPLATES_DESC:
          return a.templatesCount < b.templatesCount ? 1 : -1;
      }
      return 0;
    });
    return limit && limit > 0 ? sortedPacks.slice(0, limit) : sortedPacks;
  }

  public async createInnovationPack(
    innovationPackData: CreateInnovationPackOnLibraryInput
  ): Promise<IInnovationPack> {
    const library = await this.getLibraryOrFail({
      relations: {
        storageAggregator: true,
      },
    });
    if (!library.innovationPacks || !library.storageAggregator)
      throw new EntityNotInitializedException(
        `Library (${library}) not initialised`,
        LogContext.LIBRARY
      );

    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInLibrary(library.id);
    if (innovationPackData.nameID && innovationPackData.nameID.length > 0) {
      const nameTaken = reservedNameIDs.includes(innovationPackData.nameID);
      if (nameTaken)
        throw new ValidationException(
          `Unable to create InnovationPack: the provided nameID is already taken: ${innovationPackData.nameID}`,
          LogContext.LIBRARY
        );
    } else {
      innovationPackData.nameID =
        this.namingService.createNameIdAvoidingReservedNameIDs(
          `${innovationPackData.profileData.displayName}`,
          reservedNameIDs
        );
    }

    const innovationPack =
      await this.innovationPackService.createInnovationPack(
        innovationPackData,
        library.storageAggregator
      );
    library.innovationPacks.push(innovationPack);
    await this.libraryRepository.save(library);

    return innovationPack;
  }

  async getStorageAggregator(
    libraryInput: ILibrary
  ): Promise<IStorageAggregator> {
    const library = await this.getLibraryOrFail({
      relations: {
        storageAggregator: true,
      },
    });
    const storageAggregator = library.storageAggregator;

    if (!storageAggregator) {
      throw new EntityNotFoundException(
        `Unable to find storage aggregator for Library: ${libraryInput.id}`,
        LogContext.STORAGE_BUCKET
      );
    }

    return storageAggregator;
  }
}
