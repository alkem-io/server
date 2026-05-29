import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { McpTool, McpToolDefinition, McpToolResult } from '../dto/mcp.types';

interface AnalyzeWhiteboardArgs {
  whiteboardId: string;
  analysisType?: 'summary' | 'elements' | 'text' | 'structure' | 'semantic';
}

/**
 * Represents an Excalidraw element with typed properties
 */
interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  // Arrow-specific properties
  startBinding?: { elementId: string };
  endBinding?: { elementId: string };
  // Group properties
  groupIds?: string[];
  // Frame properties
  frameId?: string;
}

/**
 * Represents a detected connection between elements
 */
interface ElementConnection {
  fromId: string;
  toId: string;
  fromText?: string;
  toText?: string;
}

/**
 * Represents a spatial cluster of elements
 */
interface SpatialCluster {
  id: string;
  centroid: { x: number; y: number };
  elements: string[];
  texts: string[];
  elementCount: number;
}

/**
 * Tool for analyzing whiteboard content.
 * Extracts and summarizes whiteboard elements, text, and structure.
 */
@Injectable()
export class WhiteboardAnalyzeTool implements McpTool {
  constructor(
    private readonly whiteboardService: WhiteboardService,
    private readonly authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  getDefinition(): McpToolDefinition {
    return {
      name: 'analyze_whiteboard',
      description:
        'Analyze whiteboard visual content to extract text, identify elements, and summarize the collaboration artifact. ' +
        'Use "semantic" analysis for a token-optimized, LLM-ready representation with detected connections and spatial clusters.',
      inputSchema: {
        type: 'object',
        properties: {
          whiteboardId: {
            type: 'string',
            description: 'The ID of the whiteboard to analyze',
          },
          analysisType: {
            type: 'string',
            enum: ['summary', 'elements', 'text', 'structure', 'semantic'],
            description:
              'Type of analysis: summary (statistics), elements (list all), text (extract text), ' +
              'structure (hierarchy), semantic (token-optimized with connections and clusters - recommended for AI)',
          },
        },
        required: ['whiteboardId'],
      },
    };
  }

  async execute(
    args: unknown,
    agentInfo: ActorContext
  ): Promise<McpToolResult> {
    const { whiteboardId, analysisType = 'summary' } =
      args as AnalyzeWhiteboardArgs;

    this.logger.verbose?.(
      `Analyzing whiteboard ${whiteboardId} with type ${analysisType}`,
      LogContext.MCP_SERVER
    );

    // Load whiteboard with authorization
    const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
      whiteboardId,
      {
        relations: {
          authorization: true,
          profile: true,
        },
      }
    );

    // Check authorization
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      whiteboard.authorization,
      AuthorizationPrivilege.READ,
      'Analyze whiteboard'
    );

