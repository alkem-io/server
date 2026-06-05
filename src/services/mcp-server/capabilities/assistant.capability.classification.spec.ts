import { vi } from 'vitest';
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
  update_whiteboard_content: AssistantCapabilityKind.WRITE_DESTRUCTIVE,
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

  it('classifies the two explicit writes as WRITE_*', () => {
    expect(classifyCapability('create_whiteboard')).toBe(
      AssistantCapabilityKind.WRITE_ADDITIVE
    );
    expect(classifyCapability('update_whiteboard_content')).toBe(
      AssistantCapabilityKind.WRITE_DESTRUCTIVE
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
    // The two writes are present and disabled.
    expect(byName.get('create_whiteboard')).toBe(false);
    expect(byName.get('update_whiteboard_content')).toBe(false);
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
