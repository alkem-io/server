import { randomUUID } from 'node:crypto';
import { DataSource, QueryRunner } from 'typeorm';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { CleanUpOrphanedRecordsAndPolicies1790800000000 } from '../1790800000000-CleanUpOrphanedRecordsAndPolicies';

const migrationDatabaseUrl = process.env.MIGRATION_TEST_DATABASE_URL;
const describeMigrationPostgres = migrationDatabaseUrl
  ? describe
  : describe.skip;

const OLD = "now() - interval '30 days'";
const RECENT = 'now()';

// The real foreign keys that matter, by delete rule: owners hold a unique
// SET NULL reference, children a cascading one (alkem-io/server#6614).
const SCHEMA_DDL = [
  'CREATE TABLE authorization_policy (id uuid PRIMARY KEY, "createdDate" timestamptz NOT NULL)',
  'CREATE TABLE location (id uuid PRIMARY KEY, "createdDate" timestamptz NOT NULL)',
  `CREATE TABLE storage_bucket (id uuid PRIMARY KEY, "createdDate" timestamptz NOT NULL,
     "authorizationId" uuid UNIQUE REFERENCES authorization_policy(id) ON DELETE SET NULL)`,
  `CREATE TABLE file (id uuid PRIMARY KEY,
     "authorizationId" uuid UNIQUE REFERENCES authorization_policy(id) ON DELETE SET NULL,
     "storageBucketId" uuid REFERENCES storage_bucket(id) ON DELETE CASCADE)`,
  `CREATE TABLE profile (id uuid PRIMARY KEY, "createdDate" timestamptz NOT NULL,
     "authorizationId" uuid UNIQUE REFERENCES authorization_policy(id) ON DELETE SET NULL,
     "locationId" uuid UNIQUE REFERENCES location(id) ON DELETE SET NULL,
     "storageBucketId" uuid UNIQUE REFERENCES storage_bucket(id) ON DELETE SET NULL)`,
  `CREATE TABLE actor (id uuid PRIMARY KEY,
     "authorizationId" uuid UNIQUE REFERENCES authorization_policy(id) ON DELETE SET NULL,
     "profileId" uuid UNIQUE REFERENCES profile(id) ON DELETE SET NULL)`,
  `CREATE TABLE classification (id uuid PRIMARY KEY, "createdDate" timestamptz NOT NULL,
     "authorizationId" uuid UNIQUE REFERENCES authorization_policy(id) ON DELETE SET NULL)`,
  `CREATE TABLE callout (id uuid PRIMARY KEY,
     "authorizationId" uuid UNIQUE REFERENCES authorization_policy(id) ON DELETE SET NULL,
     "classificationId" uuid UNIQUE REFERENCES classification(id) ON DELETE SET NULL)`,
  `CREATE TABLE tagset (id uuid PRIMARY KEY,
     "authorizationId" uuid UNIQUE REFERENCES authorization_policy(id) ON DELETE SET NULL,
     "classificationId" uuid REFERENCES classification(id) ON DELETE CASCADE,
     "profileId" uuid REFERENCES profile(id) ON DELETE CASCADE)`,
  `CREATE TABLE license (id uuid PRIMARY KEY, "createdDate" timestamptz NOT NULL,
     "authorizationId" uuid UNIQUE REFERENCES authorization_policy(id) ON DELETE SET NULL)`,
  `CREATE TABLE license_entitlement (id uuid PRIMARY KEY,
     "licenseId" uuid REFERENCES license(id) ON DELETE CASCADE)`,
  `CREATE TABLE space (id uuid PRIMARY KEY,
     "licenseId" uuid UNIQUE REFERENCES license(id) ON DELETE SET NULL)`,
  // A migration backup table: names a policy without a foreign key.
  'CREATE TABLE _auth_profile_backup_space (id uuid PRIMARY KEY, "authorizationId" uuid)',
];

