import {
  evaluateOverride,
  loadReviews,
  APPROVAL_PHRASE,
} from '@src/schema-contract/governance/reviews';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';

describe('schema-contract governance: reviews override evaluation', () => {
  const jsonFile = 'tmp/reviews.test.json';
  const sample = [
    {
      reviewer: 'alice',
      body: `${APPROVAL_PHRASE} looks good`,
      state: 'APPROVED',
    },
  ];

  beforeAll(() => {
    writeFileSync(jsonFile, JSON.stringify(sample), 'utf-8');
  });
  afterAll(() => {
    if (existsSync(jsonFile)) unlinkSync(jsonFile);
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_JSON;
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_FILE;
  });

  it('loadReviews prefers inline JSON then file', () => {
    process.env.SCHEMA_OVERRIDE_REVIEWS_JSON = JSON.stringify(sample);
    const inline = loadReviews();
    expect(inline.length).toBe(1);
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_JSON;
    process.env.SCHEMA_OVERRIDE_REVIEWS_FILE = jsonFile;
    const fromFile = loadReviews();
    expect(fromFile.length).toBe(1);
  });

  it('evaluateOverride scenarios', () => {
    // no owners
    let res = evaluateOverride([], []);
    expect(res.applied).toBe(false);
    expect(res.details.join('\n')).toMatch(/No CODEOWNERS owners/);

    // owners but no reviews
    res = evaluateOverride(['alice'], []);
    expect(res.applied).toBe(false);
    expect(res.details.join('\n')).toMatch(/No reviews provided/);

    // review without phrase
    res = evaluateOverride(
      ['alice'],
      [{ reviewer: 'alice', body: 'something', state: 'APPROVED' }]
    );
    expect(res.applied).toBe(false);
    expect(res.details[res.details.length - 1]).toMatch(/No qualifying review/);

    // review with phrase but not approved
    res = evaluateOverride(
      ['alice'],
      [{ reviewer: 'alice', body: APPROVAL_PHRASE, state: 'COMMENTED' }]
    );
    expect(res.applied).toBe(false);
    expect(res.details[res.details.length - 1]).toMatch(/No qualifying review/);

    // successful override
    res = evaluateOverride(
      ['alice'],
      [{ reviewer: 'alice', body: APPROVAL_PHRASE, state: 'APPROVED' }]
    );
    expect(res.applied).toBe(true);
    expect(res.reviewer).toBe('alice');
  });
});
