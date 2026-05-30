import { LogContext } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { SearchInput } from '@services/api/search/dto/inputs';
import { ISearchResults } from '@services/api/search/dto/results';
import { SearchCategory } from '@services/api/search/search.category';
import { SearchService } from '@services/api/search/search.service';
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
  whiteboard?: { id: string; profile?: { displayName?: string } };
  post?: { id: string; profile?: { displayName?: string } };
  memo?: { id: string; profile?: { displayName?: string } };
  callout?: { id: string; framing?: { profile?: { displayName?: string } } };
  space?: { id: string; about?: { profile?: { displayName?: string } } };
  user?: { id: string; profile?: { displayName?: string } };
  organization?: { id: string; profile?: { displayName?: string } };
}

const URI_TYPE_PATH: Record<string, string> = {
  whiteboard: 'whiteboards',
  post: 'posts',
  callout: 'callouts',
  space: 'spaces',
  subspace: 'spaces',
};

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
 * with no ES it returns no results.
 *
 * This is a discovery tool: use it to find a candidate id, confirm the right
 * one, then act with analyze_whiteboard / update_whiteboard_content / etc.
 */
@Injectable()
export class SearchContentTool implements McpTool {
  constructor(
    private readonly searchService: SearchService,
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
            description: 'Maximum results per category (default: 10, max: 25).',
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
    const { query, limit = 10 } = args as SearchContentArgs;

    if (!query || !query.trim()) {
      return this.errorResult('A non-empty "query" is required.');
    }

    const terms = query.trim().split(/\s+/).slice(0, 5);
    const size = Math.min(Math.max(1, Math.floor(limit)), 25);
    const filters = Object.values(SearchCategory).map(category => ({
      category,
      size,
    }));

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

    const matches = groups
      .flatMap(group => group?.results ?? [])
      .map(r => this.toMatch(r as unknown as LooseSearchResult))
      .sort((a, b) => b.score - a.score);

    const result = {
      query,
      terms,
      totalMatches: matches.length,
      matches,
      note: matches.length
        ? 'Confirm the intended entity by id before acting on it.'
        : 'No matches. Note: whiteboard scene text is not indexed, and search requires Elasticsearch to be configured.',
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  private toMatch(r: LooseSearchResult): {
    type: string;
    id: string;
    displayName?: string;
    score: number;
    spaceId?: string;
    calloutId?: string;
    uri?: string;
  } {
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

    const path = URI_TYPE_PATH[r.type];
    return {
      type: r.type,
      id: entityId,
      displayName,
      score: r.score,
      spaceId: r.space?.id,
      calloutId: r.callout?.id,
      uri: path ? `alkemio://${path}/${entityId}` : undefined,
    };
  }

  private errorResult(message: string): McpToolResult {
    return {
      content: [{ type: 'text', text: message }],
      isError: true,
    };
  }
}
