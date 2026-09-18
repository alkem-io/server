import {
  Column,
  DataSource,
  Entity,
  JoinColumn,
  LessThanOrEqual,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * Regression coverage for the whiteboard-draft sweep crash — Postgres 42703
 * `column distinctAlias.Whiteboard_draftExpiresAt does not exist`, thrown every
 * hour by WhiteboardDraftSweepService.sweep -> WhiteboardDraftService.findExpired.
 *
 * The service unit spec mocks the repository, so it proves findExpired builds a
 * join-free query but never sees the SQL TypeORM actually generates — which is
 * exactly where the bug lived. These tests build REAL SQL from REAL TypeORM
 * metadata. No database is involved: `getSql()` needs metadata, not a live
 * connection, and `DataSource.buildMetadatas()` builds metadata without one.
 *
 * The probe entity reproduces the shape that triggered the bug: a scalar `id`,
 * a nullable `draftExpiresAt` marker, and an EAGER one-to-one relation (the
 * real Whiteboard inherits an eager `authorization` relation). The eager
 * relation is the pivot: it forces a LEFT JOIN, which pushes `repository.find`
 * onto its distinct-alias pagination strategy.
 */

@Entity('draft_probe_authorization')
class DraftProbeAuthorization {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('int')
  version!: number;
}

@Entity('draft_probe_whiteboard')
class DraftProbeWhiteboard {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('timestamptz', { nullable: true })
  draftExpiresAt?: Date | null;

  @OneToOne(() => DraftProbeAuthorization, { eager: true, nullable: true })
  @JoinColumn()
  authorization?: DraftProbeAuthorization;
}

describe('findExpired sweep query (real TypeORM SQL generation)', () => {
  const dataSource = new DataSource({
    type: 'postgres',
    entities: [DraftProbeAuthorization, DraftProbeWhiteboard],
    synchronize: false,
  });
  beforeAll(async () => {
    // Build entity metadata without opening a connection (initialize() would
    // try to connect, and neither CI nor this test has a database). It is all
    // we need to generate SQL offline via getSql(). buildMetadatas is
    // `protected` and async — await it so entityMetadatas is populated before
    // any createQueryBuilder()/getMetadata() call runs.
    await (
      dataSource as unknown as { buildMetadatas(): Promise<void> }
    ).buildMetadatas();
  });

  // Assertions match on our own identifiers (draftExpiresAt / whiteboard / id)
  // and case-insensitive keywords, not exact quoting or keyword casing, so a
  // fork upgrade that changes SQL formatting can't silently break — or falsely
  // pass — these checks.

  it('the OLD find-options shape omits the ORDER BY column from its projection (the distinct-alias precondition)', () => {
    // What `repository.find({ select: { id: true },
    // order: { draftExpiresAt: 'ASC' }, take })` builds. NOTE: getSql() is the
    // inner query, before TypeORM's distinct-alias pagination wrapper; this test
    // asserts the *precondition* that makes that wrapper fail — the eager join
    // is present and the ORDER BY column is not projected — not the executed
    // `SELECT DISTINCT ... "distinctAlias"` itself (that is only built at
    // execution, needs a live connection, and is Postgres 42703). The
    // behavioural guard on findExpired's real code path is in
    // whiteboard.draft.service.spec.ts.
    const sql = dataSource
      .createQueryBuilder(DraftProbeWhiteboard, 'Whiteboard')
      .setFindOptions({
        select: { id: true },
        where: { draftExpiresAt: LessThanOrEqual(new Date()) },
        order: { draftExpiresAt: 'ASC' },
        take: 25,
      })
      .getSql();

    const projection = sql.slice(0, sql.indexOf(' FROM '));

    // The eager relation is joined in, and draftExpiresAt is referenced
    // (WHERE / ORDER BY)...
    expect(sql).toMatch(/left join/i);
    expect(sql).toContain('draftExpiresAt');
    // ...but it is never SELECTed, so the pagination wrapper's outer ORDER BY
    // would reference a column the derived table never exposes.
    expect(projection).not.toContain('draftExpiresAt');
  });

  it('the join-free findExpired query is flat and self-consistent', () => {
    // The shape findExpired now builds (object-where mirrors the real code).
    const sql = dataSource
      .createQueryBuilder(DraftProbeWhiteboard, 'whiteboard')
      .select('whiteboard.id', 'id')
      .where({ draftExpiresAt: LessThanOrEqual(new Date()) })
      .orderBy('whiteboard.draftExpiresAt', 'ASC')
      .limit(25)
      .getSql();

    // No eager join, so no distinct-alias pagination wrapper is generated...
    expect(sql).not.toMatch(/left join/i);
    expect(sql).not.toMatch(/distinctalias/i);
    // ...and everything the query references, it also selects.
    expect(sql).toMatch(/select\b[^;]*\bid\b/i);
    expect(sql).toMatch(/order by[^;]*draftExpiresAt[^;]*\basc\b/i);
    expect(sql).toMatch(/\blimit\b\s+25\b/i);
  });
});
