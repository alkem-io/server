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
  it('USER: 2 skills and 4 keywords -> all 6, skills first, stored order', () => {
    const result = pickContributorTags(ActorType.USER, [
      {
        name: TagsetReservedName.KEYWORDS,
        tags: ['k1', 'k2', 'k3', 'k4'],
      } as any,
      { name: TagsetReservedName.SKILLS, tags: ['b', 'a'] } as any,
    ]);
    expect(result).toEqual(['b', 'a', 'k1', 'k2', 'k3', 'k4']);
  });

  it('USER: empty skills [] -> keywords only', () => {
    const result = pickContributorTags(ActorType.USER, [
      { name: TagsetReservedName.SKILLS, tags: [] } as any,
      { name: TagsetReservedName.KEYWORDS, tags: ['k1'] } as any,
    ]);
    expect(result).toEqual(['k1']);
  });

  it('blank entries are dropped from every tagset', () => {
    const result = pickContributorTags(ActorType.USER, [
      { name: TagsetReservedName.SKILLS, tags: ['', ' ', 's1'] } as any,
      { name: TagsetReservedName.KEYWORDS, tags: ['k1', '  '] } as any,
    ]);
    expect(result).toEqual(['s1', 'k1']);
  });

  it('duplicates across and within tagsets are kept once, ignoring case and surrounding whitespace; first spelling wins', () => {
    const result = pickContributorTags(ActorType.USER, [
      {
        name: TagsetReservedName.SKILLS,
        tags: ['Policy', 'Energy', 'energy'],
      } as any,
      {
        name: TagsetReservedName.KEYWORDS,
        tags: ['policy', ' ENERGY ', 'Water'],
      } as any,
    ]);
    expect(result).toEqual(['Policy', 'Energy', 'Water']);
  });

  it('ORGANIZATION: keywords then capabilities, merged', () => {
    const result = pickContributorTags(ActorType.ORGANIZATION, [
      { name: TagsetReservedName.CAPABILITIES, tags: ['Funding'] } as any,
      { name: TagsetReservedName.KEYWORDS, tags: ['Climate'] } as any,
    ]);
    expect(result).toEqual(['Climate', 'Funding']);
  });

  it('VIRTUAL_CONTRIBUTOR: keywords then capabilities, merged', () => {
    const result = pickContributorTags(ActorType.VIRTUAL_CONTRIBUTOR, [
      { name: TagsetReservedName.KEYWORDS, tags: ['Research'] } as any,
      { name: TagsetReservedName.CAPABILITIES, tags: ['Summaries'] } as any,
    ]);
    expect(result).toEqual(['Research', 'Summaries']);
  });

  it('ORGANIZATION: skills are never included', () => {
    const result = pickContributorTags(ActorType.ORGANIZATION, [
      { name: TagsetReservedName.SKILLS, tags: ['x'] } as any,
      { name: TagsetReservedName.KEYWORDS, tags: ['k1'] } as any,
    ]);
    expect(result).toEqual(['k1']);
  });

  it('the default tagset is never included', () => {
    const result = pickContributorTags(ActorType.USER, [
      { name: TagsetReservedName.DEFAULT, tags: ['x'] } as any,
      { name: TagsetReservedName.SKILLS, tags: ['s1'] } as any,
    ]);
    expect(result).toEqual(['s1']);
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
