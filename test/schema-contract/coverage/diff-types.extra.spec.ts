import {
  indexSDL,
  createDiffContext,
} from '@src/schema-contract/diff/diff-core';
import { diffTypes } from '@src/schema-contract/diff/diff-types';
import { ChangeType } from '@src/schema-contract/model';

describe('schema-contract diff-types additional branch coverage', () => {
  const oldSDL = `"""Type A"""
type A {
  """Old a field"""
  a: String!
  b: Int
  c: String @deprecated(reason: "REMOVE_AFTER=2099-01-01 | c old")
  d: String @deprecated(reason: "bad format")
  e: String!
  x: Int
  """Old description"""
  desc: String
}

type R { r: Int }
`;

  const newSDL = `type A {
  """Old a field"""
  a: String
  b: Int!
  # c removed (valid deprecated removal)
  # d removed (invalid deprecation removal)
  # x removed (no deprecation)
  e: String @deprecated(reason: "REMOVE_AFTER=2099-01-01 | e deprecated")
  f: Int
  """New description"""
  desc: String
}

type B { b: Int }
`;

  it('captures added/removed/deprecated/type change/description change cases', () => {
    const oldIdx = indexSDL(oldSDL);
    const newIdx = indexSDL(newSDL);
    const ctx = createDiffContext();
    diffTypes(oldIdx, newIdx, ctx);
    const entries = ctx.entries;

    function has(changeType: ChangeType, predicate: (e: any) => boolean) {
      expect(
        entries.find(e => e.changeType === changeType && predicate(e))
      ).toBeTruthy();
    }

    // Type added & removed
    has(ChangeType.ADDITIVE, e => e.detail.includes('Type added: B'));
    has(ChangeType.BREAKING, e => e.detail.includes('Type removed: R'));

    // Field added
    has(ChangeType.ADDITIVE, e => e.element === 'A.f');

    // Field removals covering three branches
    has(ChangeType.BREAKING, e =>
      e.detail.includes('Field removed without prior deprecation: A.x')
    );
    has(ChangeType.BREAKING, e =>
      e.detail.includes('Field removed but deprecation reason invalid: A.d')
    );
    has(
      ChangeType.BREAKING,
      e =>
        e.detail.includes(
          'Field removed (lifecycle validation deferred): A.c'
        ) && e.deprecationFormatValid === true
    );

    // Deprecation newly added
    has(ChangeType.DEPRECATED, e => e.element === 'A.e');

    // Type changes
    has(
      ChangeType.INFO,
      e =>
        e.detail.includes('Field type changed: String! -> String') &&
        e.element === 'A.a'
    );
    has(
      ChangeType.BREAKING,
      e =>
        e.detail.includes('Field type changed: Int -> Int!') &&
        e.element === 'A.b'
    );

    // Description change
    has(ChangeType.INFO, e =>
      e.detail.includes('Description changed for A.desc')
    );
  });
});
