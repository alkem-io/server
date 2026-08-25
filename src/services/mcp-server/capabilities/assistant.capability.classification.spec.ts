import { vi } from 'vitest';
import { McpTool } from '../dto/mcp.types';
import { TOOL_PROVIDERS } from '../tools/tool.providers';
import {
  ASSISTANT_CAPABILITY_CLASSIFICATION,
  classifyCapability,
  getReadOnlyDefaultCapabilityToggles,
  UNKNOWN_TOOL_KIND,
} from './assistant.capability.classification';
import { AssistantCapabilityKind } from './assistant.capability.kind';
import { AssistantCapabilityResolverQueries } from './assistant.capability.resolver.queries';

/**
 * The canonical FROZEN v1 classification table from
 * contracts/assistant-authority.md §1. This fixture is the contract — the
 * server resolver and assistant-service's classify.py BOTH test against it
 * (the two-sided parity guard). Keep this in lock-step with the contract.
 */
const CONTRACT_TABLE: Record<string, AssistantCapabilityKind> = {
  create_whiteboard: AssistantCapabilityKind.WRITE_ADDITIVE,
  create_whiteboard_in_space: AssistantCapabilityKind.WRITE_ADDITIVE,
  edit_whiteboard_elements: AssistantCapabilityKind.WRITE_ADDITIVE,
  search_content: AssistantCapabilityKind.READ,
  list_whiteboards: AssistantCapabilityKind.READ,
  analyze_whiteboard: AssistantCapabilityKind.READ,
  analyze_contributions: AssistantCapabilityKind.READ,
  analyze_audit_log: AssistantCapabilityKind.READ,
  community_activity_summary: AssistantCapabilityKind.READ,
  navigate_templates: AssistantCapabilityKind.READ,
};

describe('Assistant capability classification (T023a — parity guard)', () => {
  it('classifies each current tool exactly as the frozen contract table', () => {
    for (const [tool, kind] of Object.entries(CONTRACT_TABLE)) {
      expect(classifyCapability(tool)).toBe(kind);
    }
  });

  it('the local map equals the frozen contract table (no extra/missing tools)', () => {
    expect(ASSISTANT_CAPABILITY_CLASSIFICATION).toEqual(CONTRACT_TABLE);
  });

  it('classifies the explicit whiteboard writes as WRITE_*', () => {
    expect(classifyCapability('create_whiteboard')).toBe(
      AssistantCapabilityKind.WRITE_ADDITIVE
    );
    expect(classifyCapability('create_whiteboard_in_space')).toBe(
      AssistantCapabilityKind.WRITE_ADDITIVE
    );
    expect(classifyCapability('edit_whiteboard_elements')).toBe(
      AssistantCapabilityKind.WRITE_ADDITIVE
    );
  });

  it('FAIL-SAFE: a tool absent from the map enumerates as WRITE_* (⇒ disabled by default)', () => {
    const kind = classifyCapability('some_brand_new_tool');
    expect(kind).toBe(UNKNOWN_TOOL_KIND);
    expect([
      AssistantCapabilityKind.WRITE_ADDITIVE,
      AssistantCapabilityKind.WRITE_DESTRUCTIVE,
    ]).toContain(kind);
    expect(kind).not.toBe(AssistantCapabilityKind.READ);
  });

  it('platformCapabilities resolver assigns each registry tool the frozen contract kind', () => {
    const toolRegistry = {
      listTools: vi.fn().mockReturnValue([
        ...Object.keys(CONTRACT_TABLE).map(name => ({
          name,
          description: `desc ${name}`,
          inputSchema: { type: 'object', properties: {} },
        })),
        // a tool not in the frozen map ⇒ must enumerate as WRITE_* (fail-safe).
        {
          name: 'some_brand_new_tool',
          description: 'desc',
          inputSchema: { type: 'object', properties: {} },
        },
      ]),
    };
    const resolver = new AssistantCapabilityResolverQueries(
      toolRegistry as any
    );

    const byName = new Map(
      resolver.platformCapabilities().map(c => [c.name, c.kind])
    );
    for (const [tool, kind] of Object.entries(CONTRACT_TABLE)) {
      expect(byName.get(tool)).toBe(kind);
    }
    expect(byName.get('some_brand_new_tool')).not.toBe(
      AssistantCapabilityKind.READ
    );
  });
});

describe('Read-only default toggles (T023)', () => {
  it('yields read-only: every READ enabled, every WRITE_* disabled', () => {
    const toggles = getReadOnlyDefaultCapabilityToggles();
    const byName = new Map(toggles.map(t => [t.capability, t.enabled]));

    for (const [tool, kind] of Object.entries(CONTRACT_TABLE)) {
      const expectedEnabled = kind === AssistantCapabilityKind.READ;
      expect(byName.get(tool)).toBe(expectedEnabled);
    }
    // The explicit writes are present and disabled.
    expect(byName.get('create_whiteboard')).toBe(false);
    expect(byName.get('edit_whiteboard_elements')).toBe(false);
  });

  it('a freshly-added WRITE_* capability defaults disabled for an existing user (absent ⇒ disabled)', () => {
    const toggles = getReadOnlyDefaultCapabilityToggles();
    const names = toggles.map(t => t.capability);
    // An unclassified tool is not in the default set at all → disabled by
    // absence in the user grant, and would classify as WRITE_* if enumerated.
    expect(names).not.toContain('some_brand_new_tool');
    expect(classifyCapability('some_brand_new_tool')).not.toBe(
      AssistantCapabilityKind.READ
    );
  });
});

describe('Classification map ⇄ registered tool surface parity (forcing function)', () => {
  // The ACTUAL registered tool surface, read from the module's single source of
  // truth (`TOOL_PROVIDERS`) via each tool's own `getDefinition()` — never a
  // hand-maintained list. `getDefinition()` returns a static literal with no
  // `this` dependency, so a bare instantiation is enough to read the published
  // name. This is the forcing function that keeps the frozen classification map
  // honest: it fails CI the moment a tool is registered without a classification
  // entry, or a classification key names a tool that is no longer registered
  // (e.g. the retired `update_whiteboard_content`).
  const registeredToolNames = TOOL_PROVIDERS.map(
    Provider =>
      new (Provider as unknown as new () => McpTool)().getDefinition().name
  );

  it('every registered tool has a classification entry (no unclassified registered tool)', () => {
    const classified = new Set(
      Object.keys(ASSISTANT_CAPABILITY_CLASSIFICATION)
    );
    const missing = registeredToolNames.filter(name => !classified.has(name));
    expect(missing).toEqual([]);
  });

  it('every classification key is a real registered tool (no phantom/retired classification)', () => {
    const registered = new Set(registeredToolNames);
    const phantom = Object.keys(ASSISTANT_CAPABILITY_CLASSIFICATION).filter(
      name => !registered.has(name)
    );
    expect(phantom).toEqual([]);
  });
});
