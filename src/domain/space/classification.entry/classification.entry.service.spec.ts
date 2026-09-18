import { describe, expect, it } from 'vitest';
import {
  buildClassificationEntryService,
  makeClassificationTemplate,
  makeSpaceAbout,
} from './classification.entry.test-helpers';

describe('ClassificationEntryService.getClassificationTemplateOrFail', () => {
  it('loads the template with its profile AND authorization relations — the resolver READ-authorizes it before addFromTemplate ever runs', async () => {
    const { service, templateRepository } = buildClassificationEntryService();
    templateRepository.findOne.mockResolvedValue(makeClassificationTemplate());

    await service.getClassificationTemplateOrFail('template-1');

    expect(templateRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: { profile: true, authorization: true },
      })
    );
  });
});

describe('ClassificationEntryService.addFromTemplate (Step A)', () => {
  it('commits on its own — the returned entry has selectedValueIDs: []', async () => {
    const { service } = buildClassificationEntryService();
    const template = makeClassificationTemplate();

    const entry = await service.addFromTemplate(
      makeSpaceAbout(),
      template as any
    );

    expect(entry.selectedValueIDs).toEqual([]);
    expect(entry.display).toBe(true);
  });

  it('value ids and order are copied verbatim from the template', async () => {
    const { service } = buildClassificationEntryService();
    const orderedValues = [
      { id: 'sdg-13', label: '13 · Climate Action' },
      { id: 'sdg-14', label: '14 · Life Below Water' },
      { id: 'sdg-6', label: '6 · Clean Water and Sanitation' },
    ];
    const template = makeClassificationTemplate({ valueSet: orderedValues });

    const entry = await service.addFromTemplate(
      makeSpaceAbout(),
      template as any
    );

    expect(entry.valueSet).toEqual(orderedValues);
  });

  it('sortOrder is max(sibling sortOrder on this About) + 1', async () => {
    const { service, entryRepository } = buildClassificationEntryService();
    const template = makeClassificationTemplate();
    entryRepository.__queryBuilder.getRawOne.mockResolvedValue({ max: 4 });

    const entry = await service.addFromTemplate(
      makeSpaceAbout(),
      template as any
    );

    expect(entry.sortOrder).toEqual(5);
  });

  it('a first entry on an About with none lands at sortOrder 1', async () => {
    const { service, entryRepository } = buildClassificationEntryService();
    const template = makeClassificationTemplate();
    entryRepository.__queryBuilder.getRawOne.mockResolvedValue({ max: null });

    const entry = await service.addFromTemplate(
      makeSpaceAbout(),
      template as any
    );

    expect(entry.sortOrder).toEqual(1);
  });

  it("defaults displayLabel to the source template's displayName, overridable", async () => {
    const { service } = buildClassificationEntryService();
    const template = makeClassificationTemplate({ displayName: 'SDGs' });

    const defaulted = await service.addFromTemplate(
      makeSpaceAbout(),
      template as any
    );
    expect(defaulted.displayLabel).toEqual('SDGs');

    const overridden = await service.addFromTemplate(
      makeSpaceAbout('about-2'),
      template as any,
      'Our SDGs'
    );
    expect(overridden.displayLabel).toEqual('Our SDGs');
  });

  it('rejects a template that is not a fully-defined Classification Template, without naming its type in the error details', async () => {
    const { service } = buildClassificationEntryService();
    const template = {
      id: 'template-1',
      type: 'post',
      profile: { displayName: 'Not a classification' },
    };

    await expect(
      service.addFromTemplate(makeSpaceAbout(), template as any)
    ).rejects.toMatchObject({
      details: { templateID: 'template-1' },
    });
  });
});
