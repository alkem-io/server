import {
  Column,
  DataSource,
  Entity,
  JoinColumn,
  LessThanOrEqual,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { describe, expect, it } from 'vitest';

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
  // Build entity metadata without opening a connection (initialize() would try
  // to connect, and neither CI nor this test has a database). buildMetadatas is
  // `protected`, but it is all we need to generate SQL offline via getSql().
  (dataSource as unknown as { buildMetadatas(): void }).buildMetadatas();

  it('the OLD find-options shape leaves the ORDER BY column out of the projection', () => {
    // Exactly what `repository.find({ select: { id: true },
    // order: { draftExpiresAt: 'ASC' }, take })` builds — before TypeORM wraps
    // it for pagination.
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

    // The eager relation is joined in...
    expect(sql).toContain('LEFT JOIN');
    // ...`draftExpiresAt` is used in WHERE / ORDER BY...
    expect(sql).toContain('draftExpiresAt');
    // ...but it is never SELECTed. Because there is a join + a limit, TypeORM
    // paginates by wrapping this as `SELECT DISTINCT ... FROM (<this>)
    // "distinctAlias" ORDER BY "distinctAlias"."..._draftExpiresAt"` — a column
    // the derived table does not expose, which is the 42703 crash.
    expect(projection).not.toContain('draftExpiresAt');
  });

  it('the join-free findExpired query is flat and self-consistent', () => {
    // The shape findExpired now builds.
    const sql = dataSource
      .createQueryBuilder(DraftProbeWhiteboard, 'whiteboard')
      .select('whiteboard.id', 'id')
      .where('whiteboard.draftExpiresAt <= :now', { now: new Date() })
      .orderBy('whiteboard.draftExpiresAt', 'ASC')
      .limit(25)
      .getSql();

    // No eager join, so no distinct-alias pagination wrapper is generated...
    expect(sql).not.toContain('LEFT JOIN');
    expect(sql).not.toContain('distinctAlias');
    // ...and everything the query references, it also selects.
    expect(sql).toContain('"whiteboard"."id"');
    expect(sql).toContain('ORDER BY "whiteboard"."draftExpiresAt" ASC');
    expect(sql).toContain('LIMIT 25');
  });
});
