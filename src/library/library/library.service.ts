import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { InnovationPackService } from '@library/innovation-pack/innovaton.pack.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import { Library } from './library.entity';
import { ILibrary } from './library.interface';
import { InnovationPacksOrderBy } from '@common/enums/innovation.packs.orderBy';
import {
  IVirtualContributor,
  VirtualContributor,
} from '@domain/community/virtual-contributor';
import { SearchVisibility } from '@common/enums/search.visibility';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';

@Injectable()
export class LibraryService {
  constructor(
    private innovationPackService: InnovationPackService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
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
  public async save(library: ILibrary): Promise<ILibrary> {
    return await this.libraryRepository.save(library);
  }

  public async getListedVirtualContributors(): Promise<IVirtualContributor[]> {
    const virtualContributors = await this.entityManager.find(
      VirtualContributor,
      {
        where: {
          listedInStore: true,
          searchVisibility: SearchVisibility.PUBLIC,
        },
        relations: {
          aiPersona: true,
        },
      }
    );
    return virtualContributors;
  }

  public async getListedInnovationPacks(
    limit?: number,
    orderBy: InnovationPacksOrderBy = InnovationPacksOrderBy.NUMBER_OF_TEMPLATES_DESC
  ): Promise<IInnovationPack[]> {
    const innovationPacks = await this.entityManager.find(InnovationPack, {
      where: {
        listedInStore: true,
        searchVisibility: SearchVisibility.PUBLIC,
      },
      relations: {
        templatesSet: true,
      },
    });

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
}
