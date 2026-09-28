import { describe, expect, it } from 'vitest';
import { appRedirectSchemeFor } from './app-redirect-scheme';

describe('appRedirectSchemeFor (FR-004)', () => {
  it('maps the two deployments that have an app', () => {
    expect(appRedirectSchemeFor('alkem.io')).toBe('io.alkem.app');
    expect(appRedirectSchemeFor('sandbox-alkem.io')).toBe(
      'io.alkem.app.sandbox'
    );
  });

  // Every other environment has no app, so app mode is simply unavailable
  // there (FR-002). A lookalike domain is the open-redirect case the closed
  // set exists to make unrepresentable.
  it.each([
    'acc-alkem.io',
    'dev-alkem.io',
    'test-alkem.io',
    'evil-alkem.io',
    'alkem.io.evil.example',
    '',
  ])('returns undefined for %j', domain => {
    expect(appRedirectSchemeFor(domain)).toBeUndefined();
  });

  it('returns undefined when no cookie domain is configured', () => {
    expect(appRedirectSchemeFor(undefined)).toBeUndefined();
  });

  // A bare object literal answers these with inherited members, and
  // Object.freeze does not change that — which is why the lookup is a Map.
  it.each([
    'constructor',
    '__proto__',
    'toString',
    'hasOwnProperty',
  ])('returns undefined for the Object.prototype member %j', domain => {
    expect(appRedirectSchemeFor(domain)).toBeUndefined();
  });
});
