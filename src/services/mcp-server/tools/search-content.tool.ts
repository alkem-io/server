import { LogContext } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SearchInput } from '@services/api/search/dto/inputs';
import { ISearchResults } from '@services/api/search/dto/results';
import { SearchCategory } from '@services/api/search/search.category';
import { SearchService } from '@services/api/search/search.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { McpTool, McpToolDefinition, McpToolResult } from '../dto/mcp.types';

interface SearchContentArgs {
  query: string;
  limit?: number;
}

/**
 * A single search result element, loosely typed so we can read the common base
 * fields plus whichever hydrated entity the concrete result carries, without
 * importing every concrete search-result interface.
 */
interface LooseSearchResult {
  id: string;
  score: number;
  type: string;
  whiteboard?: {
    id: string;
    nameID?: string;
    profile?: { displayName?: string };
  };
  post?: { id: string; nameID?: string; profile?: { displayName?: string } };
  memo?: { id: string; nameID?: string; profile?: { displayName?: string } };
  callout?: { id: string; framing?: { profile?: { displayName?: string } } };
  space?: { id: string; about?: { profile?: { displayName?: string } } };
  user?: { id: string; nameID?: string; profile?: { displayName?: string } };
  organization?: {
    id: string;
    nameID?: string;
    profile?: { displayName?: string };
  };
}

/**
 * Tool for full-text search across the platform (Elasticsearch-backed) to find
 * the id of an entity by its text — e.g. locate the whiteboard/post/callout to
 * analyze or update. Results are scoped to what the calling actor is allowed to
 * read (delegates to the platform SearchService, which filters by access /
 * returns only public results for anonymous callers).
 *
 * What is indexed is profile text (display name, tagline, description, tags),
 * post body, memo content, and the text drawn inside a whiteboard's Excalidraw
 * scene (its text elements). Requires Elasticsearch to be configured/running;
 * with no ES the underlying search throws and this tool returns a clear
 * `isError` result rather than a silent empty result set.
 *
 * This is a discovery tool: use it to find a candidate id, confirm the right
 * one, then act with analyze_whiteboard / update_whiteboard_content / etc.
 */