describeMigrationPostgres(
  'CleanUpOrphanedRecordsAndPolicies migration (PostgreSQL)',
  () => {
    let dataSource: DataSource;
    let queryRunner: QueryRunner;
    let schema: string;

    const policy = async (created = OLD) => {
      const id = randomUUID();
      await queryRunner.query(
        `INSERT INTO authorization_policy (id, "createdDate") VALUES ($1, ${created})`,
        [id]
      );
      return id;
    };

    const classification = async (created = OLD) => {
      const id = randomUUID();
      const tagsetPolicy = await policy();
      const ownPolicy = await policy();
      await queryRunner.query(
        `INSERT INTO classification (id, "createdDate", "authorizationId") VALUES ($1, ${created}, $2)`,
        [id, ownPolicy]
      );
      const tagset = randomUUID();
      await queryRunner.query(
        'INSERT INTO tagset (id, "authorizationId", "classificationId") VALUES ($1, $2, $3)',
        [tagset, tagsetPolicy, id]
      );
      return { id, tagset, policies: [ownPolicy, tagsetPolicy] };
    };

    const profile = async ({ withFile = false } = {}) => {
      const id = randomUUID();
      const location = randomUUID();
      const bucket = randomUUID();
      const bucketPolicy = await policy();
      const ownPolicy = await policy();
      await queryRunner.query(
        `INSERT INTO location (id, "createdDate") VALUES ($1, ${OLD})`,
        [location]
      );
      await queryRunner.query(
        `INSERT INTO storage_bucket (id, "createdDate", "authorizationId") VALUES ($1, ${OLD}, $2)`,
        [bucket, bucketPolicy]
      );
      let filePolicy: string | undefined;
      if (withFile) {
        filePolicy = await policy();
        await queryRunner.query(
          'INSERT INTO file (id, "authorizationId", "storageBucketId") VALUES ($1, $2, $3)',
          [randomUUID(), filePolicy, bucket]
        );
      }
      await queryRunner.query(
        `INSERT INTO profile (id, "createdDate", "authorizationId", "locationId", "storageBucketId")
         VALUES ($1, ${OLD}, $2, $3, $4)`,
        [id, ownPolicy, location, bucket]
      );
      return { id, location, bucket, ownPolicy, bucketPolicy, filePolicy };
    };

    const license = async () => {
      const id = randomUUID();
      await queryRunner.query(
        `INSERT INTO license (id, "createdDate", "authorizationId") VALUES ($1, ${OLD}, $2)`,
        [id, await policy()]
      );
      await queryRunner.query(
        'INSERT INTO license_entitlement (id, "licenseId") VALUES ($1, $2)',
        [randomUUID(), id]
      );
      return id;
    };

    const exists = async (table: string, id: string) =>
      (
        await queryRunner.query(`SELECT 1 FROM "${table}" WHERE id = $1`, [
          id,
        ])
      ).length === 1;

    const count = async (sql: string, params: unknown[]) =>
      (await queryRunner.query(sql, params))[0].count;

    const runMigration = () =>
      new CleanUpOrphanedRecordsAndPolicies1790800000000().up(queryRunner);

    beforeAll(async () => {
      dataSource = new DataSource({ type: 'postgres', url: migrationDatabaseUrl });
      await dataSource.initialize();
    });

    beforeEach(async () => {
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      schema = `orphan_cleanup_${randomUUID().replaceAll('-', '')}`;
      queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.query(`CREATE SCHEMA "${schema}"`);
      await queryRunner.query(`SET search_path TO "${schema}"`);
      for (const ddl of SCHEMA_DDL) await queryRunner.query(ddl);
    });

    afterEach(async () => {
      await queryRunner.query('RESET search_path');
      await queryRunner.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await queryRunner.release();
      vi.restoreAllMocks();
    });

    afterAll(async () => {
      if (dataSource?.isInitialized) await dataSource.destroy();
    });

    it('deletes an unowned classification with its tagsets and their policies, and keeps an owned one', async () => {
      const orphan = await classification();
      const owned = await classification();
      await queryRunner.query(
        'INSERT INTO callout (id, "classificationId") VALUES ($1, $2)',
        [randomUUID(), owned.id]
      );

      await runMigration();

      expect(await exists('classification', orphan.id)).toBe(false);
      expect(await exists('tagset', orphan.tagset)).toBe(false);
      for (const id of orphan.policies) {
        expect(await exists('authorization_policy', id)).toBe(false);
      }
      expect(await exists('classification', owned.id)).toBe(true);
      expect(await exists('tagset', owned.tagset)).toBe(true);
      for (const id of owned.policies) {
        expect(await exists('authorization_policy', id)).toBe(true);
      }
    });

    it('deletes an unowned license with its entitlements, and keeps an owned one', async () => {
      const orphan = await license();
      const owned = await license();
      await queryRunner.query('INSERT INTO space (id, "licenseId") VALUES ($1, $2)', [
        randomUUID(),
        owned,
      ]);

      await runMigration();

      expect(await exists('license', orphan)).toBe(false);
      expect(
        await count(
          'SELECT count(*)::int AS count FROM license_entitlement WHERE "licenseId" = $1',
          [orphan]
        )
      ).toBe(0);
      expect(await exists('license', owned)).toBe(true);
      expect(
        await count(
          'SELECT count(*)::int AS count FROM license_entitlement WHERE "licenseId" = $1',
          [owned]
        )
      ).toBe(1);
    });

    it("deletes an unowned profile with its location, empty bucket and policies, and keeps an actor's profile", async () => {
      const orphan = await profile();
      const owned = await profile();
      await queryRunner.query('INSERT INTO actor (id, "profileId") VALUES ($1, $2)', [
        randomUUID(),
        owned.id,
      ]);

      await runMigration();

      expect(await exists('profile', orphan.id)).toBe(false);
      expect(await exists('location', orphan.location)).toBe(false);
      expect(await exists('storage_bucket', orphan.bucket)).toBe(false);
      expect(await exists('authorization_policy', orphan.ownPolicy)).toBe(false);
      expect(await exists('authorization_policy', orphan.bucketPolicy)).toBe(
        false
      );
      expect(await exists('profile', owned.id)).toBe(true);
      expect(await exists('location', owned.location)).toBe(true);
      expect(await exists('storage_bucket', owned.bucket)).toBe(true);
      expect(await exists('authorization_policy', owned.ownPolicy)).toBe(true);
    });

    it('never deletes a file: a bucket that still holds one is left with its policies', async () => {
      const orphan = await profile({ withFile: true });

      await runMigration();

      expect(await exists('profile', orphan.id)).toBe(false);
      expect(await exists('storage_bucket', orphan.bucket)).toBe(true);
      expect(
        await count(
          'SELECT count(*)::int AS count FROM file WHERE "storageBucketId" = $1',
          [orphan.bucket]
        )
      ).toBe(1);
      expect(await exists('authorization_policy', orphan.bucketPolicy)).toBe(
        true
      );
      expect(
        await exists('authorization_policy', orphan.filePolicy as string)
      ).toBe(true);
    });

    it('deletes old unreferenced policies only, keeping recent ones and ones a backup table names', async () => {
      const old = await policy();
      const recent = await policy(RECENT);
      const backedUp = await policy();
      await queryRunner.query(
        'INSERT INTO _auth_profile_backup_space (id, "authorizationId") VALUES ($1, $2)',
        [randomUUID(), backedUp]
      );

      await runMigration();

      expect(await exists('authorization_policy', old)).toBe(false);
      expect(await exists('authorization_policy', recent)).toBe(true);
      expect(await exists('authorization_policy', backedUp)).toBe(true);
    });

    it('keeps an unowned record created in the last day (a create may still be in flight)', async () => {
      const recent = await classification(RECENT);

      await runMigration();

      expect(await exists('classification', recent.id)).toBe(true);
      expect(await exists('tagset', recent.tagset)).toBe(true);
    });

    it('is idempotent', async () => {
      await classification();
      await profile({ withFile: true });

      await runMigration();
      await expect(runMigration()).resolves.toBeUndefined();
    });
  }
);
