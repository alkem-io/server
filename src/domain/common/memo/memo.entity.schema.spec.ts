import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { getMetadataArgsStorage } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { Memo } from './memo.entity';

/**
 * Regression guard for 006-collab-content-unification (migration
 * `DropMemoAndWhiteboardContent`): the inline `content` columns are dropped from the
 * DB, so the entities MUST NOT map them. TypeORM SELECTs an entity's mapped columns on
 * every load — the callout → framing → memo authorization path
 * (`CalloutService.applyAuthorizationPolicy` → loads the `framing.memo` relation) is one
 * such load. If `Memo` re-maps `content`, that load emits `SELECT ..._memo.content`,
 * which fails with `column "memo.content" does not exist` against the migrated schema and
 * breaks authorization application for EVERY callout (surfacing to the client as error
 * 11106 "AuthorizationPolicy without credential rules" — the whiteboard/memo editors then
 * never load). Asserting the column is unmapped proves no such SELECT can be generated,
 * without needing a live migrated DB (which is the E2E gate's job).
 */
describe('collab-content drop — entity schema regression (DropMemoAndWhiteboardContent)', () => {
  it('Memo maps NO `content` column, so no load can SELECT the dropped memo.content', () => {
    const columns = getMetadataArgsStorage()
      .filterColumns(Memo)
      .map(column => column.propertyName);
    expect(columns).not.toContain('content');
    // The pointer-based replacement IS mapped (content now lives only as a Yjs-V2
    // snapshot in file-service, located by contentPointer).
    expect(columns).toEqual(
      expect.arrayContaining(['contentPointer', 'contentVersion'])
    );
  });

  it('Whiteboard maps NO `content` column either (the parallel drop, already correct)', () => {
    const columns = getMetadataArgsStorage()
      .filterColumns(Whiteboard)
      .map(column => column.propertyName);
    expect(columns).not.toContain('content');
    expect(columns).toContain('contentPointer');
  });
});
