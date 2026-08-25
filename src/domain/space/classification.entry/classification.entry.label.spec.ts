import { ClassificationCardinality } from '@common/enums/classification.cardinality';
import { ValidationException } from '@common/exceptions';
import { describe, expect, it } from 'vitest';
import {
  buildClassificationEntryService,
  makeClassificationTemplate,
  makeEntry,
  makeSpaceAbout,
} from './classification.entry.test-helpers';

describe('S-7/S-8: display-label duplicate guard, every write path', () => {
  const existingSibling = { id: 'sibling-1', displayLabel: 'SDGs' };

  it('addFromTemplate: rejects a normalized collision against a sibling on the same About', async () => {
    const { service, entryRepository } = buildClassificationEntryService();
    entryRepository.find.mockResolvedValue([existingSibling]);
    const template = makeClassificationTemplate({ displayName: 'sdgs' });

    await expect(
      service.addFromTemplate(makeSpaceAbout(), template as any)
    ).rejects.toThrow(ValidationException);
  });

  it('createClassificationEntry (ad-hoc): rejects "SDGs " (trailing space) against "SDGs"', async () => {
    const { service, entryRepository } = buildClassificationEntryService();
    entryRepository.find.mockResolvedValue([existingSibling]);

    await expect(
      service.createAdHoc(makeSpaceAbout(), {
        spaceID: 'space-1',
        displayLabel: 'SDGs ',
        cardinality: ClassificationCardinality.MULTI_SELECT,
        values: [{ label: 'A' }],
      } as any)
    ).rejects.toThrow(ValidationException);
  });

  it('updateClassificationEntry (definition edit): rejects a rename that collides with a sibling', async () => {
    const { service, entryRepository } = buildClassificationEntryService();
    const entry = makeEntry({
      id: 'entry-being-edited',
      displayLabel: 'Sector',
    });
    entryRepository.find.mockResolvedValue([existingSibling, entry]);

    await expect(
      service.updateDefinition(entry, {
        classificationEntryID: entry.id,
        displayLabel: 'sdgs',
      } as any)
    ).rejects.toThrow(ValidationException);
  });

  it('updateClassificationEntry excludes the entry itself from the collision check (renaming to its own label is fine)', async () => {
    const { service, entryRepository } = buildClassificationEntryService();
    const entry = makeEntry({ id: 'entry-1', displayLabel: 'SDGs' });
    entryRepository.find.mockResolvedValue([entry]);

    const result = await service.updateDefinition(entry, {
      classificationEntryID: entry.id,
      displayLabel: 'SDGs',
    } as any);

    expect(result.displayLabel).toEqual('SDGs');
  });

  it('S-8: the stored label preserves the exact casing/spacing the author supplied', async () => {
    const { service, entryRepository } = buildClassificationEntryService();
    entryRepository.find.mockResolvedValue([]);
    const template = makeClassificationTemplate();

    const entry = await service.addFromTemplate(
      makeSpaceAbout(),
      template as any,
      '  My SDGs  '
    );

    expect(entry.displayLabel).toEqual('  My SDGs  ');
  });
});
