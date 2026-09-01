import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { ValidationException } from '@common/exceptions';
import { describe, expect, it } from 'vitest';
import {
  buildClassificationEntryService,
  makeEntry,
  makeSpaceAbout,
} from './classification.entry.test-helpers';

describe('ClassificationEntryService.updateSelection (Step B)', () => {
  it('S-2: full replacement, idempotent', async () => {
    const { service } = buildClassificationEntryService();
    const entry = makeEntry({ selectedValueIDs: ['v1'] });

    const first = await service.updateSelection(entry, ['v1', 'v2']);
    expect(first.selectedValueIDs).toEqual(['v1', 'v2']);

    const second = await service.updateSelection(entry, ['v1', 'v2']);
    expect(second.selectedValueIDs).toEqual(['v1', 'v2']);
  });

  it('S-2: an empty list is a legal write that clears the selection', async () => {
    const { service } = buildClassificationEntryService();
    const entry = makeEntry({ selectedValueIDs: ['v1', 'v2'] });

    const result = await service.updateSelection(entry, []);

    expect(result.selectedValueIDs).toEqual([]);
  });

  it('S-3: an unknown value id is rejected, nothing applied', async () => {
    const { service } = buildClassificationEntryService();
    const entry = makeEntry({ selectedValueIDs: ['v1'] });

    await expect(
      service.updateSelection(entry, ['v1', 'bogus'])
    ).rejects.toThrow(ValidationException);
    expect(entry.selectedValueIDs).toEqual(['v1']);
  });

  it('S-4: >1 value for SINGLE_SELECT is rejected, nothing applied', async () => {
    const { service } = buildClassificationEntryService();
    const entry = makeEntry({
      cardinality: ClassificationCardinality.SINGLE_SELECT,
      selectedValueIDs: ['v1'],
    });

    await expect(service.updateSelection(entry, ['v1', 'v2'])).rejects.toThrow(
      ValidationException
    );
    expect(entry.selectedValueIDs).toEqual(['v1']);
  });
});

describe('ClassificationEntryService.createAdHoc — S-3/S-4 on the create path too', () => {
  const baseInput = (overrides: Record<string, any> = {}) => ({
    spaceID: 'space-1',
    displayLabel: 'Sector',
    cardinality: ClassificationCardinality.SINGLE_SELECT,
    values: [{ label: 'Health' }, { label: 'Education' }],
    ...overrides,
  });

  it('S-3: an unknown selectedValueIDs entry rejects the WHOLE create — no entry persisted', async () => {
    const { service, entryRepository } = buildClassificationEntryService();

    await expect(
      service.createAdHoc(
        makeSpaceAbout(),
        baseInput({ selectedValueIDs: ['bogus'] }) as any
      )
    ).rejects.toThrow(ValidationException);
    expect(entryRepository.save).not.toHaveBeenCalled();
  });

  it('S-4: two ids on a SINGLE_SELECT ad-hoc create rejects the whole create', async () => {
    const { service, entryRepository } = buildClassificationEntryService();

    await expect(
      service.createAdHoc(
        makeSpaceAbout(),
        baseInput({ selectedValueIDs: ['health', 'education'] }) as any
      )
    ).rejects.toThrow(ValidationException);
    expect(entryRepository.save).not.toHaveBeenCalled();
  });

  it('omitting selectedValueIDs on a create yields selectedValueIDs: [], exactly as Step A does', async () => {
    const { service } = buildClassificationEntryService();

    const entry = await service.createAdHoc(
      makeSpaceAbout(),
      baseInput() as any
    );

    expect(entry.selectedValueIDs).toEqual([]);
  });

  it('applies a valid selection in the same atomic write as the value set (FR-017a)', async () => {
    const { service } = buildClassificationEntryService();

    const entry = await service.createAdHoc(
      makeSpaceAbout(),
      baseInput({ selectedValueIDs: ['health'] }) as any
    );

    expect(entry.selectedValueIDs).toEqual(['health']);
  });
});
