import { LogContext } from '@common/enums';
import { isDefined } from '@common/utils';
import { ELASTICSEARCH_CLIENT_PROVIDER } from '@constants/index';
import { Client as ElasticClient, estypes } from '@elastic/elasticsearch';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getIndexPattern } from '@services/api/search/ingest/get.index.pattern';
import { isElasticError } from '@services/external/elasticsearch/utils';
import { AlkemioConfig } from '@src/types';
import { intersectionWith } from 'lodash';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SearchFilterInput, SearchInput } from '../dto/inputs';
import { BaseSearchHit, ISearchResult } from '../dto/results';
import { SearchCategory } from '../search.category';
import { SearchResultType } from '../search.result.type';
import { buildMultiSearchRequestItems } from './build.multi.search.request.items';
import { buildSearchQuery } from './build.search.query';
import { SearchIndex } from './search.index';

const getIndexStore = (
  indexPattern: string
): Record<SearchCategory, SearchIndex[]> => ({
  [SearchCategory.SPACES]: [
    {
      name: `${indexPattern}spaces`,
      type: SearchResultType.SPACE,
      category: SearchCategory.SPACES,
    },
    {
      name: `${indexPattern}subspaces`,
      type: SearchResultType.SUBSPACE,
      category: SearchCategory.SPACES,
    },
  ],
  [SearchCategory.CONTRIBUTORS]: [
    {
      name: `${indexPattern}users`,
      type: SearchResultType.USER,
      category: SearchCategory.CONTRIBUTORS,
    },
    {
      name: `${indexPattern}organizations`,
      type: SearchResultType.ORGANIZATION,
      category: SearchCategory.CONTRIBUTORS,
    },
  ],
  [SearchCategory.COLLABORATION_TOOLS]: [
    {
      name: `${indexPattern}callouts`,
      type: SearchResultType.CALLOUT,
      category: SearchCategory.COLLABORATION_TOOLS,
    },
  ],
  [SearchCategory.FRAMINGS]: [
    {
      name: `${indexPattern}memos`,
      type: SearchResultType.MEMO,
      category: SearchCategory.FRAMINGS,
    },
    {
      name: `${indexPattern}whiteboards`,
      type: SearchResultType.WHITEBOARD,
      category: SearchCategory.FRAMINGS,
    },
  ],
  [SearchCategory.CONTRIBUTIONS]: [
    {
      name: `${indexPattern}posts`,
      type: SearchResultType.POST,
      category: SearchCategory.CONTRIBUTIONS,
    },
    {
      name: `${indexPattern}memos`,
      type: SearchResultType.MEMO,
      category: SearchCategory.CONTRIBUTIONS,
    },
    {
      name: `${indexPattern}whiteboards`,
      type: SearchResultType.WHITEBOARD,
      category: SearchCategory.CONTRIBUTIONS,
    },
  ],
});
const getPublicIndexStore = (
  indexPattern: string
): Partial<Record<SearchCategory, SearchIndex[]>> => ({
  [SearchCategory.SPACES]: [
    {
      name: `${indexPattern}spaces`,
      type: SearchResultType.SPACE,
      category: SearchCategory.SPACES,
    },
    {
      name: `${indexPattern}subspaces`,
      type: SearchResultType.SUBSPACE,
      category: SearchCategory.SPACES,
    },
  ],
  [SearchCategory.FRAMINGS]: [
    {
      name: `${indexPattern}memos`,
      type: SearchResultType.MEMO,
      category: SearchCategory.FRAMINGS,
    },
    {
      name: `${indexPattern}whiteboards`,
      type: SearchResultType.WHITEBOARD,
      category: SearchCategory.FRAMINGS,
    },
  ],
  [SearchCategory.CONTRIBUTIONS]: [
    {
      name: `${indexPattern}posts`,
      type: SearchResultType.POST,
      category: SearchCategory.CONTRIBUTIONS,
    },
    {
      name: `${indexPattern}memos`,
      type: SearchResultType.MEMO,
      category: SearchCategory.CONTRIBUTIONS,
    },
    {
      name: `${indexPattern}whiteboards`,
      type: SearchResultType.WHITEBOARD,
      category: SearchCategory.CONTRIBUTIONS,
    },
  ],
});

const allowedTypesPerCategory: Record<SearchCategory, SearchResultType[]> = {
  [SearchCategory.SPACES]: [SearchResultType.SPACE, SearchResultType.SUBSPACE],
  [SearchCategory.CONTRIBUTORS]: [
    SearchResultType.USER,
    SearchResultType.ORGANIZATION,
  ],
  [SearchCategory.COLLABORATION_TOOLS]: [SearchResultType.CALLOUT],
  [SearchCategory.FRAMINGS]: [
    SearchResultType.MEMO,
    SearchResultType.WHITEBOARD,
  ],
  [SearchCategory.CONTRIBUTIONS]: [
    SearchResultType.POST,
    SearchResultType.WHITEBOARD,
    SearchResultType.MEMO,
  ],
};

