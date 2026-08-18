import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { ValidationException } from '@common/exceptions';
import { describe, expect, it } from 'vitest';
import {
  buildClassificationEntryService,
  makeClassificationTemplate,
  makeEntry,
  makeSpaceAbout,
} from './classification.entry.test-helpers';

describe('S-15: concurrent writes resolve last-write-wins, no version token, no conflict error', () => {
  it('two sequential selection writes both succeed; the later one wins, no version field involved', async () => {
    const { service } = buildClassificationEntryService();
    const entry = makeEntry({ selectedValueIDs: [] });

    // Simulates two editors racing on the same entry: neither write is
    // rejected as a conflict, and the entry carries no version parameter
    // anywhere in its GraphQL-facing shape.
    await service.updateSelection(entry, ['v1']);
    const second = await service.updateSelection(entry, ['v2']);

    expect(second.selectedValueIDs).toEqual(['v2']);
    expect((second as any).version).toBeUndefined();
  });

  it("a concurrent removal makes the other editor's in-flight selection resolve against the NEW value set (last write wins)", async () => {
    const { service } = buildClassificationEntryService();
    const entry = makeEntry({
      valueSet: [
        { id: 'v1', label: 'Value 1' },
        { id: 'v2', label: 'Value 2' },
      ],
      selectedValueIDs: [],
    });

    // "Editor A" removes v2 via a definition edit.
    await service.updateDefinition(entry, {
      classificationEntryID: entry.id,
      values: [{ id: 'v1', label: 'Value 1' }],
    } as any);

    // "Editor B" then selects v1 — succeeds against the now-current value set.
    const result = await service.updateSelection(entry, ['v1']);
    expect(result.selectedValueIDs).toEqual(['v1']);
  });
});

describe('S-12: the 1-50 value-set bound holds on every write path', () => {
  const values51 = Array.from({ length: 51 }, (_, i) => ({
    label: `Value ${i}`,
  }));

  it('addFromTemplate: a template somehow carrying 51 values is rejected at add time', async () => {
    const { service } = buildClassificationEntryService();
    const template = makeClassificationTemplate({
      valueSet: values51.map((v, i) => ({ id: `v${i}`, label: v.label })),
    });

    await expect(
      service.addFromTemplate(makeSpaceAbout(), template as any)
    ).rejects.toThrow(ValidationException);
  });

  it('createClassificationEntry: 51 values rejected', async () => {
    const { service } = buildClassificationEntryService();

    await expect(
      service.createAdHoc(makeSpaceAbout(), {
        spaceID: 'space-1',
        displayLabel: 'Too Big',
        cardinality: ClassificationCardinality.MULTI_SELECT,
        values: values51,
      } as any)
    ).rejects.toThrow(ValidationException);
  });

  it('createClassificationEntry: 0 values rejected', async () => {
    const { service } = buildClassificationEntryService();

    await expect(
      service.createAdHoc(makeSpaceAbout(), {
        spaceID: 'space-1',
        displayLabel: 'Empty',
        cardinality: ClassificationCardinality.MULTI_SELECT,
        values: [],
      } as any)
    ).rejects.toThrow(ValidationException);
  });

  it('updateClassificationEntry (definition edit): 51 values rejected', async () => {
    const { service } = buildClassificationEntryService();
    const entry = makeEntry();

    await expect(
      service.updateDefinition(entry, {
        classificationEntryID: entry.id,
        values: values51,
      } as any)
    ).rejects.toThrow(ValidationException);
  });
});
