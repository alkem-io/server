import { describe, expect, it } from 'vitest';
import {
  buildClassificationEntryService,
  makeClassificationTemplate,
  makeSpaceAbout,
} from './classification.entry.test-helpers';

// S-17 / FR-009 / SC-003 — the feature's headline invariant. There is no FK
// from ClassificationEntry back to any template (C-2/R-1), so this is a
// structural check, not a policy one: mutating the source template object
// AFTER the copy must never reach the already-created entry.
describe('Snapshot independence — S-17, FR-009, SC-003', () => {
  it('renaming the source template after add leaves the entry displayLabel unchanged', async () => {
    const { service, templateRepository } = buildClassificationEntryService();
    const template = makeClassificationTemplate({ displayName: 'SDGs' });
    templateRepository.findOne.mockResolvedValue(template);

    const entry = await service.addFromTemplate(makeSpaceAbout(), 'template-1');
    expect(entry.displayLabel).toEqual('SDGs');

    // Simulate a later template rename.
    template.profile.displayName = 'Sustainable Development Goals (renamed)';

    expect(entry.displayLabel).toEqual('SDGs');
  });

  it("editing the source template's value set after add leaves the entry's valueSet byte-identical", async () => {
    const { service, templateRepository } = buildClassificationEntryService();
    const originalValues = [
      { id: 'sdg-13', label: '13 · Climate Action' },
      { id: 'sdg-14', label: '14 · Life Below Water' },
    ];
    const template = makeClassificationTemplate({ valueSet: originalValues });
    templateRepository.findOne.mockResolvedValue(template);

    const entry = await service.addFromTemplate(makeSpaceAbout(), 'template-1');
    const entrySnapshotBefore = JSON.parse(JSON.stringify(entry.valueSet));

    // Simulate a later template edit — mutating the SAME array object the
    // template row held. If the entry's copy were a shared reference rather
    // than a deep clone, this would leak through.
    template.classificationValueSet.push({ id: 'sdg-99', label: 'Injected' });
    template.classificationValueSet[0].label = 'Mutated label';

    expect(entry.valueSet).toEqual(entrySnapshotBefore);
    expect(entry.valueSet).toHaveLength(2);
  });

  it('deleting the source template after add does not affect the entry — no re-dereference exists', async () => {
    const { service, templateRepository } = buildClassificationEntryService();
    const template = makeClassificationTemplate();
    templateRepository.findOne.mockResolvedValue(template);

    const entry = await service.addFromTemplate(makeSpaceAbout(), 'template-1');

    // Simulate the template row being gone.
    templateRepository.findOne.mockResolvedValue(null);

    // The entry object is untouched — nothing in the service re-reads the
    // template to serve a read, because nothing stores its id.
    expect(entry.displayLabel).toBeDefined();
    expect(entry.valueSet.length).toBeGreaterThan(0);
  });

  it('the entry carries no provenance field of any kind back to the template (FR-010, C-2)', async () => {
    const { service, templateRepository } = buildClassificationEntryService();
    templateRepository.findOne.mockResolvedValue(makeClassificationTemplate());

    const entry = await service.addFromTemplate(makeSpaceAbout(), 'template-1');

    const keys = Object.keys(entry);
    const provenanceLikeKeys = keys.filter(key => /template/i.test(key));
    expect(provenanceLikeKeys).toEqual([]);
  });
});
