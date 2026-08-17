import { describe, expect, it } from 'vitest';
import {
  buildClassificationEntryService,
  makeClassificationTemplate,
  makeSpaceAbout,
} from './classification.entry.test-helpers';

describe('ClassificationEntryService.addFromTemplate (Step A)', () => {
  it('S-1: commits on its own — the returned entry has selectedValueIDs: []', async () => {
    const { service, templateRepository } = buildClassificationEntryService();
    templateRepository.findOne.mockResolvedValue(makeClassificationTemplate());

    const entry = await service.addFromTemplate(makeSpaceAbout(), 'template-1');

    expect(entry.selectedValueIDs).toEqual([]);
    expect(entry.display).toBe(true);
  });

  it('S-9/S-10: value ids and order are copied verbatim from the template', async () => {
    const { service, templateRepository } = buildClassificationEntryService();
    const orderedValues = [
      { id: 'sdg-13', label: '13 · Climate Action' },
      { id: 'sdg-14', label: '14 · Life Below Water' },
      { id: 'sdg-6', label: '6 · Clean Water and Sanitation' },
    ];
    templateRepository.findOne.mockResolvedValue(
      makeClassificationTemplate({ valueSet: orderedValues })
    );

    const entry = await service.addFromTemplate(makeSpaceAbout(), 'template-1');

    expect(entry.valueSet).toEqual(orderedValues);
  });

  it('I-8: sortOrder := max(sibling sortOrder on this About) + 1', async () => {
    const { service, templateRepository, entryRepository } =
      buildClassificationEntryService();
    templateRepository.findOne.mockResolvedValue(makeClassificationTemplate());
    entryRepository.__queryBuilder.getRawOne.mockResolvedValue({ max: 4 });

    const entry = await service.addFromTemplate(makeSpaceAbout(), 'template-1');

    expect(entry.sortOrder).toEqual(5);
  });

  it('I-8: a first entry on an About with none lands at sortOrder 1', async () => {
    const { service, templateRepository, entryRepository } =
      buildClassificationEntryService();
    templateRepository.findOne.mockResolvedValue(makeClassificationTemplate());
    entryRepository.__queryBuilder.getRawOne.mockResolvedValue({ max: null });

    const entry = await service.addFromTemplate(makeSpaceAbout(), 'template-1');

    expect(entry.sortOrder).toEqual(1);
  });

  it("defaults displayLabel to the source template's displayName, overridable", async () => {
    const { service, templateRepository } = buildClassificationEntryService();
    templateRepository.findOne.mockResolvedValue(
      makeClassificationTemplate({ displayName: 'SDGs' })
    );

    const defaulted = await service.addFromTemplate(
      makeSpaceAbout(),
      'template-1'
    );
    expect(defaulted.displayLabel).toEqual('SDGs');

    const overridden = await service.addFromTemplate(
      makeSpaceAbout('about-2'),
      'template-1',
      'Our SDGs'
    );
    expect(overridden.displayLabel).toEqual('Our SDGs');
  });
});
