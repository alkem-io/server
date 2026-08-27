/**
 * FR-021 / research D-12 / R-10 / S-18: no classification mutation emits an
 * activity-stream entry or an analytics event. Asserted as an ABSENCE, so a
 * later well-meaning "add activity for classification changes" PR fails
 * this test rather than silently changing user-visible Space activity
 * feeds. A structural check over the source is the right level here — there
 * is no positive event to assert never fired against, only every known
 * emission surface's absence.
 */
import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

const INSTRUMENTATION_SYMBOLS = [
  /ActivityAdapter/,
  /activityAdapter/,
  /AnalyticsService/,
  /analyticsService/,
  /EventEmitter2/,
  /this\.eventEmitter/,
];

const FILES_ON_EVERY_MUTATION_PATH = [
  `${__dirname}/classification.entry.resolver.mutations.ts`,
  `${__dirname}/classification.entry.service.ts`,
];

describe('FR-021: no activity-stream entry or analytics event from any classification mutation', () => {
  it.each(
    FILES_ON_EVERY_MUTATION_PATH
  )('%s references no instrumentation symbol', filePath => {
    const source = readFileSync(filePath, 'utf-8');
    for (const pattern of INSTRUMENTATION_SYMBOLS) {
      expect(source).not.toMatch(pattern);
    }
  });

  it('all six mutations are named, so this list itself cannot silently go stale', () => {
    const source = readFileSync(
      `${__dirname}/classification.entry.resolver.mutations.ts`,
      'utf-8'
    );
    const mutationNames = [
      'addClassificationEntryFromTemplate',
      'createClassificationEntry',
      'updateClassificationEntrySelection',
      'updateClassificationEntry',
      'updateClassificationEntryDisplay',
      'deleteClassificationEntry',
    ];
    for (const name of mutationNames) {
      expect(source).toContain(`async ${name}(`);
    }
  });
});
