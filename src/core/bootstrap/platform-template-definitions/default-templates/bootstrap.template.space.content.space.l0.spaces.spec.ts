import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import {
  bootstrapTemplateSpaceContentSpaceL0,
  FlowState,
} from './bootstrap.template.space.content.space.l0';

// Structural verification for the SPACES callout on the platform default L0
// space template (workspace#013-spaces-collection-callout, US1 T008a / US3 T012).
// The callout must serialize its framing TYPE ONLY — config-free, with no
// hardcoded subspace IDs — so a space created from this template gets a SPACES
// callout that self-populates from the NEW space's own subspaces.
describe('bootstrapTemplateSpaceContentSpaceL0 — SPACES callout', () => {
  const spacesCallout =
    bootstrapTemplateSpaceContentSpaceL0.collaborationData?.calloutsSetData?.calloutsData?.find(
      c => c.framing?.type === CalloutFramingType.SPACES
    );

  it('includes a SPACES callout on the default L0 template', () => {
    expect(spacesCallout).toBeDefined();
  });

  it('is classified onto the Subspaces flow-state tab', () => {
    const flowStateTagset = spacesCallout?.classification?.tagsets?.find(
      t => t.name === TagsetReservedName.FLOW_STATE
    );
    expect(flowStateTagset?.tags).toContain(FlowState.SUBSPACES);
  });

  it('renders first on the Subspaces tab (sortOrder 1)', () => {
    expect(spacesCallout?.sortOrder).toBe(1);
  });

  it('uses the "Subspaces" framing profile displayName (preserve the block name)', () => {
    expect(spacesCallout?.framing?.profile?.displayName).toBe('Subspaces');
  });

  it('is CONFIG-FREE — no settings block, no subspace IDs serialized', () => {
    // The whole point of 013: nothing but the framing type (and profile name)
    // serializes. No contributors config, no counts, no view, and — critically —
    // no hardcoded subspace IDs, so instantiation self-populates.
    expect((spacesCallout as any)?.settings).toBeUndefined();
    const serialized = JSON.stringify(spacesCallout);
    expect(serialized).not.toContain('contributors');
    expect(serialized).not.toContain('defaultView');
  });
});
