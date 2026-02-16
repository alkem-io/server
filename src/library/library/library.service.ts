import { InnovationPacksOrderBy } from '@common/enums/innovation.packs.orderBy';
import { LogContext } from '@common/enums/logging.context';
import { SearchVisibility } from '@common/enums/search.visibility';
import { RelationshipNotFoundException } from '@common/exceptions';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { virtualContributors } from '@domain/community/virtual-contributor/virtual.contributor.schema';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { innovationHubs } from '@domain/innovation-hub/innovation.hub.schema';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { innovationPacks } from '@library/innovation-pack/innovation.pack.schema';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ITemplateResult } from './dto/library.dto.template.result';
import { LibraryTemplatesFilterInput } from './dto/library.dto.templates.input';
import { libraries } from './library.schema';
import { ILibrary } from './library.interface';

@Injectable()
export class LibraryService {
  constructor(
    private innovationPackService: InnovationPackService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getLibraryOrFail(options?: { with?: Record<string, boolean | object> }): Promise<ILibrary> {
    const library = await this.db.query.libraries.findFirst({
      with: options?.with,
    });
    if (!library)
      throw new EntityNotFoundException(
        'No Library found!',
        LogContext.LIBRARY
      );
    return library as unknown as ILibrary;
  }
  public async save(library: ILibrary): Promise<ILibrary> {
    if (library.id) {
      const [updated] = await this.db
        .update(libraries)
        .set({
          authorizationId: library.authorization?.id,
        })
        .where(eq(libraries.id, library.id))
        .returning();
      return updated as unknown as ILibrary;
    }
    const [created] = await this.db
      .insert(libraries)
      .values({
        authorizationId: library.authorization?.id,
      })
      .returning();
    return created as unknown as ILibrary;
  }

  public async getListedVirtualContributors(): Promise<IVirtualContributor[]> {
    const results = await this.db.query.virtualContributors.findMany({
      where: and(
        eq(virtualContributors.listedInStore, true),
        eq(virtualContributors.searchVisibility, SearchVisibility.PUBLIC)
      ),
    });
    return results as unknown as IVirtualContributor[];
  }

  public async getListedInnovationHubs(): Promise<IInnovationHub[]> {
    const results = await this.db.query.innovationHubs.findMany({
      where: and(
        eq(innovationHubs.listedInStore, true),
        eq(innovationHubs.searchVisibility, SearchVisibility.PUBLIC)
      ),
    });
    return results as unknown as IInnovationHub[];
  }

  public async getListedInnovationPacks(
    limit?: number,
    orderBy: InnovationPacksOrderBy = InnovationPacksOrderBy.NUMBER_OF_TEMPLATES_DESC
  ): Promise<IInnovationPack[]> {
    const results = await this.db.query.innovationPacks.findMany({
      where: and(
        eq(innovationPacks.listedInStore, true),
        eq(innovationPacks.searchVisibility, SearchVisibility.PUBLIC)
      ),
      with: {
        templatesSet: true,
      },
    });

    return await this.sortAndFilterInnovationPacks(
      results as unknown as IInnovationPack[],
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
    const results = await this.db.query.innovationPacks.findMany({
      where: and(
        eq(innovationPacks.listedInStore, true),
        eq(innovationPacks.searchVisibility, SearchVisibility.PUBLIC)
      ),
      with: {
        templatesSet: {
          with: {
            templates: {
              with: {
                profile: true,
              },
            },
          },
        },
      },
    });
    const templateResults: ITemplateResult[] = [];
    for (const innovationPack of results) {
      if (
        !innovationPack.templatesSet ||
        !(innovationPack.templatesSet as any).templates
      ) {
        throw new RelationshipNotFoundException(
          `InnovationPack ${innovationPack.id} does not have a templatesSet or templates`,
          LogContext.LIBRARY
        );
      }
      let filteredTemplates = (innovationPack.templatesSet as any).templates;
      if (filter && filter.types) {
        filteredTemplates = filteredTemplates.filter((template: any) =>
          filter.types.includes(template.type)
        );
      }
      for (const template of filteredTemplates) {
        const result: ITemplateResult = {
          template,
          innovationPack: innovationPack as unknown as IInnovationPack,
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
