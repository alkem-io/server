import { InnovationPacksOrderBy } from '@common/enums/innovation.packs.orderBy';
import { LogContext } from '@common/enums/logging.context';
import { SearchVisibility } from '@common/enums/search.visibility';
import { RelationshipNotFoundException } from '@common/exceptions';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { getPaginationResults, PaginationArgs } from '@core/pagination';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { InnovationHub } from '@domain/innovation-hub/innovation.hub.entity';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { Template } from '@domain/template/template/template.entity';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  Brackets,
  EntityManager,
  FindOneOptions,
  In,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { LibraryInnovationPacksFilterInput } from './dto/library.dto.innovationPacks.filter';
import { ITemplateResult } from './dto/library.dto.template.result';
import { LibraryTemplatesFilterInput } from './dto/library.dto.templates.input';
import { Library } from './library.entity';
import { ILibrary } from './library.interface';

/** Maximum page size for the paginated Innovation Library fields (FR-005). */
const MAX_LIBRARY_PAGE_SIZE = 100;

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
    const library = await this.libraryRepository.findOne({
      where: {},
      ...options,
    });
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
    return this.entityManager.find(VirtualContributor, {
      where: {
        listedInStore: true,
        searchVisibility: SearchVisibility.PUBLIC,
      },
    });
  }

  public async getListedInnovationHubs(): Promise<IInnovationHub[]> {
    return this.entityManager.find(InnovationHub, {
      where: {
        listedInStore: true,
        searchVisibility: SearchVisibility.PUBLIC,
      },
    });
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
      const types = filter?.types;
      if (types) {
        filteredTemplates = filteredTemplates.filter(template =>
          types.includes(template.type)
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

  /**
   * Paginated listed InnovationPacks, following the documented relay-style
   * cursor pattern (docs/Pagination.md). Pages by the `rowId` cursor,
   * newest-first.
   */
  public async getPaginatedListedInnovationPacks(
    paginationArgs: PaginationArgs,
    filter?: LibraryInnovationPacksFilterInput
  ): Promise<IPaginatedType<IInnovationPack>> {
    const qb = this.entityManager
      .createQueryBuilder(InnovationPack, 'innovationPack')
      // Load the authorization policy so the guarded child fields (e.g.
      // InnovationPack.templatesSet) can run their authorization check.
      .leftJoinAndSelect('innovationPack.authorization', 'authorization_policy')
      .where('innovationPack.listedInStore = :listed', { listed: true })
      .andWhere('innovationPack.searchVisibility = :visibility', {
        visibility: SearchVisibility.PUBLIC,
      });

    this.applySearchTerm(qb, 'innovationPack', filter?.searchTerm);

    return getPaginationResults(qb, this.clampPageSize(paginationArgs), 'DESC');
  }

  /**
   * Paginated Innovation Library templates, each paired with its contributing
   * InnovationPack. The `Template` entity is paginated with the documented
   * cursor helper (newest-first by `rowId`); the matching packs are then loaded
   * in a single follow-up query and attached.
   */
  public async getPaginatedTemplates(
    paginationArgs: PaginationArgs,
    filter?: LibraryTemplatesFilterInput
  ): Promise<IPaginatedType<ITemplateResult>> {
    const qb = this.entityManager
      .createQueryBuilder(Template, 'template')
      .innerJoinAndSelect('template.templatesSet', 'templatesSet')
      .innerJoin(
        InnovationPack,
        'innovationPack',
        'innovationPack.templatesSetId = templatesSet.id'
      )
      .where('innovationPack.listedInStore = :listed', { listed: true })
      .andWhere('innovationPack.searchVisibility = :visibility', {
        visibility: SearchVisibility.PUBLIC,
      });

    if (filter?.types && filter.types.length > 0) {
      qb.andWhere('template.type IN (:...types)', { types: filter.types });
    }

    this.applySearchTerm(qb, 'template', filter?.searchTerm);

    const paginated = await getPaginationResults(
      qb,
      this.clampPageSize(paginationArgs),
      'DESC'
    );

    return {
      total: paginated.total,
      items: await this.pairTemplatesWithPacks(paginated.items),
      pageInfo: paginated.pageInfo,
    };
  }

  /**
   * Each Template belongs to exactly one TemplatesSet, which belongs to exactly
   * one listed InnovationPack. Loads those packs in one query and pairs them.
   */
  private async pairTemplatesWithPacks(
    templates: Template[]
  ): Promise<ITemplateResult[]> {
    if (templates.length === 0) {
      return [];
    }

    const templatesSetIds = templates
      .map(template => template.templatesSet?.id)
      .filter((id): id is string => !!id);

    const packs = await this.entityManager.find(InnovationPack, {
      where: {
        templatesSet: { id: In(templatesSetIds) },
        listedInStore: true,
        searchVisibility: SearchVisibility.PUBLIC,
      },
      // authorization is required so the guarded InnovationPack.templatesSet
      // child field can run its authorization check on the paired pack.
      relations: { templatesSet: true, authorization: true },
    });

    const packByTemplatesSetId = new Map<string, InnovationPack>();
    for (const pack of packs) {
      if (pack.templatesSet?.id) {
        packByTemplatesSetId.set(pack.templatesSet.id, pack);
      }
    }

    return templates.map(template => {
      const innovationPack = template.templatesSet?.id
        ? packByTemplatesSetId.get(template.templatesSet.id)
        : undefined;
      if (!innovationPack) {
        throw new RelationshipNotFoundException(
          'Unable to find listed InnovationPack for Template',
          LogContext.LIBRARY,
          { templateId: template.id }
        );
      }
      return { template, innovationPack };
    });
  }

  /**
   * Appends an optional free-text filter to a paginated library query: a single
   * OR group matching the item's own profile displayName / description (ILIKE)
   * and its tags (an EXISTS subquery on `tagset`, so a profile's many tagsets do
   * not multiply rows and corrupt the count / page size — FR-021). No-op on a
   * blank term (FR-019). Provider is intentionally NOT searched: it is a reverse
   * `accountID` lookup to user/organization whose per-row EXISTS subqueries risk
   * slowing the query (FR-022).
   */
  private applySearchTerm<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    searchTerm?: string
  ): void {
    const term = searchTerm?.trim();
    if (!term) {
      return;
    }
    const like = `%${term}%`;

    qb.leftJoin(`${alias}.profile`, 'searchProfile').andWhere(
      new Brackets(wqb => {
        wqb
          .where('searchProfile.displayName ILIKE :searchTerm', {
            searchTerm: like,
          })
          .orWhere('searchProfile.description ILIKE :searchTerm', {
            searchTerm: like,
          })
          .orWhere(
            'EXISTS (SELECT 1 FROM tagset st WHERE st."profileId" = searchProfile.id AND st.tags ILIKE :searchTerm)',
            { searchTerm: like }
          );
      })
    );
  }

  /** Caps the requested page size at the maximum (FR-005). */
  private clampPageSize(paginationArgs: PaginationArgs): PaginationArgs {
    return {
      ...paginationArgs,
      first:
        paginationArgs.first !== undefined
          ? Math.min(paginationArgs.first, MAX_LIBRARY_PAGE_SIZE)
          : paginationArgs.first,
      last:
        paginationArgs.last !== undefined
          ? Math.min(paginationArgs.last, MAX_LIBRARY_PAGE_SIZE)
          : paginationArgs.last,
    };
  }
}
