import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { TemplateType } from '@common/enums/template.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ITemplate } from '@domain/template/template/template.interface';
import { TemplateService } from '@domain/template/template/template.service';
import { InnovationPack } from '@library/innovation-pack/innovation.pack.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { McpTool, McpToolDefinition, McpToolResult } from '../dto/mcp.types';

/**
 * Output mode for template listing
 */
type OutputMode = 'summary' | 'detailed' | 'semantic';

interface TemplateNavigatorArgs {
  action: 'list' | 'search' | 'details';
  templateType?: string;
  searchQuery?: string;
  templateId?: string;
  innovationPackId?: string;
  outputMode?: OutputMode;
  limit?: number;
}

/**
 * Compact template representation
 */
interface CompactTemplate {
  id: string;
  nameID: string;
  type: TemplateType;
  displayName: string;
  description?: string;
  tags?: string[];
  innovationPack?: {
    id: string;
    name: string;
  };
}

/**
 * Innovation pack summary
 */
interface InnovationPackSummary {
  id: string;
  nameID: string;
  displayName: string;
  description?: string;
  templateCounts: Record<string, number>;
  totalTemplates: number;
}

/**
 * Tool for navigating and discovering templates across innovation packs.
 * Helps users find relevant templates for spaces, callouts, whiteboards, etc.
 */
