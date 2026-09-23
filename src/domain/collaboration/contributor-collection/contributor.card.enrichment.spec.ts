import { ActorType } from '@common/enums/actor.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { describe, expect, it } from 'vitest';
import {
  normalizeTagline,
  normalizeWebsite,
  pickContributorTags,
  truncateToMonthUtc,
} from './contributor.card.enrichment';

describe('normalizeTagline', () => {
  it.each([
    [null, undefined],
    ['', undefined],
    ['   ', undefined],
    [' x ', 'x'],
  ])('normalizeTagline(%j) -> %j', (input, expected) => {
    expect(normalizeTagline(input as string | null)).toBe(expected);
  });
});

describe('pickContributorTags', () => {
  it('USER: skills and keywords both present -> skills only, stored order', () => {
    const result = pickContributorTags(ActorType.USER, [
      { name: TagsetReservedName.SKILLS, tags: ['b', 'a'] } as any,
      { name: TagsetReservedName.KEYWORDS, tags: ['k1'] } as any,
    ]);
    expect(result).toEqual(['b', 'a']);
  });

  it('USER: empty skills [] -> falls back to keywords', () => {
    const result = pickContributorTags(ActorType.USER, [
      { name: TagsetReservedName.SKILLS, tags: [] } as any,
      { name: TagsetReservedName.KEYWORDS, tags: ['k1'] } as any,
    ]);
    expect(result).toEqual(['k1']);
  });

  it('USER: skills with only blank entries -> falls back to keywords', () => {
    const result = pickContributorTags(ActorType.USER, [
      { name: TagsetReservedName.SKILLS, tags: ['', ' '] } as any,
      { name: TagsetReservedName.KEYWORDS, tags: ['k1'] } as any,
    ]);
    expect(result).toEqual(['k1']);
  });

  it('ORGANIZATION: empty keywords [] -> falls back to capabilities', () => {
    const result = pickContributorTags(ActorType.ORGANIZATION, [
      { name: TagsetReservedName.KEYWORDS, tags: [] } as any,
      { name: TagsetReservedName.CAPABILITIES, tags: ['Funding'] } as any,
    ]);
    expect(result).toEqual(['Funding']);
  });

  it('only a default tagset present -> []', () => {
    const result = pickContributorTags(ActorType.USER, [
      { name: TagsetReservedName.DEFAULT, tags: ['x'] } as any,
    ]);
    expect(result).toEqual([]);
  });

  it('50 tags -> all 50 returned (no cap)', () => {
    const fifty = Array.from({ length: 50 }, (_, i) => `tag-${i}`);
    const result = pickContributorTags(ActorType.USER, [
      { name: TagsetReservedName.SKILLS, tags: fifty } as any,
    ]);
    expect(result).toHaveLength(50);
    expect(result).toEqual(fifty);
  });

  it('an ActorType with no preference order -> []', () => {
    const result = pickContributorTags(ActorType.SPACE, [
      { name: TagsetReservedName.KEYWORDS, tags: ['x'] } as any,
    ]);
    expect(result).toEqual([]);
  });
});

describe('truncateToMonthUtc', () => {
  it.each([
    ['2023-10-31T23:30:00Z', '2023-10-01T00:00:00.000Z'],
    ['2024-01-01T00:00:00Z', '2024-01-01T00:00:00.000Z'],
    ['2023-12-31T23:59:59.999Z', '2023-12-01T00:00:00.000Z'],
  ])('truncateToMonthUtc(%s) -> %s', (input, expected) => {
    expect(truncateToMonthUtc(new Date(input)).toISOString()).toBe(expected);
  });
});

describe('normalizeWebsite', () => {
  it.each([
    ['https://a.org', 'https://a.org'],
    ['  HTTPS://Spacey.example/about  ', 'HTTPS://Spacey.example/about'],
    ['', undefined],
    ['   ', undefined],
    ['javascript:alert(1)', undefined],
    ['JaVaScRiPt:alert(1)', undefined],
    ['data:text/html,x', undefined],
    ['ftp://a.org', undefined],
    ['//a.org', undefined],
    ['www.example.org', undefined],
  ])('normalizeWebsite(%j) -> %j', (input, expected) => {
    expect(normalizeWebsite(input)).toBe(expected);
  });
});
