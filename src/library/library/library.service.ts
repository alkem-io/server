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
import { Repository } from 'typeorm';
import { CreateInnovationPackOnLibraryInput } from './dto/library.dto.create.innovation.pack';
import { Library } from './library.entity';
import { ILibrary } from './library.interface';

@Injectable()
export class LibraryService {
  constructor(
    private innovationPackService: InnovationPackService,
    private namingService: NamingService,
    @InjectRepository(Library)
    private libraryRepository: Repository<Library>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getLibraryOrFail(): Promise<ILibrary> {
    const library = (await this.libraryRepository.find({ take: 1 }))?.[0];
    if (!library)
      throw new EntityNotFoundException(
        'No Library found!',
        LogContext.LIBRARY
      );
    return library;
  }

  public async getInnovationPacks(
    library: ILibrary
  ): Promise<IInnovationPack[]> {
    const innovationPacks = library.innovationPacks;
    if (!innovationPacks)
      throw new EntityNotFoundException(
        `Undefined innovation packs found: ${library.id}`,
        LogContext.LIBRARY
      );

    return innovationPacks;
  }

  public async createInnovationPack(
    innovationPackData: CreateInnovationPackOnLibraryInput
  ): Promise<IInnovationPack> {
    const library = await this.getLibraryOrFail();
    if (!library.innovationPacks)
      throw new EntityNotInitializedException(
        `Library (${library}) not initialised`,
        LogContext.CONTEXT
      );

    if (innovationPackData.nameID && innovationPackData.nameID.length > 0) {
      const nameAvailable = await this.innovationPackService.isNameIdAvailable(
        innovationPackData.nameID
      );
      if (!nameAvailable)
        throw new ValidationException(
          `Unable to create InnovationPack: the provided nameID is already taken: ${innovationPackData.nameID}`,
          LogContext.LIBRARY
        );
    } else {
      innovationPackData.nameID = this.namingService.createNameID(
        `${innovationPackData.displayName}`
      );
    }

    const innovationPack =
      await this.innovationPackService.createInnovationPack(innovationPackData);
    library.innovationPacks.push(innovationPack);
    await this.libraryRepository.save(library);

    return innovationPack;
  }
}
