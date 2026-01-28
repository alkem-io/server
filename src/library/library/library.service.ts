import { InnovationPacksOrderBy } from '@common/enums/innovation.packs.orderBy';
import { LogContext } from '@common/enums/logging.context';
import { SearchVisibility } from '@common/enums/search.visibility';
import { RelationshipNotFoundException } from '@common/exceptions';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import { ITemplateResult } from './dto/library.dto.template.result';
import { LibraryTemplatesFilterInput } from './dto/library.dto.templates.input';
import { Library } from './library.entity';
import { ILibrary } from './library.interface';

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
      }
    );
    return virtualContributors;
  }

  public async getListedInnovationHubs(): Promise<IInnovationHub[]> {
    const innovationHubs = await this.entityManager.find(InnovationHub, {
      where: {
        listedInStore: true,
        searchVisibility: SearchVisibility.PUBLIC,
      },
    });
    return innovationHubs;
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

    return await this.sortAndFilterInnovationPacks(
      innovationPacks,
      limit,
      orderBy
    );
  }

  public async sortAndFilterInnovationPacks(
    innovationPacks: IInnovationPack[],
    limit?: number,
    orderBy: InnovationPacksOrderBy = InnovationPacksOrderBy.NUMBER_OF_TEMPLATES_DESC
  ): Promise<IInnovationPack[]> {
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

  public async getTemplatesInListedInnovationPacks(
    filter?: LibraryTemplatesFilterInput
  ): Promise<ITemplateResult[]> {
    // Note: potentially we can also make this all a lot faster with having a smart select on the included Templates that are returned
    const innovationPacks = await this.entityManager.find(InnovationPack, {
      where: {
        listedInStore: true,
        searchVisibility: SearchVisibility.PUBLIC,
      },
      relations: {
        templatesSet: {
          templates: {
            profile: true,
          },
        },
      },
    });
    const templateResults: ITemplateResult[] = [];
    for (const innovationPack of innovationPacks) {
      if (
        !innovationPack.templatesSet ||
        !innovationPack.templatesSet.templates
      ) {
        throw new RelationshipNotFoundException(
          `InnovationPack ${innovationPack.id} does not have a templatesSet or templates`,
          LogContext.LIBRARY
        );
      }
      let filteredTemplates = innovationPack.templatesSet.templates;
      if (filter && filter.types) {
        filteredTemplates = filteredTemplates.filter(template =>
          filter.types.includes(template.type)
        );
      }
      for (const template of filteredTemplates) {
        const result: ITemplateResult = {
          template,
          innovationPack,
        };
        templateResults.push(result);
      }
    }

    // Sort templates alphabetically by display name
    templateResults.sort((a, b) => {
      const displayNameA = a.template.profile?.displayName || '';
      const displayNameB = b.template.profile?.displayName || '';
      return displayNameA.localeCompare(displayNameB);
    });

    return templateResults;
  }
}
