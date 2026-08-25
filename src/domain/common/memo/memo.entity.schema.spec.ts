import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { getMetadataArgsStorage } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { Memo } from './memo.entity';

/**
 * Regression guard for 006-collab-content-unification: the inline `content`
 * columns are UNMAPPED (migration-only). Release A RETAINS the DB columns for the
 * progressive back-fill; cleanup drops them after verification. Either way the
 * entities MUST NOT map them: TypeORM SELECTs an entity's mapped columns on every
 * load — the callout → framing → memo authorization path
 * (`CalloutService.applyAuthorizationPolicy` → loads the `framing.memo` relation)
 * is one such load. If `Memo` re-maps `content`, that load emits
 * `SELECT ..._memo.content` — which loads the RETAINED legacy column in Release A
 * (unwanted; content is authoritatively the file-service snapshot located by
 * `contentPointer`) and fails outright once cleanup drops it, breaking
 * authorization for EVERY callout (client error 11106 "AuthorizationPolicy
 * without credential rules" — the editors then never load). Asserting the column
 * is unmapped proves no such SELECT can be generated, without a live DB.
 */
describe('collab-content unmapped — entity schema regression (staged rollout retains the DB column; cleanup drops it)', () => {
  it('Memo maps NO `content` column, so no load can SELECT the retained legacy memo.content', () => {
    const columns = getMetadataArgsStorage()
      .filterColumns(Memo)
      .map(column => column.propertyName);
    expect(columns).not.toContain('content');
    // The pointer-based replacement IS mapped (content now lives only as a Yjs-V2
    // snapshot in file-service, located by contentPointer).
    expect(columns).toEqual(
      expect.arrayContaining(['contentPointer', 'contentVersion', 'migrated'])
    );
  });

  it('Whiteboard maps NO `content` column either (parallel — retained-but-unmapped)', () => {
    const columns = getMetadataArgsStorage()
      .filterColumns(Whiteboard)
      .map(column => column.propertyName);
    expect(columns).not.toContain('content');
    expect(columns).toContain('contentPointer');
    expect(columns).toContain('migrated');
  });
});