const SIZE_MULTIPLIER = 2;

@Injectable()
export class SearchExtractService {
  private readonly indexPattern: string;
  private readonly maxResults: number;

  constructor(
    @Inject(ELASTICSEARCH_CLIENT_PROVIDER)
    private client: ElasticClient | undefined,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService,
    private configService: ConfigService<AlkemioConfig, true>
  ) {
    this.indexPattern = getIndexPattern(this.configService);
    this.maxResults = this.configService.get('search.max_results', {
      infer: true,
    });

    if (!client) {
      this.logger.verbose?.(
        'Elasticsearch client not initialized',
        LogContext.SEARCH_EXTRACT
      );
      return;
    }
  }

  public async search(
    searchData: SearchInput,
    onlyPublicResults = false
  ): Promise<ISearchResult[] | never> {
    if (!this.client) {
      throw new Error('Elasticsearch client not initialized');
    }

    const {
      terms,
      searchInSpaceFilter,
      searchInFlowStateFilter,
      filters,
      foldCalloutResources,
    } = searchData;
    const indicesToSearchOn = this.getIndices(
      onlyPublicResults,
      filters,
      foldCalloutResources
    );

    if (indicesToSearchOn.length === 0) {
      return [];
    }

    // execute search per category
    const result = await this.executeMultiSearch(indicesToSearchOn, terms, {
      searchInSpaceFilter,
      searchInFlowStateFilter,
      filters,
      sizeMultiplier: SIZE_MULTIPLIER,
    });

    return this.processMultiSearchResponses(result.responses);
  }

  private getIndices(
    onlyPublicResults = false,
    filters?: SearchFilterInput[],
    foldCalloutResources = false
  ): SearchIndex[] {
    const categories = filters
      ?.map(filter => filter.category)
      .filter((category): category is SearchCategory => !!category);

    const types = filters
      ?.flatMap(filter => {
        if (!filter.types || filter.types.length === 0) {
          return allowedTypesPerCategory[filter.category];
        }

        return filter.types;
      })
      .filter(isDefined);

    const indexStore = getIndexStore(this.indexPattern);

    const filteredIndicesByCategory =
      categories && categories.length > 0
        ? categories.flatMap(category => indexStore[category])
        : Object.values(indexStore).flat();

    const filteredIndicesByCategoryAndType =
      types && types.length > 0
        ? filteredIndicesByCategory.filter(index =>
            types.some(type => type === index.type)
          )
        : filteredIndicesByCategory;

    // foldCalloutResources widens a Callout search so framing resources and
    // contributions (post/whiteboard/memo) are matched too and fold up to their
    // containing callout. We must therefore also query those indices even though
    // they belong to other categories; the type filter above would otherwise
    // strip them. Bypasses it by appending here, deduped by index name.
    const indicesToSearchOn = foldCalloutResources
      ? this.withCalloutResourceIndices(
          filteredIndicesByCategoryAndType,
          categories
        )
      : filteredIndicesByCategoryAndType;

    if (onlyPublicResults) {
      const publicIndices = Object.values(
        getPublicIndexStore(this.indexPattern)
      ).flat();
      // if we want only public results - filter the public indices with the user defined filter
      return intersectionWith(
        indicesToSearchOn,
        publicIndices,
        (a, b) => a.name === b.name
      );
    }
    // these indices may include private data
    return indicesToSearchOn;
  }

  /**
   * Appends the post/whiteboard/memo indices so a Callout search (the
   * COLLABORATION_TOOLS category) also matches in the framing resources and
   * contributions that fold up to a callout. The single whiteboards/memos
   * indices hold both framing- and contribution-level instances, so each index
   * is needed at most once. No-op unless Callouts are in scope (collaboration
   * tools requested, or no category filter — meaning all categories). Deduped by
   * index name to avoid searching an already-included index twice.
   */
  private withCalloutResourceIndices(
    indices: SearchIndex[],
    categories?: SearchCategory[]
  ): SearchIndex[] {
    const calloutsInScope =
      !categories ||
      categories.length === 0 ||
      categories.includes(SearchCategory.COLLABORATION_TOOLS);
    if (!calloutsInScope) {
      return indices;
    }

    const indexStore = getIndexStore(this.indexPattern);
    const resourceIndices = [
      ...indexStore[SearchCategory.CONTRIBUTIONS],
      ...indexStore[SearchCategory.FRAMINGS],
    ];

    const existingNames = new Set(indices.map(index => index.name));
    const additions = resourceIndices
      .filter(index => {
        if (existingNames.has(index.name)) {
          return false;
        }
        existingNames.add(index.name);
        return true;
      })
      // Re-tag the appended indices to COLLABORATION_TOOLS so msearch folds them
      // into the SAME sub-query as the callouts index. msearch groups indices by
      // `category` into independent sub-queries, each with its OWN `search_after`.
      // The fold returns a single callout-level cursor (carried by the client
      // under the collaboration-tools filter). If these stayed under
      // CONTRIBUTIONS/FRAMINGS they would be separate sub-queries whose
      // `search_after` is never populated (those buckets are folded away, so no
      // cursor is sent) — they restart at hit 0 every page and re-return the same
      // folded hits forever (endless client scroll on contributions). Merging
      // them gives one global `[_score desc, id desc]` sort that the single
      // cursor paginates correctly. Result grouping is by `type`, not `category`,
      // so folding on the result side is unaffected.
      .map(index => ({
        ...index,
        category: SearchCategory.COLLABORATION_TOOLS,
      }));

    return [...indices, ...additions];
  }

