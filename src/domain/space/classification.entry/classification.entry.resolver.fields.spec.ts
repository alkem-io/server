import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it, vi } from 'vitest';
import { ClassificationEntryResolverFields } from './classification.entry.resolver.fields';
import { ClassificationEntryService } from './classification.entry.service';
import {
  createMockClassificationEntryRepository,
  makeEntry,
} from './classification.entry.test-helpers';

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

  it('a hidden (display: false) entry is still returned by the read path — "hidden" is never "private"', async () => {
    const mixedEntries = [
      makeEntry({ id: 'e1', displayLabel: 'Shown', display: true }),
      makeEntry({ id: 'e2', displayLabel: 'Hidden', display: false }),
    ];
    const classificationEntryService = {
      getClassificationsForSpaceAbout: vi.fn().mockResolvedValue(mixedEntries),
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

    expect(result).toHaveLength(2);
    expect(result.map(e => ({ id: e.id, display: e.display }))).toEqual([
      { id: 'e1', display: true },
      { id: 'e2', display: false },
    ]);
  });

  it('the service query behind the read path carries no `display` predicate — regressing to a filtered query would silently hide entries from external aggregators', () => {
    const entryRepository = createMockClassificationEntryRepository();
    const service = new ClassificationEntryService(
      entryRepository as any,
      { findOne: vi.fn() } as any,
      { verbose: vi.fn(), warn: vi.fn(), error: vi.fn() } as any
    );

    service.getClassificationsForSpaceAbout('about-1');

    expect(entryRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { spaceAbout: { id: 'about-1' } },
      })
    );
  });

  it('S-13/FR-010d: the classifications resolve field carries no privilege decorator — read auth is inherited from the About query path', () => {
    // A structural check, not a runtime one: an
    // @AuthorizationActorHasPrivilege(READ) decorator on this specific
    // field would break anonymous reads of a public Space's hidden entries
    // (probe 8). Guards against a well-meaning future addition.
    //
    // The window checked starts at the previous blank line, NOT at
    // `@ResolveField('classifications'` — every sibling field in this file
    // places its privilege decorator ABOVE `@ResolveField`, so a slice that
    // starts there would miss a decorator added in that conventional spot
    // and stay green through the exact regression it exists to catch.
    const source = readFileSync(
      join(__dirname, '../space.about/space.about.resolver.fields.ts'),
      'utf-8'
    );
    const methodStart = source.indexOf('async classifications(');
    const windowStart = source.lastIndexOf('\n\n', methodStart);
    const nextMethodBoundary = source.indexOf('\n  }\n', methodStart);
    const fieldSource = source.slice(windowStart, nextMethodBoundary);
    expect(fieldSource).toContain('classifications');
    // Match only an actual decorator line (starts with `@`, ignoring
    // leading whitespace) — the surrounding comment explaining the
    // deliberate absence legitimately mentions the decorator's name in
    // prose and must not itself trip the guard.
    expect(fieldSource).not.toMatch(/^\s*@AuthorizationActorHasPrivilege/m);
    expect(fieldSource).not.toMatch(/^\s*@UseGuards/m);
  });
});
