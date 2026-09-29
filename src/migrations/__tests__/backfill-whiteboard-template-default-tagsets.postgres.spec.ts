import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DataSource, QueryRunner } from 'typeorm';
import { BackfillWhiteboardTemplateDefaultTagsets1790669200000 } from '../1790669200000-BackfillWhiteboardTemplateDefaultTagsets';

const migrationDatabaseUrl = process.env.MIGRATION_TEST_DATABASE_URL;
const describeMigrationPostgres = migrationDatabaseUrl ? describe : describe.skip;

describeMigrationPostgres(
  'BackfillWhiteboardTemplateDefaultTagsets migration (PostgreSQL)',
  () => {
    let dataSource: DataSource;
    let queryRunner: QueryRunner;
    let schema: string;

    const insertPolicy = async (
      id: string,
      credentialRules: unknown[] = []
    ) => {
      await queryRunner.query(
        `INSERT INTO authorization_policy
          (id, "createdDate", "updatedDate", version, "credentialRules", "privilegeRules", type)
         VALUES ($1, NOW(), NOW(), 1, $2::jsonb, '[]'::jsonb, 'profile')`,
        [id, JSON.stringify(credentialRules)]
      );
    };

    const insertTemplateProfile = async ({
      profileId = randomUUID(),
      authorizationId = randomUUID(),
      withAuthorization = true,
    }: {
      profileId?: string;
      authorizationId?: string;
      withAuthorization?: boolean;
    } = {}) => {
      if (withAuthorization) {
        await insertPolicy(authorizationId, [
          { credential: 'space-member', cascade: true },
          { credential: 'profile-owner', cascade: false },
        ]);
      }
      const whiteboardId = randomUUID();
      await queryRunner.query(
        'INSERT INTO profile (id, "authorizationId") VALUES ($1, $2)',
        [profileId, withAuthorization ? authorizationId : null]
      );
      await queryRunner.query(
        'INSERT INTO whiteboard (id, "profileId") VALUES ($1, $2)',
        [whiteboardId, profileId]
      );
      await queryRunner.query(
        'INSERT INTO template (id, type, "whiteboardId") VALUES ($1, $2, $3)',
        [randomUUID(), 'whiteboard', whiteboardId]
      );
      return { profileId, authorizationId };
    };

    const insertDefaultTagset = async (profileId: string) => {
      const authorizationId = randomUUID();
      await insertPolicy(authorizationId);
      await queryRunner.query(
        `INSERT INTO tagset
          (id, "createdDate", "updatedDate", version, name, type, tags, "authorizationId", "profileId")
         VALUES ($1, NOW(), NOW(), 1, 'default', 'freeform', '', $2, $3)`,
        [randomUUID(), authorizationId, profileId]
      );
    };

    beforeAll(async () => {
      dataSource = new DataSource({
        type: 'postgres',
        url: migrationDatabaseUrl,
      });
      await dataSource.initialize();
    });

    beforeEach(async () => {
      schema = `tagset_migration_${randomUUID().replaceAll('-', '')}`;
      queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await queryRunner.query(`CREATE SCHEMA "${schema}"`);
      await queryRunner.query(`SET search_path TO "${schema}", public`);
      await queryRunner.query(
        'CREATE TABLE authorization_policy (id uuid PRIMARY KEY, "createdDate" timestamptz NOT NULL, "updatedDate" timestamptz NOT NULL, version integer NOT NULL, "credentialRules" jsonb NOT NULL, "privilegeRules" jsonb NOT NULL, type varchar NOT NULL)'
      );
      await queryRunner.query(
        'CREATE TABLE profile (id uuid PRIMARY KEY, "authorizationId" uuid NULL)'
      );
      await queryRunner.query(
        'CREATE TABLE whiteboard (id uuid PRIMARY KEY, "profileId" uuid NOT NULL)'
      );
      await queryRunner.query(
        'CREATE TABLE template (id uuid PRIMARY KEY, type varchar NOT NULL, "whiteboardId" uuid NOT NULL)'
      );
      await queryRunner.query(
        'CREATE TABLE tagset (id uuid PRIMARY KEY, "createdDate" timestamptz NOT NULL, "updatedDate" timestamptz NOT NULL, version integer NOT NULL, name varchar NOT NULL, type varchar NOT NULL, tags text NOT NULL, "authorizationId" uuid NOT NULL, "profileId" uuid NOT NULL)'
      );
    });

    afterEach(async () => {
      await queryRunner.query('RESET search_path');
      await queryRunner.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await queryRunner.release();
    });

    afterAll(async () => {
      if (dataSource?.isInitialized) await dataSource.destroy();
    });

    it('repairs arbitrary candidate counts, inherits cascading rules, and is idempotent', async () => {
      const first = await insertTemplateProfile();
      const second = await insertTemplateProfile();
      const existing = await insertTemplateProfile();
      await insertDefaultTagset(existing.profileId);
      const logs = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      let parsedLogs: unknown[] = [];

      try {
        const migration = new BackfillWhiteboardTemplateDefaultTagsets1790669200000();
        await migration.up(queryRunner);
        await migration.up(queryRunner);
        parsedLogs = logs.mock.calls.map(([message]) => JSON.parse(message));
      } finally {
        logs.mockRestore();
      }

      const defaults: Array<{ profileId: string; credentialRules: unknown[] }> =
        await queryRunner.query(`
          SELECT ts."profileId" AS "profileId", ap."credentialRules" AS "credentialRules"
          FROM tagset ts
          JOIN authorization_policy ap ON ap.id = ts."authorizationId"
          WHERE LOWER(ts.name) = 'default' AND ts.type = 'freeform'
          ORDER BY ts."profileId"
        `);
      expect(defaults).toHaveLength(3);
      expect(defaults.filter(defaultTagset => defaultTagset.profileId === first.profileId)[0]
        .credentialRules).toEqual([{ credential: 'space-member', cascade: true }]);
      expect(defaults.filter(defaultTagset => defaultTagset.profileId === second.profileId)[0]
        .credentialRules).toEqual([{ credential: 'space-member', cascade: true }]);

      expect(parsedLogs).toContainEqual(
        expect.objectContaining({ phase: 'preflight', candidateCount: 2 })
      );
      expect(parsedLogs).toContainEqual(
        expect.objectContaining({ phase: 'insert', insertedCount: 2 })
      );
      expect(parsedLogs).toContainEqual(
        expect.objectContaining({ phase: 'preflight', candidateCount: 0 })
      );
      expect(parsedLogs).toContainEqual(
        expect.objectContaining({ phase: 'insert', insertedCount: 0 })
      );
    });

    it('handles zero candidates without writes', async () => {
      const logs = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      let parsedLogs: unknown[] = [];
      try {
        await new BackfillWhiteboardTemplateDefaultTagsets1790669200000().up(
          queryRunner
        );
        parsedLogs = logs.mock.calls.map(([message]) => JSON.parse(message));
      } finally {
        logs.mockRestore();
      }

      const tagsets = await queryRunner.query('SELECT * FROM tagset');
      expect(tagsets).toEqual([]);
      expect(parsedLogs).toContainEqual(
        expect.objectContaining({ phase: 'preflight', candidateCount: 0 })
      );
    });

    it('rejects missing authorization and duplicates before writing', async () => {
      await insertTemplateProfile({ withAuthorization: false });
      await expect(
        new BackfillWhiteboardTemplateDefaultTagsets1790669200000().up(queryRunner)
      ).rejects.toThrow('missing its authorization policy');
      expect(await queryRunner.query('SELECT * FROM tagset')).toEqual([]);

      await queryRunner.query('DELETE FROM template');
      await queryRunner.query('DELETE FROM whiteboard');
      await queryRunner.query('DELETE FROM profile');
      const duplicate = await insertTemplateProfile();
      await insertDefaultTagset(duplicate.profileId);
      await insertDefaultTagset(duplicate.profileId);
      await expect(
        new BackfillWhiteboardTemplateDefaultTagsets1790669200000().up(queryRunner)
      ).rejects.toThrow('duplicate default freeform tagsets');
    });

    it('rejects a non-zero postflight remainder', async () => {
      await insertTemplateProfile();
      await queryRunner.query(`
        CREATE FUNCTION discard_default_tagset() RETURNS trigger AS $$
        BEGIN
          DELETE FROM tagset WHERE id = NEW.id;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);
      await queryRunner.query(`
        CREATE TRIGGER discard_default_tagset_after_insert
        AFTER INSERT ON tagset
        FOR EACH ROW EXECUTE FUNCTION discard_default_tagset()
      `);

      await expect(
        new BackfillWhiteboardTemplateDefaultTagsets1790669200000().up(queryRunner)
      ).rejects.toThrow('remains without a default freeform tagset');
    });
  }
);
