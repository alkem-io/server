import { AuditLogAnalyzeTool } from './audit-log-analyze.tool';
import { CommunityActivitySummaryTool } from './community-activity-summary.tool';
import { ContributionsAnalyzeTool } from './contributions-analyze.tool';
import { CreateWhiteboardTool } from './create-whiteboard.tool';
import { CreateWhiteboardInSpaceTool } from './create-whiteboard-in-space.tool';
import { EditWhiteboardElementsTool } from './edit-whiteboard-elements.tool';
import { SearchContentTool } from './search-content.tool';
import { TemplateNavigatorTool } from './template-navigator.tool';
import { WhiteboardAnalyzeTool } from './whiteboard-analyze.tool';
import { WhiteboardListTool } from './whiteboard-list.tool';

/**
 * Single source of truth for the MCP tool set. Each entry is registered as a
 * provider AND injected into the MCP_TOOL aggregator factory in
 * `mcp-server.module.ts` — so adding a tool is a one-line edit here, with no
 * register() call or constructor wiring to keep in sync.
 *
 * Kept in its own module (not inline in `mcp-server.module.ts`) so the frozen
 * capability-classification parity test can read the ACTUAL registered tool
 * surface from this list — the forcing function that fails CI if a tool is
 * registered without a classification entry, or classified without being
 * registered.
 */
export const TOOL_PROVIDERS = [
  WhiteboardAnalyzeTool,
  WhiteboardListTool,
  ContributionsAnalyzeTool,
  CommunityActivitySummaryTool,
  TemplateNavigatorTool,
  AuditLogAnalyzeTool,
  CreateWhiteboardTool,
  CreateWhiteboardInSpaceTool,
  EditWhiteboardElementsTool,
  SearchContentTool,
] as const;