  /***
   https://www.elastic.co/guide/en/elasticsearch/reference/current/search-multi-search.html
   The multi search API executes several searches from a single API request.
   The format of the request is similar to the bulk API format and makes use of the newline delimited JSON (NDJSON) format.
   The structure is as follows:
   ```
     header\n
     body\n
     header\n
     body\n
   ```
   */
  private async executeMultiSearch(
    indicesToSearchOn: SearchIndex[],
    terms: string[],
    options?: {
      searchInSpaceFilter?: string;
      searchInFlowStateFilter?: string;
      filters?: SearchFilterInput[];
      sizeMultiplier: number;
    }
  ): Promise<estypes.MsearchResponse<BaseSearchHit>> {
    if (!this.client) {
      throw new Error('Elasticsearch client not initialized');
    }

    if (indicesToSearchOn.length === 0) {
      throw new Error('No indices to search on');
    }

    const {
      searchInSpaceFilter,
      searchInFlowStateFilter,
      filters,
      sizeMultiplier,
    } = options ?? {};

    const term = terms.join(' ');
    // the main search query built using query DSL
    const query = buildSearchQuery(term, {
      spaceIdFilter: searchInSpaceFilter,
      flowStateIdFilter: searchInFlowStateFilter,
    });

    // Budget the default per-category size off the categories actually being
    // queried, not just the explicit filters: foldCalloutResources appends the
    // CONTRIBUTIONS/FRAMINGS indices on top of the requested COLLABORATION_TOOLS
    // filter, and those folded categories would otherwise each take the full
    // default size and overfetch. For non-folding searches this equals
    // filters.length, so behaviour is unchanged.
    const categoriesQueried = new Set(
      indicesToSearchOn.map(index => index.category)
    ).size;
    const categoriesRequested =
      categoriesQueried || (filters?.length ?? 0) || 1;
    const searchRequests = buildMultiSearchRequestItems(
      indicesToSearchOn,
      query,
      {
        filters,
        sizeMultiplier,
        defaults: {
          // split the max results between the categories to prevent overfetching
          size: this.maxResults / categoriesRequested,
        },
      }
    );

    return this.client.msearch<BaseSearchHit>({
      searches: searchRequests,
      // other msearch config goes here
    });
  }

  private processMultiSearchResponses(
    responses: estypes.MsearchResponseItem<BaseSearchHit>[]
  ): ISearchResult[] {
    const results = responses.flatMap(
      (
        response:
          | estypes.MsearchMultiSearchItem<BaseSearchHit>
          | estypes.ErrorResponseBase
      ) => {
        if (isElasticError(response)) {
          this.processMultiSearchError(response);
          return undefined;
        }

        return this.processMultiSearchItem(response);
      }
    );
    // filter the undefined produced by processing errors
    return results.filter(isDefined);
  }

  private processMultiSearchItem(
    item: estypes.MsearchMultiSearchItem<BaseSearchHit>
  ): ISearchResult[] {
    return item.hits.hits.map<ISearchResult>(hit => {
      const entityId = hit.fields?.id?.[0];
      const type = hit.fields?.type?.[0];

      if (!entityId) {
        this.logger.error(
          `Search result with no entity id: ${JSON.stringify(hit)}`,
          undefined,
          LogContext.SEARCH_EXTRACT
        );
      }

      if (hit._ignored) {
        const ignored = hit._ignored.join('; ');
        this.logger.warn(
          `Some fields were ignored while searching: ${ignored}`,
          undefined,
          LogContext.SEARCH_EXTRACT
        );
      }

      return {
        id: hit._id ?? 'N/A',
        score: hit._score ?? -1,
        type,
        terms: [], // todo - https://github.com/alkem-io/server/issues/3702
        result: {
          id: entityId ?? 'N/A',
        },
      };
    });
  }

  private processMultiSearchError(error: estypes.ErrorResponseBase): void {
    this.logger.error(
      {
        message: 'Error response for multi search request',
        ...error,
      },
      undefined,
      LogContext.SEARCH_EXTRACT
    );
  }
}