    // Parse content
    let content: Record<string, unknown> = {};
    try {
      content = JSON.parse(whiteboard.content || '{}');
    } catch {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Failed to parse whiteboard content',
              whiteboardId,
            }),
          },
        ],
        isError: true,
      };
    }

    const elements = (content.elements as Array<Record<string, unknown>>) || [];
    const files = (content.files as Record<string, unknown>) || {};

    let result: Record<string, unknown>;

    switch (analysisType) {
      case 'elements':
        result = this.analyzeElements(elements);
        break;
      case 'text':
        result = this.extractText(elements);
        break;
      case 'structure':
        result = this.analyzeStructure(elements);
        break;
      case 'semantic':
        result = this.analyzeSemanticContent(
          whiteboard,
          elements as unknown as ExcalidrawElement[],
          files
        );
        break;
      case 'summary':
      default:
        result = this.generateSummary(whiteboard, elements, files);
        break;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private generateSummary(
    whiteboard: { profile?: { displayName?: string; description?: string } },
    elements: Array<Record<string, unknown>>,
    files: Record<string, unknown>
  ): Record<string, unknown> {
    const elementTypes = new Map<string, number>();
    let textCount = 0;
    let totalTextLength = 0;

    for (const el of elements) {
      const type = el.type as string;
      elementTypes.set(type, (elementTypes.get(type) || 0) + 1);

      if (type === 'text' && el.text) {
        textCount++;
        totalTextLength += String(el.text).length;
      }
    }

    return {
      profile: {
        displayName: whiteboard.profile?.displayName,
        description: whiteboard.profile?.description,
      },
      statistics: {
        totalElements: elements.length,
        elementTypes: Object.fromEntries(elementTypes),
        textElements: textCount,
        totalTextLength,
        imageCount: Object.keys(files).length,
      },
      hasContent: elements.length > 0,
    };
  }

  private analyzeElements(
    elements: Array<Record<string, unknown>>
  ): Record<string, unknown> {
    return {
      elements: elements.map(el => ({
        id: el.id,
        type: el.type,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        text: el.type === 'text' ? el.text : undefined,
        strokeColor: el.strokeColor,
        backgroundColor: el.backgroundColor,
      })),
      count: elements.length,
    };
  }

  private extractText(
    elements: Array<Record<string, unknown>>
  ): Record<string, unknown> {
    const textElements = elements.filter(el => el.type === 'text' && el.text);

    return {
      textContent: textElements.map(el => ({
        id: el.id,
        text: el.text,
        fontSize: el.fontSize,
        x: el.x,
        y: el.y,
      })),
      allText: textElements.map(el => el.text).join('\n\n'),
      count: textElements.length,
    };
  }

  private analyzeStructure(
    elements: Array<Record<string, unknown>>
  ): Record<string, unknown> {
    // Group elements by type
    const byType: Record<string, unknown[]> = {};
    for (const el of elements) {
      const type = el.type as string;
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push({
        id: el.id,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
      });
    }

    // Calculate bounding box
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const el of elements) {
      const x = (el.x as number) || 0;
      const y = (el.y as number) || 0;
      const w = (el.width as number) || 0;
      const h = (el.height as number) || 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }

    return {
      elementsByType: byType,
      boundingBox:
        elements.length > 0
          ? {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY,
            }
          : null,
      typeCount: Object.keys(byType).length,
    };
  }

  /**
   * Semantic analysis - produces a compact, token-optimized representation
   * suitable for LLM consumption. Includes:
   * - Extracted text content (no positions/styling)
   * - Detected arrow connections between elements
   * - Spatial clustering of related elements
   * - Element type summary
   */
  private analyzeSemanticContent(
    whiteboard: { profile?: { displayName?: string; description?: string } },
    elements: ExcalidrawElement[],
    files: Record<string, unknown>
  ): Record<string, unknown> {
    // Build element lookup for connection resolution
    const elementMap = new Map<string, ExcalidrawElement>();
    for (const el of elements) {
      elementMap.set(el.id, el);
    }

    // Extract all text content (compact, no metadata)
    const texts = this.extractCompactText(elements);

    // Detect arrow connections
    const connections = this.detectConnections(elements, elementMap);

    // Perform spatial clustering
    const clusters = this.clusterElements(elements, elementMap);

    // Build element type summary
    const typeCounts: Record<string, number> = {};
    for (const el of elements) {
      typeCounts[el.type] = (typeCounts[el.type] || 0) + 1;
    }

    // Count images (but don't include base64 data)
    const imageCount = Object.keys(files).length;

    return {
      // Whiteboard metadata
      title: whiteboard.profile?.displayName || 'Untitled',
      description: whiteboard.profile?.description || undefined,

      // All text content as simple array (token-efficient)
      texts,

      // Detected connections (arrows linking elements)
      connections: connections.length > 0 ? connections : undefined,

      // Spatial clusters (groups of nearby elements)
      clusters: clusters.length > 0 ? clusters : undefined,

      // Compact statistics
      stats: {
        elements: elements.length,
        types: typeCounts,
        images: imageCount > 0 ? imageCount : undefined,
        textCount: texts.length,
        connectionCount: connections.length,
        clusterCount: clusters.length,
      },

      // Hint for LLM interpretation
      hint: this.generateInterpretationHint(typeCounts, connections, clusters),
    };
  }

  /**
   * Extract text content without positions, colors, or other metadata
   */
  private extractCompactText(elements: ExcalidrawElement[]): string[] {
    const texts: string[] = [];

    for (const el of elements) {
      if (el.type === 'text' && el.text) {
        const text = el.text.trim();
        if (text) {
          texts.push(text);
        }
      }
    }

    return texts;
  }

  /**
   * Detect connections between elements via arrows
   * Returns semantic connections with text labels where available
   */
  private detectConnections(
    elements: ExcalidrawElement[],
    elementMap: Map<string, ExcalidrawElement>
  ): ElementConnection[] {
    const connections: ElementConnection[] = [];

    for (const el of elements) {
      if (el.type === 'arrow' && el.startBinding && el.endBinding) {
        const fromEl = elementMap.get(el.startBinding.elementId);
        const toEl = elementMap.get(el.endBinding.elementId);

        if (fromEl && toEl) {
          const connection: ElementConnection = {
            fromId: fromEl.id,
            toId: toEl.id,
          };

          // Add text labels if the connected elements are text or contain text
          const fromText = this.getElementText(fromEl, elementMap);
          const toText = this.getElementText(toEl, elementMap);

          if (fromText) connection.fromText = fromText;
          if (toText) connection.toText = toText;

          connections.push(connection);
        }
      }
    }

    return connections;
  }

  /**
   * Get text content of an element or nearby text elements
   */
  private getElementText(
    element: ExcalidrawElement,
    elementMap: Map<string, ExcalidrawElement>
  ): string | undefined {
    // Direct text element
    if (element.type === 'text' && element.text) {
      return element.text.trim();
    }

    // For shapes, look for text elements in the same group
    if (element.groupIds && element.groupIds.length > 0) {
      for (const [, el] of elementMap) {
        if (
          el.type === 'text' &&
          el.text &&
          el.groupIds &&
          el.groupIds.some(g => element.groupIds?.includes(g))
        ) {
          return el.text.trim();
        }
      }
    }

    return undefined;
  }

  /**
   * Cluster elements spatially using a simple grid-based approach
   * Groups elements that are close to each other
   */
  private clusterElements(
    elements: ExcalidrawElement[],
    elementMap: Map<string, ExcalidrawElement>
  ): SpatialCluster[] {
    if (elements.length === 0) return [];

    // Calculate grid cell size based on content spread
    const positions = elements.map(el => ({
      x: el.x + (el.width || 0) / 2,
      y: el.y + (el.height || 0) / 2,
      el,
    }));

    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxY = Math.max(...positions.map(p => p.y));

    const width = maxX - minX;
    const height = maxY - minY;

    // If content is very small or single element, no meaningful clusters
    if (elements.length < 3 || (width < 100 && height < 100)) {
      return [];
    }

    // Use grid-based clustering with adaptive cell size
    // Target ~4-6 cells across the widest dimension
    const cellSize = Math.max(width, height) / 5;

    const grid = new Map<string, ExcalidrawElement[]>();

    for (const { x, y, el } of positions) {
      const cellX = Math.floor((x - minX) / cellSize);
      const cellY = Math.floor((y - minY) / cellSize);
      const key = `${cellX},${cellY}`;

      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(el);
    }

    // Convert grid cells to clusters, filtering out single-element cells
    const clusters: SpatialCluster[] = [];
    let clusterId = 0;

    for (const [key, cellElements] of grid) {
      if (cellElements.length >= 2) {
        const [cellX, cellY] = key.split(',').map(Number);
        const centroidX = minX + (cellX + 0.5) * cellSize;
        const centroidY = minY + (cellY + 0.5) * cellSize;

        // Collect text from cluster elements
        const texts: string[] = [];
        for (const el of cellElements) {
          const text = this.getElementText(el, elementMap);
          if (text) {
            texts.push(text);
          }
        }

        clusters.push({
          id: `cluster_${clusterId++}`,
          centroid: { x: Math.round(centroidX), y: Math.round(centroidY) },
          elements: cellElements.map(el => el.id),
          texts,
          elementCount: cellElements.length,
        });
      }
    }

    // Sort clusters by element count (most significant first)
    clusters.sort((a, b) => b.elementCount - a.elementCount);

    // Limit to top 10 clusters
    return clusters.slice(0, 10);
  }

  /**
   * Generate a hint for LLM interpretation based on whiteboard content
   */
  private generateInterpretationHint(
    typeCounts: Record<string, number>,
    connections: ElementConnection[],
    clusters: SpatialCluster[]
  ): string {
    const hints: string[] = [];

    // Detect diagram type based on elements
    if (connections.length > 2) {
      if (typeCounts['rectangle'] && typeCounts['arrow']) {
        hints.push('flowchart or process diagram');
      } else {
        hints.push('connected diagram');
      }
    }

    if (typeCounts['ellipse'] && connections.length > 0) {
      hints.push('possibly mind map or relationship diagram');
    }

    if (clusters.length > 3) {
      hints.push('grouped content areas');
    }

    if (typeCounts['freedraw'] || typeCounts['line']) {
      hints.push('hand-drawn elements');
    }

    if (typeCounts['image']) {
      hints.push('contains images');
    }

    if (hints.length === 0) {
      if (typeCounts['text'] > 5) {
        hints.push('text-heavy content');
      } else {
        hints.push('visual collaboration artifact');
      }
    }

    return hints.join(', ');
  }
}