@Injectable()
export class TemplateNavigatorTool implements McpTool {
  constructor(
    @InjectRepository(InnovationPack)
    private readonly innovationPackRepository: Repository<InnovationPack>,
    private readonly templateService: TemplateService,
    private readonly authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getDefinition(): McpToolDefinition {
    return {
      name: 'navigate_templates',
      description:
        'Navigate and discover templates across innovation packs. ' +
        'Find templates for spaces, callouts, whiteboards, posts, and community guidelines. ' +
        'Actions: "list" shows available templates, "search" finds templates by name/tags, ' +
        '"details" shows information about a specific template (metadata only — for a whiteboard ' +
        'template it reports an element count, NOT the scene). ' +
        'To APPLY a whiteboard template to a board, call update_whiteboard_content with ' +
        '`fromTemplateId` set to the template id — the server applies the scene by reference. ' +
        'Never fetch or pass the scene JSON yourself.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['list', 'search', 'details'],
            description:
              'Action to perform: "list" templates, "search" by query, or get "details" of a template. ' +
              'To apply a whiteboard template, call update_whiteboard_content with fromTemplateId — do not pass a scene.',
          },
          templateType: {
            type: 'string',
            enum: [
              'space',
              'callout',
              'whiteboard',
              'post',
              'community-guidelines',
            ],
            description:
              'Filter by template type. Optional for list/search actions.',
          },
          searchQuery: {
            type: 'string',
            description:
              'Search query for finding templates by name, description, or tags. Required for "search" action.',
          },
          templateId: {
            type: 'string',
            description:
              'Template ID to get details for. Required for "details" action.',
          },
          innovationPackId: {
            type: 'string',
            description:
              'Filter templates by a specific innovation pack ID. Optional.',
          },
          outputMode: {
            type: 'string',
            enum: ['summary', 'detailed', 'semantic'],
            description:
              'Output format: "summary" (counts and names), "detailed" (full info), ' +
              '"semantic" (token-optimized for LLM). Default: summary',
          },
          limit: {
            type: 'number',
            description:
              'Maximum number of templates to return (default: 20, max: 50)',
          },
        },
        required: ['action'],
      },
    };
  }

  async execute(
    args: unknown,
    agentInfo: ActorContext
  ): Promise<McpToolResult> {
    const {
      action,
      templateType,
      searchQuery,
      templateId,
      innovationPackId,
      outputMode = 'summary',
      limit = 20,
    } = args as TemplateNavigatorArgs;

    const effectiveLimit = Math.min(Math.max(1, limit), 50);

    this.logger.verbose?.(
      `Template navigator: action=${action}, type=${templateType}, query=${searchQuery}, user=${agentInfo.actorID || 'anonymous'}`,
      LogContext.MCP_SERVER
    );

    try {
      switch (action) {
        case 'list':
          return await this.listTemplates(
            agentInfo,
            templateType,
            innovationPackId,
            outputMode,
            effectiveLimit
          );

        case 'search':
          if (!searchQuery) {
            return this.errorResult(
              'Search query is required for search action'
            );
          }
          return await this.searchTemplates(
            agentInfo,
            searchQuery,
            templateType,
            outputMode,
            effectiveLimit
          );

        case 'details':
          if (!templateId) {
            return this.errorResult(
              'Template ID is required for details action'
            );
          }
          return await this.getTemplateDetails(agentInfo, templateId);

        default:
          return this.errorResult(
            `Unknown action: ${action}. Use "list", "search", or "details".`
          );
      }
    } catch (error) {
      this.logger.error?.(
        `Template navigator error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
        LogContext.MCP_SERVER
      );

      return this.errorResult(
        error instanceof Error ? error.message : 'Failed to navigate templates'
      );
    }
  }

  /**
   * List available templates from accessible innovation packs
   */
  private async listTemplates(
    agentInfo: ActorContext,
    templateType: string | undefined,
    innovationPackId: string | undefined,
    outputMode: OutputMode,
    limit: number
  ): Promise<McpToolResult> {
    // Get accessible innovation packs
    const packs = await this.getAccessibleInnovationPacks(
      agentInfo,
      innovationPackId
    );

    if (packs.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              message: 'No accessible innovation packs found.',
              hint: 'Innovation packs contain reusable templates for spaces, callouts, and more.',
            }),
          },
        ],
      };
    }

    // Parse template type filter
    const typeFilter = templateType
      ? this.parseTemplateType(templateType)
      : undefined;

    // Collect templates from all packs
    const allTemplates: Array<CompactTemplate> = [];
    const packSummaries: InnovationPackSummary[] = [];

    for (const pack of packs) {
      if (!pack.templatesSet) continue;

      const templates = await this.templateService.getTemplatesInTemplatesSet(
        pack.templatesSet.id
      );

      // Count by type
      const typeCounts: Record<string, number> = {};
      for (const template of templates) {
        typeCounts[template.type] = (typeCounts[template.type] || 0) + 1;
      }

      packSummaries.push({
        id: pack.id,
        nameID: pack.nameID,
        displayName: pack.profile?.displayName || pack.nameID,
        description: pack.profile?.description,
        templateCounts: typeCounts,
        totalTemplates: templates.length,
      });

      // Filter and add templates
      const filteredTemplates = typeFilter
        ? templates.filter(t => t.type === typeFilter)
        : templates;

      for (const template of filteredTemplates) {
        if (allTemplates.length >= limit) break;

        allTemplates.push(this.toCompactTemplate(template, pack));
      }

      if (allTemplates.length >= limit) break;
    }

    // Format output based on mode
    let result: Record<string, unknown>;

    switch (outputMode) {
      case 'detailed':
        result = this.formatDetailedOutput(allTemplates, packSummaries);
        break;
      case 'semantic':
        result = this.formatSemanticOutput(
          allTemplates,
          packSummaries,
          typeFilter
        );
        break;
      case 'summary':
      default:
        result = this.formatSummaryOutput(
          allTemplates,
          packSummaries,
          typeFilter
        );
        break;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  }

  /**
   * Search templates by name, description, or tags
   */
  private async searchTemplates(
    agentInfo: ActorContext,
    query: string,
    templateType: string | undefined,
    outputMode: OutputMode,
    limit: number
  ): Promise<McpToolResult> {
    const packs = await this.getAccessibleInnovationPacks(agentInfo);
    const typeFilter = templateType
      ? this.parseTemplateType(templateType)
      : undefined;
    const queryLower = query.toLowerCase();

    const matchingTemplates: Array<CompactTemplate & { matchScore: number }> =
      [];

    for (const pack of packs) {
      if (!pack.templatesSet) continue;

      const templates = await this.templateService.getTemplatesInTemplatesSet(
        pack.templatesSet.id
      );

      for (const template of templates) {
        // Apply type filter
        if (typeFilter && template.type !== typeFilter) continue;

        // Calculate match score
        const score = this.calculateMatchScore(template, queryLower);
        if (score > 0) {
          matchingTemplates.push({
            ...this.toCompactTemplate(template, pack),
            matchScore: score,
          });
        }
      }
    }

    // Sort by match score and limit
    matchingTemplates.sort((a, b) => b.matchScore - a.matchScore);
    const topResults = matchingTemplates.slice(0, limit);

    const result: Record<string, unknown> = {
      query,
      templateType: typeFilter,
      totalMatches: matchingTemplates.length,
      results: topResults.map(({ matchScore, ...t }) => t),
    };

    if (outputMode === 'semantic') {
      result.interpretation = this.generateSearchHints(topResults, query);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  }

  /**
   * Get detailed information about a specific template
   */
  private async getTemplateDetails(
    agentInfo: ActorContext,
    templateId: string
  ): Promise<McpToolResult> {
    const template = await this.templateService.getTemplateOrFail(templateId, {
      relations: {
        profile: {
          tagsets: true,
        },
        templatesSet: true,
      },
    });

    // Check authorization
    if (template.authorization) {
      const hasAccess = this.authorizationService.isAccessGranted(
        agentInfo,
        template.authorization,
        AuthorizationPrivilege.READ
      );
      if (!hasAccess) {
        return this.errorResult('You do not have access to this template');
      }
    }

    // Get type-specific content summary
    const contentSummary = await this.getTemplateContentSummary(template);

    // Find the innovation pack
    let innovationPackInfo: { id: string; name: string } | undefined;
    if (template.templatesSet) {
      const pack = await this.innovationPackRepository.findOne({
        where: { templatesSet: { id: template.templatesSet.id } },
        relations: { profile: true },
      });
      if (pack) {
        innovationPackInfo = {
          id: pack.id,
          name: pack.profile?.displayName || pack.nameID,
        };
      }
    }

    const tags =
      template.profile?.tagsets?.find(t => t.name === 'default')?.tags || [];

    const result = {
      id: template.id,
      nameID: template.nameID,
      type: template.type,
      displayName: template.profile?.displayName,
      description: template.profile?.description,
      tags,
      innovationPack: innovationPackInfo,
      content: contentSummary,
      usage: this.getUsageHints(template.type),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  }

  /**
   * Get accessible innovation packs for the user
   */
  private async getAccessibleInnovationPacks(
    agentInfo: ActorContext,
    specificPackId?: string
  ): Promise<InnovationPack[]> {
    const queryBuilder = this.innovationPackRepository
      .createQueryBuilder('pack')
      .leftJoinAndSelect('pack.authorization', 'authorization')
      .leftJoinAndSelect('pack.profile', 'profile')
      .leftJoinAndSelect('profile.tagsets', 'tagsets')
      .leftJoinAndSelect('pack.templatesSet', 'templatesSet')
      .where('pack.listedInStore = :listed', { listed: true });

    if (specificPackId) {
      queryBuilder.andWhere('pack.id = :packId', { packId: specificPackId });
    }

    const allPacks = await queryBuilder.getMany();

    // Filter by authorization
    const accessiblePacks: InnovationPack[] = [];
    for (const pack of allPacks) {
      if (!pack.authorization) {
        accessiblePacks.push(pack);
        continue;
      }

      try {
        const hasAccess = this.authorizationService.isAccessGranted(
          agentInfo,
          pack.authorization,
          AuthorizationPrivilege.READ
        );
        if (hasAccess) {
          accessiblePacks.push(pack);
        }
      } catch {
        // No access
      }
    }

    return accessiblePacks;
  }

  /**
   * Parse template type string to enum
   */
  private parseTemplateType(type: string): TemplateType | undefined {
    const typeMap: Record<string, TemplateType> = {
      space: TemplateType.SPACE,
      callout: TemplateType.CALLOUT,
      whiteboard: TemplateType.WHITEBOARD,
      post: TemplateType.POST,
      'community-guidelines': TemplateType.COMMUNITY_GUIDELINES,
    };
    return typeMap[type.toLowerCase()];
  }

  /**
   * Convert template to compact representation
   */
  private toCompactTemplate(
    template: ITemplate,
    pack: InnovationPack
  ): CompactTemplate {
    const tags =
      template.profile?.tagsets?.find(t => t.name === 'default')?.tags || [];

    return {
      id: template.id,
      nameID: template.nameID,
      type: template.type,
      displayName: template.profile?.displayName || template.nameID,
      description: template.profile?.description,
      tags,
      innovationPack: {
        id: pack.id,
        name: pack.profile?.displayName || pack.nameID,
      },
    };
  }

  /**
   * Calculate search match score
   */
  private calculateMatchScore(template: ITemplate, query: string): number {
    let score = 0;
    const name = template.profile?.displayName?.toLowerCase() || '';
    const description = template.profile?.description?.toLowerCase() || '';
    const tags =
      template.profile?.tagsets
        ?.find(t => t.name === 'default')
        ?.tags?.map(t => t.toLowerCase()) || [];

    // Exact name match
    if (name === query) score += 100;
    // Name contains query
    else if (name.includes(query)) score += 50;

    // Description contains query
    if (description.includes(query)) score += 20;

    // Tag match
    for (const tag of tags) {
      if (tag === query) score += 30;
      else if (tag.includes(query)) score += 15;
    }

    // Type match
    if (template.type.toLowerCase().includes(query)) score += 10;

    return score;
  }

  /**
   * Format summary output
   */
  private formatSummaryOutput(
    templates: CompactTemplate[],
    packSummaries: InnovationPackSummary[],
    typeFilter?: TemplateType
  ): Record<string, unknown> {
    // Aggregate counts
    const typeCounts: Record<string, number> = {};
    for (const t of templates) {
      typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
    }

    return {
      filter: typeFilter ? { type: typeFilter } : 'all',
      summary: {
        totalTemplates: templates.length,
        innovationPacks: packSummaries.length,
        byType: typeCounts,
      },
      innovationPacks: packSummaries.map(p => ({
        name: p.displayName,
        id: p.id,
        templates: p.totalTemplates,
        types: p.templateCounts,
      })),
      templates: templates.map(t => ({
        id: t.id,
        name: t.displayName,
        type: t.type,
        pack: t.innovationPack?.name,
      })),
    };
  }

  /**
   * Format detailed output
   */
  private formatDetailedOutput(
    templates: CompactTemplate[],
    packSummaries: InnovationPackSummary[]
  ): Record<string, unknown> {
    return {
      totalTemplates: templates.length,
      innovationPacks: packSummaries,
      templates: templates.map(t => ({
        ...t,
        description: t.description?.slice(0, 200),
      })),
    };
  }

  /**
   * Format semantic (token-optimized) output
   */
  private formatSemanticOutput(
    templates: CompactTemplate[],
    packSummaries: InnovationPackSummary[],
    typeFilter?: TemplateType
  ): Record<string, unknown> {
    // Group by type for efficient LLM processing
    const byType: Record<
      string,
      Array<{ name: string; id: string; tags: string[] }>
    > = {};
    for (const t of templates) {
      if (!byType[t.type]) byType[t.type] = [];
      byType[t.type].push({
        name: t.displayName,
        id: t.id,
        tags: t.tags || [],
      });
    }

    // Collect all unique tags
    const allTags = new Set<string>();
    for (const t of templates) {
      t.tags?.forEach(tag => allTags.add(tag));
    }

    return {
      stats: {
        templates: templates.length,
        packs: packSummaries.length,
        filter: typeFilter || 'all',
      },
      interpretation: [
        `Found ${templates.length} templates across ${packSummaries.length} innovation packs`,
        typeFilter
          ? `Filtered to ${typeFilter} templates only`
          : 'Showing all template types',
        allTags.size > 0
          ? `Common tags: ${Array.from(allTags).slice(0, 10).join(', ')}`
          : '',
      ].filter(Boolean),
      byType,
      packs: packSummaries.map(p => `${p.displayName} (${p.totalTemplates})`),
    };
  }

  /**
   * Get template content summary based on type
   */
  private async getTemplateContentSummary(
    template: ITemplate
  ): Promise<Record<string, unknown>> {
    switch (template.type) {
      case TemplateType.POST:
        return {
          type: 'post',
          hasDefaultDescription: !!template.postDefaultDescription,
          defaultDescriptionPreview: template.postDefaultDescription?.slice(
            0,
            100
          ),
        };

      case TemplateType.WHITEBOARD:
        try {
          const whiteboard = await this.templateService.getWhiteboard(
            template.id
          );
          const summary: Record<string, unknown> = {
            type: 'whiteboard',
            hasContent: !!whiteboard.content,
          };
          // Surface only COMPACT metadata — never the scene itself. The Excalidraw
          // scene can be tens-to-hundreds of KB; routing it through the model (in
          // here, then back out as update_whiteboard_content's `content`) stalls the
          // turn. To APPLY this template, the model calls update_whiteboard_content
          // with `fromTemplateId` and the server applies the scene by reference —
          // the scene never touches the model.
          if (whiteboard.content) {
            try {
              const scene = JSON.parse(whiteboard.content);
              if (scene && Array.isArray(scene.elements)) {
                summary.elementCount = scene.elements.length;
              }
            } catch (sceneError) {
              this.logger.warn?.(
                `navigate_templates details: could not parse whiteboard scene for template ${template.id}: ${sceneError instanceof Error ? sceneError.message : 'unknown error'}`,
                LogContext.MCP_SERVER
              );
            }
          }
          summary.applyHint =
            'To apply this template to a whiteboard, call update_whiteboard_content with fromTemplateId set to this template id. Do not fetch or pass the scene yourself.';
          return summary;
        } catch {
          return { type: 'whiteboard', hasContent: false };
        }

      case TemplateType.CALLOUT:
        try {
          const callout = await this.templateService.getCallout(template.id);
          return {
            type: 'callout',
            nameID: callout.nameID,
            hasFraming: !!callout.framing,
            hasSettings: !!callout.settings,
          };
        } catch {
          return { type: 'callout' };
        }

      case TemplateType.SPACE:
        try {
          const contentSpace =
            await this.templateService.getTemplateContentSpace(template.id);
          return {
            type: 'space',
            hasCollaboration: !!contentSpace.collaboration,
            level: contentSpace.level,
          };
        } catch {
          return { type: 'space' };
        }

      case TemplateType.COMMUNITY_GUIDELINES:
        try {
          const guidelines = await this.templateService.getCommunityGuidelines(
            template.id
          );
          return {
            type: 'community-guidelines',
            hasGuidelines: !!guidelines,
          };
        } catch {
          return { type: 'community-guidelines' };
        }

      default:
        return { type: template.type };
    }
  }

  /**
   * Get usage hints for template type
   */
  private getUsageHints(type: TemplateType): string {
    const hints: Record<TemplateType, string> = {
      [TemplateType.SPACE]:
        'Use this template when creating a new space to get a pre-configured collaboration structure.',
      [TemplateType.CALLOUT]:
        'Apply this template to create a new callout for gathering contributions or discussions.',
      [TemplateType.WHITEBOARD]:
        'Use this template to create a new whiteboard with pre-defined visual elements.',
      [TemplateType.POST]:
        'Apply this template when creating posts to get consistent formatting and structure.',
      [TemplateType.COMMUNITY_GUIDELINES]:
        'Use this template to set up community guidelines for your space.',
    };
    return hints[type] || 'Apply this template to create new content.';
  }

  /**
   * Generate search interpretation hints
   */
  private generateSearchHints(
    results: Array<CompactTemplate & { matchScore: number }>,
    query: string
  ): string[] {
    const hints: string[] = [];

    if (results.length === 0) {
      hints.push(`No templates found matching "${query}"`);
      hints.push(
        'Try a broader search term or browse all templates with action="list"'
      );
    } else {
      hints.push(`Found ${results.length} templates matching "${query}"`);

      // Type distribution
      const types = new Set(results.map(r => r.type));
      hints.push(`Template types: ${Array.from(types).join(', ')}`);

      // Best match
      if (results[0]) {
        hints.push(
          `Best match: ${results[0].displayName} (${results[0].type})`
        );
      }
    }

    return hints;
  }

  /**
   * Create error result
   */
  private errorResult(message: string): McpToolResult {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: message }),
        },
      ],
      isError: true,
    };
  }
}
