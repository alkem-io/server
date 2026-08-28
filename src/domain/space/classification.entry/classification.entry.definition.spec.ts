import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { ValidationException } from '@common/exceptions';
import { describe, expect, it } from 'vitest';
import {
  buildClassificationEntryService,
  makeEntry,
} from './classification.entry.test-helpers';

describe('ClassificationEntryService.updateDefinition — I-4 vs I-7 (R-6)', () => {
  it('S-5: multi -> single narrowing with >1 selected is REJECTED atomically; entry wholly unchanged (label + value order too)', async () => {
    const { service, entryRepository } = buildClassificationEntryService();
    const originalValueSet = [
      { id: 'v1', label: 'Value 1' },
      { id: 'v2', label: 'Value 2' },
    ];
    const entry = makeEntry({
      displayLabel: 'Original Label',
      cardinality: ClassificationCardinality.MULTI_SELECT,
      valueSet: originalValueSet,
      selectedValueIDs: ['v1', 'v2'],
    });

    await expect(
      service.updateDefinition(entry, {
        classificationEntryID: entry.id,
        cardinality: ClassificationCardinality.SINGLE_SELECT,
      } as any)
    ).rejects.toThrow(ValidationException);

    // Nothing was mutated — S-5's "wholly unchanged" guarantee.
    expect(entry.displayLabel).toEqual('Original Label');
    expect(entry.cardinality).toEqual(ClassificationCardinality.MULTI_SELECT);
    expect(entry.valueSet).toEqual(originalValueSet);
    expect(entry.selectedValueIDs).toEqual(['v1', 'v2']);
    expect(entryRepository.save).not.toHaveBeenCalled();
  });

  it('S-5: the rejection error names the currently-selected values', async () => {
    const { service } = buildClassificationEntryService();
    const entry = makeEntry({
      cardinality: ClassificationCardinality.MULTI_SELECT,
      selectedValueIDs: ['v1', 'v2'],
    });

    await expect(
      service.updateDefinition(entry, {
        classificationEntryID: entry.id,
        cardinality: ClassificationCardinality.SINGLE_SELECT,
      } as any)
    ).rejects.toMatchObject({
      details: expect.objectContaining({
        selectedValueIDs: ['v1', 'v2'],
      }),
    });
  });

  it('S-6: removing a selected value during a definition edit AUTO-DESELECTS it (contrast S-5)', async () => {
    const { service } = buildClassificationEntryService();
    const entry = makeEntry({
      cardinality: ClassificationCardinality.MULTI_SELECT,
      valueSet: [
        { id: 'v1', label: 'Value 1' },
        { id: 'v2', label: 'Value 2' },
      ],
      selectedValueIDs: ['v1', 'v2'],
    });

    const result = await service.updateDefinition(entry, {
      classificationEntryID: entry.id,
      values: [{ id: 'v1', label: 'Value 1' }],
    } as any);

    expect(result.selectedValueIDs).toEqual(['v1']);
    expect(result.valueSet).toEqual([{ id: 'v1', label: 'Value 1' }]);
  });

  it('a removal that also narrows cardinality succeeds when auto-deselect brings the count within bounds', async () => {
    const { service } = buildClassificationEntryService();
    const entry = makeEntry({
      cardinality: ClassificationCardinality.MULTI_SELECT,
      valueSet: [
        { id: 'v1', label: 'Value 1' },
        { id: 'v2', label: 'Value 2' },
      ],
      selectedValueIDs: ['v1', 'v2'],
    });

    const result = await service.updateDefinition(entry, {
      classificationEntryID: entry.id,
      cardinality: ClassificationCardinality.SINGLE_SELECT,
      values: [{ id: 'v1', label: 'Value 1' }],
    } as any);

    expect(result.cardinality).toEqual(ClassificationCardinality.SINGLE_SELECT);
    expect(result.selectedValueIDs).toEqual(['v1']);
  });
});

describe('ClassificationEntryService.updateDefinition — relabel leaves the id unchanged', () => {
  it('keeps the existing id on a relabel even when the caller OMITS the id, and the selection keyed on that id survives', async () => {
    const { service } = buildClassificationEntryService();
    const entry = makeEntry({
      cardinality: ClassificationCardinality.MULTI_SELECT,
      valueSet: [{ id: 'sdg-13', label: '13 · Climate Action' }],
      selectedValueIDs: ['sdg-13'],
    });

    const result = await service.updateDefinition(entry, {
      classificationEntryID: entry.id,
      values: [{ label: '13 · Climate Action (renamed)' }],
    } as any);

    expect(result.valueSet).toEqual([
      { id: 'sdg-13', label: '13 · Climate Action (renamed)' },
    ]);
    // Selection is keyed on the id — an id changing under a relabel would
    // have silently emptied it via autoDeselectRemovedValues.
    expect(result.selectedValueIDs).toEqual(['sdg-13']);
  });

  it('derives a fresh id only for a value beyond the previous length, on an id-omitted edit', async () => {
    const { service } = buildClassificationEntryService();
    const entry = makeEntry({
      cardinality: ClassificationCardinality.MULTI_SELECT,
      valueSet: [{ id: 'sdg-13', label: '13 · Climate Action' }],
      selectedValueIDs: [],
    });

    const result = await service.updateDefinition(entry, {
      classificationEntryID: entry.id,
      values: [
        { label: '13 · Climate Action' },
        { label: '14 · Life Below Water' },
      ],
    } as any);

    expect(result.valueSet).toEqual([
      { id: 'sdg-13', label: '13 · Climate Action' },
      { id: '14-life-below-water', label: '14 · Life Below Water' },
    ]);
  });

  it('removing the first value with ids omitted keeps the survivor on its own id — never re-pointed via position', async () => {
    const { service } = buildClassificationEntryService();
    const entry = makeEntry({
      cardinality: ClassificationCardinality.MULTI_SELECT,
      valueSet: [
        { id: 'sdg-13', label: '13 · Climate Action' },
        { id: 'sdg-14', label: '14 · Life Below Water' },
      ],
      selectedValueIDs: ['sdg-14'],
    });

    const result = await service.updateDefinition(entry, {
      classificationEntryID: entry.id,
      values: [{ label: '14 · Life Below Water' }],
    } as any);

    expect(result.valueSet).toEqual([
      { id: 'sdg-14', label: '14 · Life Below Water' },
    ]);
    // The selection survives on the correct id — a positional carry would
    // have re-pointed 'sdg-13' at 'Life Below Water' instead, and
    // auto-deselect would then have silently emptied the selection.
    expect(result.selectedValueIDs).toEqual(['sdg-14']);
  });

  it('a reorder with ids omitted leaves every id pointing at its own label, never swapped', async () => {
    const { service } = buildClassificationEntryService();
    const entry = makeEntry({
      cardinality: ClassificationCardinality.MULTI_SELECT,
      valueSet: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      selectedValueIDs: ['b'],
    });

    const result = await service.updateDefinition(entry, {
      classificationEntryID: entry.id,
      values: [{ label: 'B' }, { label: 'A' }],
    } as any);

    expect(result.valueSet).toEqual([
      { id: 'b', label: 'B' },
      { id: 'a', label: 'A' },
    ]);
    expect(result.selectedValueIDs).toEqual(['b']);
  });
});
