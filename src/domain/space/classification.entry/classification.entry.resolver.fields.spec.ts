import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { ClassificationEntryResolverFields } from './classification.entry.resolver.fields';
import { makeEntry } from './classification.entry.test-helpers';

describe('ClassificationEntryResolverFields', () => {
  const resolver = new ClassificationEntryResolverFields();

  it('values() renames the stored valueSet to the GraphQL `values` field, in authored order', () => {
    const entry = makeEntry({
      valueSet: [
        { id: 'v2', label: 'Second' },
        { id: 'v1', label: 'First' },
      ],
    });

    expect(resolver.values(entry)).toEqual([
      { id: 'v2', label: 'Second' },
      { id: 'v1', label: 'First' },
    ]);
  });

  it('S-14 (selectedValues half): resolves selectedValueIDs against values in AUTHORED order, not selection order', () => {
    const entry = makeEntry({
      valueSet: [
        { id: 'v1', label: 'First' },
        { id: 'v2', label: 'Second' },
        { id: 'v3', label: 'Third' },
      ],
      selectedValueIDs: ['v3', 'v1'],
    });

    expect(resolver.selectedValues(entry)).toEqual([
      { id: 'v1', label: 'First' },
      { id: 'v3', label: 'Third' },
    ]);
  });
});

describe('SpaceAbout.classifications — S-13, S-14, council operator:Q6', () => {
  it('S-14: about.classifications is [] for an About with zero entries — never null, never a throw', async () => {
    const classificationEntryService = {
      getClassificationsForSpaceAbout: vi.fn().mockResolvedValue([]),
    };
    const { SpaceAboutResolverFields } = await import(
      '@domain/space/space.about/space.about.resolver.fields'
    );
    const resolver = new SpaceAboutResolverFields(
      {} as any,
      {} as any,
      classificationEntryService as any
    );

    const result = await resolver.classifications({ id: 'about-empty' } as any);

    expect(result).toEqual([]);
  });

  it('S-14: entries are returned in sortOrder — order of addition, never alphabetical', async () => {
    const orderedEntries = [
      makeEntry({ id: 'e1', displayLabel: 'Sector', sortOrder: 1 }),
      makeEntry({ id: 'e2', displayLabel: 'Language', sortOrder: 2 }),
      makeEntry({ id: 'e3', displayLabel: 'SDGs', sortOrder: 3 }),
    ];
    const classificationEntryService = {
      getClassificationsForSpaceAbout: vi
        .fn()
        .mockResolvedValue(orderedEntries),
    };
    const { SpaceAboutResolverFields } = await import(
      '@domain/space/space.about/space.about.resolver.fields'
    );
    const resolver = new SpaceAboutResolverFields(
      {} as any,
      {} as any,
      classificationEntryService as any
    );

    const result = await resolver.classifications({ id: 'about-1' } as any);

    expect(result.map(e => e.id)).toEqual(['e1', 'e2', 'e3']);
    expect(
      classificationEntryService.getClassificationsForSpaceAbout
    ).toHaveBeenCalledWith('about-1');
  });

  it('S-13/FR-010d: the classifications resolve field carries no privilege decorator — read auth is inherited from the About query path', () => {
    // A structural check, not a runtime one: an
    // @AuthorizationActorHasPrivilege(READ) decorator on this specific
    // field would break anonymous reads of a public Space's hidden entries
    // (probe 8). Guards against a well-meaning future addition.
    const source = readFileSync(
      join(__dirname, '../space.about/space.about.resolver.fields.ts'),
      'utf-8'
    );
    const classificationsFieldBlock = source.slice(
      source.indexOf("@ResolveField('classifications'")
    );
    const nextMethodBoundary = classificationsFieldBlock.indexOf('\n  }\n');
    const fieldSource = classificationsFieldBlock.slice(0, nextMethodBoundary);
    expect(fieldSource).not.toMatch(/AuthorizationActorHasPrivilege/);
  });
});