@Injectable()
export class SearchContentTool implements McpTool {
  constructor(
    private readonly searchService: SearchService,
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly urlGeneratorService: UrlGeneratorService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getDefinition(): McpToolDefinition {
    return {
      name: 'search_content',
      description:
        'Full-text search across the platform to find entities (spaces, callouts, posts, whiteboards, memos, users, organizations) by their text. ' +
        'Use it to resolve a human description to a concrete id — e.g. find the whiteboard/post to analyze or update — then confirm the match before acting. ' +
        'Results are limited to what you are allowed to read. ' +
        'NOTE: searches indexed profile text (name/description/tags), post bodies, memo content, and the text drawn inside whiteboard scenes (Excalidraw text elements). Requires Elasticsearch to be configured.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'The text to search for. Split into up to 5 terms; matched across all entity categories.',
          },
          limit: {
            type: 'number',
            description:
              'Maximum results per category. Defaults to (and is capped at) the platform per-category budget, so the total across all categories stays within the platform maximum; larger values are clamped.',
          },
        },
        required: ['query'],
      },
    };
  }

  async execute(
    args: unknown,
    actorContext: ActorContext
  ): Promise<McpToolResult> {
    const { query, limit } = args as SearchContentArgs;

    if (!query || !query.trim()) {
      return this.errorResult('A non-empty "query" is required.');
    }

    const terms = query.trim().split(/\s+/).slice(0, 5);
    // We request EVERY category, and the platform rejects a search whose summed
    // per-category size exceeds search.max_results (validateSearchParameters).
    // So the per-category size must be the budget split across the categories —
    // mirroring search.extract.service (`size: maxResults / categoriesRequested`).
    // Without this, even the default size (× categories) overflows the cap and
    // every search_content call fails with "cannot exceed the maximum allowed".
    const categories = Object.values(SearchCategory);
    const maxSearchResults = this.configService.get('search.max_results', {
      infer: true,
    });
    const maxPerCategory = Math.max(
      1,
      Math.floor(maxSearchResults / categories.length)
    );
    const requested =
      typeof limit === 'number' && limit > 0
        ? Math.floor(limit)
        : maxPerCategory;
    const size = Math.min(requested, maxPerCategory);
    const filters = categories.map(category => ({ category, size }));

    this.logger.verbose?.(
      `search_content: terms=[${terms.join(', ')}], actor=${actorContext.actorID || 'anonymous'}`,
      LogContext.MCP_SERVER
    );

    let results: ISearchResults;
    try {
      results = await this.searchService.search(
        { terms, filters } as SearchInput,
        actorContext
      );
    } catch (error) {
      this.logger.warn?.(
        `search_content failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        LogContext.MCP_SERVER
      );
      return this.errorResult(
        `Search failed (is Elasticsearch configured?): ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }

    const groups = [
      results.spaceResults,
      results.calloutResults,
      results.contributionResults,
      results.framingResults,
      results.actorResults,
    ];

    const matches = (
      await Promise.all(
        groups
          .flatMap(group => group?.results ?? [])
          .map(r => this.toMatch(r as unknown as LooseSearchResult))
      )
    ).sort((a, b) => b.score - a.score);

    const result = {
      query,
      terms,
      totalMatches: matches.length,
      matches,
      note: matches.length
        ? 'Confirm the intended entity by id before acting on it.'
        : 'No matches. Search covers indexed profile text, post and memo content, and whiteboard scene text; it requires Elasticsearch to be configured.',
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private async toMatch(r: LooseSearchResult): Promise<{
    type: string;
    id: string;
    displayName?: string;
    score: number;
    spaceId?: string;
    calloutId?: string;
    url?: string;
  }> {
    const entity = r.whiteboard ?? r.post ?? r.memo ?? r.user ?? r.organization;
    const displayName =
      entity?.profile?.displayName ??
      r.callout?.framing?.profile?.displayName ??
      r.space?.about?.profile?.displayName;

    // The base `id` is the Elasticsearch document id, not the Alkemio entity
    // UUID — use the hydrated entity's own id so the result is actionable
    // (e.g. feeding it into analyze_whiteboard / update_whiteboard_content).
    const entityId =
      r.whiteboard?.id ??
      r.post?.id ??
      r.memo?.id ??
      r.callout?.id ??
      r.space?.id ??
      r.user?.id ??
      r.organization?.id ??
      r.id;

    return {
      type: r.type,
      id: entityId,
      displayName,
      score: r.score,
      spaceId: r.space?.id,
      calloutId: r.callout?.id,
      // A real, browser-openable web URL built by the platform's own
      // UrlGeneratorService — the same canonical link the rest of Alkemio uses.
      // Best-effort per item: an unresolvable entity (template/KB callout,
      // orphaned item) degrades to no link rather than failing the whole search.
      url: await this.resolveUrl(r),
    };
  }

  /**
   * Resolve a real web URL for a search result via the platform's
   * UrlGeneratorService. Returns undefined (no link) if the URL cannot be built,
   * so a single unresolvable entity never breaks the tool result.
   */
  private async resolveUrl(r: LooseSearchResult): Promise<string | undefined> {
    try {
      if (r.whiteboard) {
        return await this.urlGeneratorService.getWhiteboardUrlPath(
          r.whiteboard.id,
          r.whiteboard.nameID ?? ''
        );
      }
      if (r.memo) {
        return await this.urlGeneratorService.getMemoUrlPath(
          r.memo.id,
          r.memo.nameID ?? ''
        );
      }
      if (r.post) {
        return await this.urlGeneratorService.getPostUrlPath(r.post.id);
      }
      if (r.callout) {
        return await this.urlGeneratorService.getCalloutUrlPath(r.callout.id);
      }
      if (r.space) {
        return await this.urlGeneratorService.getSpaceUrlPathByID(r.space.id);
      }
      if (r.user?.nameID) {
        return this.urlGeneratorService.createUrlForUserNameID(r.user.nameID);
      }
      if (r.organization?.nameID) {
        return this.urlGeneratorService.createUrlForOrganizationNameID(
          r.organization.nameID
        );
      }
    } catch (error) {
      this.logger.verbose?.(
        `search_content: could not resolve URL for ${r.type} ${r.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
        LogContext.MCP_SERVER
      );
    }
    return undefined;
  }

  private errorResult(message: string): McpToolResult {
    return {
      content: [{ type: 'text', text: message }],
      isError: true,
    };
  }
}
