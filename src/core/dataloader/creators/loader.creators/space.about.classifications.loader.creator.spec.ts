import { describe, expect, it, vi } from 'vitest';
import { SpaceAboutClassificationsLoaderCreator } from './space.about.classifications.loader.creator';

// The batching contract the resolver relies on: ONE query per request tick,
// results grouped per About in the order the query returned them (sortOrder
// ASC), and [] — never an error — for an About with no entries.
describe('SpaceAboutClassificationsLoaderCreator', () => {
  function buildCreator(rows: { entity: { id: string }; groupKey: string }[]) {
    const queryBuilder = {
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getRawAndEntities: vi.fn().mockResolvedValue({
        entities: rows.map(row => row.entity),
        raw: rows.map(row => ({ groupKey: row.groupKey })),
      }),
    };
    const manager = {
      getRepository: vi.fn(() => ({
        createQueryBuilder: vi.fn(() => queryBuilder),
      })),
    };
    return {
      creator: new SpaceAboutClassificationsLoaderCreator(manager as any),
      queryBuilder,
    };
  }

  it('groups one query result per About key, preserving the query order within each group', async () => {
    const { creator, queryBuilder } = buildCreator([
      { entity: { id: 'e1' }, groupKey: 'about-a' },
      { entity: { id: 'e2' }, groupKey: 'about-b' },
      { entity: { id: 'e3' }, groupKey: 'about-a' },
    ]);
    const loader = creator.create();

    const [forA, forB] = await Promise.all([
      loader.load('about-a'),
      loader.load('about-b'),
    ]);

    expect(forA.map(entry => entry.id)).toEqual(['e1', 'e3']);
    expect(forB.map(entry => entry.id)).toEqual(['e2']);
    expect(queryBuilder.getRawAndEntities).toHaveBeenCalledTimes(1);
  });

  it('resolves [] — never an error — for an About with zero entries (council operator:Q6)', async () => {
    const { creator } = buildCreator([
      { entity: { id: 'e1' }, groupKey: 'about-a' },
    ]);
    const loader = creator.create();

    const [forA, forEmpty] = await Promise.all([
      loader.load('about-a'),
      loader.load('about-without-entries'),
    ]);

    expect(forA).toHaveLength(1);
    expect(forEmpty).toEqual([]);
  });
});
