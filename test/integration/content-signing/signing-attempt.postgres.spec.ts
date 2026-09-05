import { ValidationException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { SigningAttempt } from '@domain/common/content-signing/signing.attempt.entity';
import { SigningAttemptService } from '@domain/common/content-signing/signing.attempt.service';
import { SigningAttemptStatus } from '@domain/common/content-signing/signing.attempt.status';
import { MemoService } from '@domain/common/memo/memo.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { HttpService } from '@nestjs/axios';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { CreateSigningAttempt1788609600000 } from '@src/migrations/1788609600000-CreateSigningAttempt';
import { DataSource, EntitySchema, EntitySchemaOptions } from 'typeorm';
import { vi } from 'vitest';

const describeRealServices =
  process.env.CONTENT_SIGNING_REAL_SERVICES === 'true'
    ? describe
    : describe.skip;

const UUIDS = {
  memo: '11111111-1111-4111-8111-111111111111',
  actor: '22222222-2222-4222-8222-222222222222',
  snapshot: '33333333-3333-4333-8333-333333333333',
  bucket: '44444444-4444-4444-8444-444444444444',
  profile: '55555555-5555-4555-8555-555555555555',
  authorization: '66666666-6666-4666-8666-666666666666',
};

const fixtureSchema = (
  name: string,
  tableName: string,
  columns: EntitySchemaOptions<Record<string, unknown>>['columns']
) =>
  new EntitySchema<Record<string, unknown>>({
    name,
    tableName,
    columns,
  });

const idColumn = { type: 'uuid' as const, primary: true };
const MemoFixture = fixtureSchema('MemoFixture', 'memo', { id: idColumn });
const ProfileFixture = fixtureSchema('ProfileFixture', 'profile', {
  id: idColumn,
});
const StorageBucketFixture = fixtureSchema(
  'StorageBucketFixture',
  'storage_bucket',
  { id: idColumn }
);
const AuthorizationFixture = fixtureSchema(
  'AuthorizationFixture',
  'authorization_policy',
  { id: idColumn }
);
const DocumentFixture = fixtureSchema('DocumentFixture', 'file', {
  id: idColumn,
  externalID: { type: String, length: 128 },
  mimeType: { type: String },
  size: { type: Number },
  displayName: { type: String },
  createdBy: { type: 'uuid', nullable: true },
  temporaryLocation: { type: Boolean },
  storageBucketId: { type: 'uuid' },
  authorizationId: { type: 'uuid', nullable: true },
  tagsetId: { type: 'uuid', nullable: true },
  createdDate: { type: Date },
  updatedDate: { type: Date },
  version: { type: Number },
  content_metadata: { type: 'jsonb' },
});

const logger: LoggerService = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

const createBarrier = () => {
  let release!: () => void;
  const waiting = new Promise<void>(resolve => {
    release = resolve;
  });
  return { waiting, release };
};

describeRealServices('SigningAttempt — PostgreSQL and file-service', () => {
  let dataSource: DataSource;
  let migration: CreateSigningAttempt1788609600000;
  let attemptService: SigningAttemptService;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.CONTENT_SIGNING_DB_HOST,
      port: Number(process.env.CONTENT_SIGNING_DB_PORT),
      username: process.env.CONTENT_SIGNING_DB_USER,
      password: process.env.CONTENT_SIGNING_DB_PASSWORD,
      database: process.env.CONTENT_SIGNING_DB_NAME,
      entities: [
        SigningAttempt,
        MemoFixture,
        ProfileFixture,
        StorageBucketFixture,
        AuthorizationFixture,
        DocumentFixture,
      ],
    });
    await dataSource.initialize();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.query('DROP TABLE IF EXISTS "signing_attempt" CASCADE');
    await dataSource.query(
      'DROP TYPE IF EXISTS "signing_attempt_status_enum" CASCADE'
    );
    await dataSource.query('DROP TABLE IF EXISTS "file" CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS "memo" CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS "profile" CASCADE');
    await dataSource.query('DROP TABLE IF EXISTS "storage_bucket" CASCADE');
    await dataSource.query(
      'DROP TABLE IF EXISTS "authorization_policy" CASCADE'
    );
    await dataSource.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await dataSource.query('CREATE TABLE "memo" (id uuid PRIMARY KEY)');
    await dataSource.query('CREATE TABLE "profile" (id uuid PRIMARY KEY)');
    await dataSource.query(
      'CREATE TABLE "storage_bucket" (id uuid PRIMARY KEY)'
    );
    await dataSource.query(
      'CREATE TABLE "authorization_policy" (id uuid PRIMARY KEY)'
    );
    await dataSource.query(`CREATE TABLE "file" (
      id uuid PRIMARY KEY,
      "externalID" varchar(128) NOT NULL,
      "mimeType" varchar(128) NOT NULL,
      size integer NOT NULL,
      "displayName" varchar(512) NOT NULL,
      "createdBy" uuid NULL,
      "temporaryLocation" boolean NOT NULL DEFAULT false,
      "storageBucketId" uuid NOT NULL,
      "authorizationId" uuid NULL,
      "tagsetId" uuid NULL,
      "createdDate" timestamptz NOT NULL DEFAULT now(),
      "updatedDate" timestamptz NOT NULL DEFAULT now(),
      version integer NOT NULL DEFAULT 1,
      content_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    )`);

    migration = new CreateSigningAttempt1788609600000();
    await migration.up(dataSource.createQueryRunner());
    attemptService = new SigningAttemptService(
      dataSource.getRepository(SigningAttempt)
    );
  });

  it('creates the one table with the exact enum, columns, indexes, unique keys, and FK deletion rules', async () => {
    const columns: Array<{
      column_name: string;
      is_nullable: string;
      data_type: string;
      column_default: string | null;
    }> = await dataSource.query(`
      SELECT column_name, is_nullable, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'signing_attempt'
      ORDER BY ordinal_position
    `);
    expect(columns.map(column => column.column_name)).toEqual([
      'id',
      'createdDate',
      'updatedDate',
      'version',
      'memoId',
      'actorId',
      'contentSha256',
      'snapshotDocumentId',
      'correlationId',
      'expiresAt',
      'clientStateHash',
      'status',
      'signedDocumentId',
      'signerEvidence',
    ]);
    expect(columns.find(column => column.column_name === 'id')).toMatchObject({
      is_nullable: 'NO',
      data_type: 'uuid',
    });
    expect(
      columns.find(column => column.column_name === 'id')?.column_default
    ).toContain('uuid_generate_v4');
    expect(
      columns.find(column => column.column_name === 'contentSha256')
    ).toMatchObject({ is_nullable: 'YES', data_type: 'character varying' });
    expect(
      columns.find(column => column.column_name === 'signerEvidence')
    ).toMatchObject({ is_nullable: 'YES', data_type: 'jsonb' });

    const enumValues: Array<{ enumlabel: string }> = await dataSource.query(`
      SELECT enumlabel
      FROM pg_enum
      JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
      WHERE pg_type.typname = 'signing_attempt_status_enum'
      ORDER BY enumsortorder
    `);
    expect(enumValues.map(value => value.enumlabel)).toEqual([
      'pending',
      'signed',
      'cancelled',
      'failed',
      'expired',
    ]);

    const indexes: Array<{ indexname: string }> = await dataSource.query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'signing_attempt'
    `);
    expect(indexes.map(index => index.indexname)).toEqual(
      expect.arrayContaining([
        'IDX_signing_attempt_memo_status',
        'IDX_signing_attempt_status_expiresAt',
        'IDX_signing_attempt_status_createdDate',
        'IDX_signing_attempt_snapshotDocumentId',
        'IDX_signing_attempt_signedDocumentId',
        'UQ_signing_attempt_correlationId',
        'UQ_signing_attempt_clientStateHash',
      ])
    );

    const constraints: Array<{
      column_name: string;
      foreign_table: string;
      delete_rule: string;
    }> = await dataSource.query(`
      SELECT kcu.column_name,
             ccu.table_name AS foreign_table,
             rc.delete_rule
      FROM information_schema.referential_constraints rc
      JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name = rc.constraint_name
       AND kcu.constraint_schema = rc.constraint_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = rc.unique_constraint_name
       AND ccu.constraint_schema = rc.unique_constraint_schema
      WHERE rc.constraint_schema = 'public'
        AND kcu.table_name = 'signing_attempt'
      ORDER BY kcu.column_name
    `);
    expect(constraints).toEqual([
      { column_name: 'memoId', foreign_table: 'memo', delete_rule: 'CASCADE' },
      {
        column_name: 'signedDocumentId',
        foreign_table: 'file',
        delete_rule: 'RESTRICT',
      },
      {
        column_name: 'snapshotDocumentId',
        foreign_table: 'file',
        delete_rule: 'RESTRICT',
      },
    ]);
  });

  it('reverts the table, indexes, and enum cleanly', async () => {
    await migration.down(dataSource.createQueryRunner());

    const [{ table_exists: tableExists }] = await dataSource.query(
      `SELECT to_regclass('public.signing_attempt') IS NOT NULL AS table_exists`
    );
    const [{ type_exists: typeExists }] = await dataSource.query(
      `SELECT to_regtype('public.signing_attempt_status_enum') IS NOT NULL AS type_exists`
    );
    expect(tableExists).toBe(false);
    expect(typeExists).toBe(false);
  });

  it('keeps actor attribution without a user FK and cascades attempts only with their memo', async () => {
    await dataSource.query('INSERT INTO memo (id) VALUES ($1)', [UUIDS.memo]);
    const attempt = await attemptService.createUnready(UUIDS.memo, UUIDS.actor);

    expect(attempt.actorId).toBe(UUIDS.actor);
    await dataSource.query('DELETE FROM memo WHERE id = $1', [UUIDS.memo]);

    await expect(
      dataSource.getRepository(SigningAttempt).count()
    ).resolves.toBe(0);
  });

  it('allows multiple null gateway keys but rejects duplicate correlation and client-state hashes', async () => {
    await dataSource.query('INSERT INTO memo (id) VALUES ($1)', [UUIDS.memo]);
    const first = await attemptService.createUnready(UUIDS.memo, UUIDS.actor);
    const second = await attemptService.createUnready(UUIDS.memo, UUIDS.actor);
    const repository = dataSource.getRepository(SigningAttempt);

    await expect(repository.count()).resolves.toBe(2);
    await repository.update(first.id, {
      correlationId: 'correlation-1',
      clientStateHash: 'cd'.repeat(32),
    });
    await expect(
      repository.update(second.id, { correlationId: 'correlation-1' })
    ).rejects.toThrow();
    await expect(
      repository.update(second.id, { clientStateHash: 'cd'.repeat(32) })
    ).rejects.toThrow();
  });

  it.each([
    'snapshotDocumentId',
    'signedDocumentId',
  ] as const)('makes the actual file-service preserve row and bytes while %s retains them, then allows retry after release', async retainedField => {
    await dataSource.query('INSERT INTO memo (id) VALUES ($1)', [UUIDS.memo]);
    await dataSource.query('INSERT INTO storage_bucket (id) VALUES ($1)', [
      UUIDS.bucket,
    ]);
    const { fileAdapter } = createActualDeletionServices(
      dataSource,
      attemptService
    );
    const content = Buffer.from(retainedField);
    const document = await fileAdapter.createDocument(content, {
      displayName: `${retainedField}.txt`,
      mimeType: 'text/plain',
      storageBucketId: UUIDS.bucket,
      authorizationId: '77777777-7777-4777-8777-777777777777',
      allowedMimeTypes: 'text/plain',
      maxFileSize: 1_024,
      skipDedup: true,
    });
    const attempt = await attemptService.createUnready(UUIDS.memo, UUIDS.actor);
    await dataSource.getRepository(SigningAttempt).update(attempt.id, {
      [retainedField]: document.id,
      status:
        retainedField === 'signedDocumentId'
          ? SigningAttemptStatus.SIGNED
          : SigningAttemptStatus.PENDING,
    });

    await expect(fileAdapter.deleteDocument(document.id)).rejects.toThrow();
    await expect(fileAdapter.getDocumentContent(document.id)).resolves.toEqual(
      content
    );

    await attemptService.deleteForMemo(UUIDS.memo);
    await expect(fileAdapter.deleteDocument(document.id)).resolves.toEqual({
      authorizationId: '77777777-7777-4777-8777-777777777777',
    });
    await expect(fileAdapter.getDocumentContent(document.id)).rejects.toThrow();
  });

  it('runs the actual concurrent prepare/delete path: the bucket preflight fails without side effects, then MemoService retry releases the attempt before file cleanup', async () => {
    await seedDeletionGraph();
    const services = createActualDeletionServices(dataSource, attemptService);
    const content = Buffer.from('signed copy');
    const snapshot = await services.fileAdapter.createDocument(content, {
      displayName: 'signed-copy.txt',
      mimeType: 'text/plain',
      storageBucketId: UUIDS.bucket,
      authorizationId: '77777777-7777-4777-8777-777777777777',
      allowedMimeTypes: 'text/plain',
      maxFileSize: 1_024,
      skipDedup: true,
    });
    services.bucketEntity.documents = [
      {
        id: snapshot.id,
        externalID: snapshot.externalID,
        authorization: undefined,
        tagset: undefined,
      },
    ];
    const profileRead = createBarrier();
    const profileEntered = createBarrier();
    let blockProfileRead = true;

    vi.spyOn(services.memo, 'getMemoOrFail').mockResolvedValue(
      services.memoEntity as any
    );
    vi.spyOn(services.profile, 'getProfileOrFail').mockImplementation(
      async () => {
        if (blockProfileRead) {
          profileEntered.release();
          await profileRead.waiting;
        }
        return services.profileEntity as any;
      }
    );
    vi.spyOn(services.bucket, 'getStorageBucketOrFail').mockResolvedValue(
      services.bucketEntity as any
    );

    const firstDelete = services.memo.deleteMemo(UUIDS.memo);
    await profileEntered.waiting;

    const concurrentAttempt = await attemptService.createUnready(
      UUIDS.memo,
      UUIDS.actor
    );
    await expect(
      attemptService.finalizePrepared(
        concurrentAttempt.id,
        snapshot.id,
        'ab'.repeat(32)
      )
    ).resolves.toBe(true);

    await expect(
      services.fileAdapter.getDocumentContent(snapshot.id)
    ).resolves.toEqual(content);

    await expect(
      services.document.deleteDocument({ ID: snapshot.id })
    ).rejects.toThrow();
    await expect(
      services.fileAdapter.getDocumentContent(snapshot.id)
    ).resolves.toEqual(content);

    profileRead.release();
    await expect(firstDelete).rejects.toThrow(ValidationException);
    expect(services.authorization.delete).not.toHaveBeenCalled();
    await expect(rowExists('memo', UUIDS.memo)).resolves.toBe(true);
    await expect(rowExists('file', snapshot.id)).resolves.toBe(true);

    blockProfileRead = false;
    await expect(services.memo.deleteMemo(UUIDS.memo)).resolves.toMatchObject({
      id: UUIDS.memo,
    });

    await expect(
      dataSource.getRepository(SigningAttempt).count()
    ).resolves.toBe(0);
    await expect(
      services.fileAdapter.getDocumentContent(snapshot.id)
    ).rejects.toThrow();
    await expect(rowExists('file', snapshot.id)).resolves.toBe(false);
    await expect(rowExists('memo', UUIDS.memo)).resolves.toBe(false);
  });

  async function seedDeletionGraph(): Promise<void> {
    await dataSource.query('INSERT INTO memo (id) VALUES ($1)', [UUIDS.memo]);
    await dataSource.query('INSERT INTO profile (id) VALUES ($1)', [
      UUIDS.profile,
    ]);
    await dataSource.query('INSERT INTO storage_bucket (id) VALUES ($1)', [
      UUIDS.bucket,
    ]);
    await dataSource.query(
      'INSERT INTO authorization_policy (id) VALUES ($1)',
      [UUIDS.authorization]
    );
  }

  function createActualDeletionServices(
    source: DataSource,
    signingAttempts: SigningAttemptService
  ) {
    const config = new ConfigService({
      authorization: { chunk: 100 },
      storage: {
        file_service: {
          enabled: true,
          url: process.env.CONTENT_SIGNING_FILE_SERVICE_URL,
          timeout: 2_000,
          retries: 0,
        },
      },
    }) as any;
    const fileAdapter = new FileServiceAdapter(
      new HttpService(),
      config,
      logger
    );
    const authorization = new AuthorizationPolicyService(
      source.getRepository(AuthorizationFixture) as any,
      {} as any,
      logger,
      config
    );
    vi.spyOn(authorization, 'delete');
    const tagsets = { removeTagset: vi.fn() } as any;
    const document = new DocumentService(
      config,
      authorization,
      tagsets,
      source.getRepository(DocumentFixture) as any,
      logger,
      fileAdapter
    );
    const unused = {} as any;
    const bucket = new StorageBucketService(
      document,
      unused,
      unused,
      authorization,
      unused,
      unused,
      source.getRepository(StorageBucketFixture) as any,
      source.getRepository(DocumentFixture) as any,
      logger,
      source.getRepository(ProfileFixture) as any,
      config,
      fileAdapter,
      tagsets,
      signingAttempts
    );
    const profile = new ProfileService(
      authorization,
      bucket,
      tagsets,
      unused,
      unused,
      unused,
      unused,
      source.getRepository(ProfileFixture) as any,
      logger
    );
    const lifecycle = {
      publishDocumentDeleted: vi.fn().mockResolvedValue(undefined),
    };
    const memo = new MemoService(
      logger,
      source.getRepository(MemoFixture) as any,
      authorization,
      profile,
      unused,
      unused,
      unused,
      lifecycle as any,
      fileAdapter,
      unused,
      signingAttempts
    );
    const bucketEntity = {
      id: UUIDS.bucket,
      authorization: undefined,
      documents: [] as any[],
    };
    const profileEntity = {
      id: UUIDS.profile,
      authorization: undefined,
      storageBucket: bucketEntity,
      tagsets: [],
      references: [],
      visuals: [],
      location: undefined,
    };
    const memoEntity = {
      id: UUIDS.memo,
      authorization: { id: UUIDS.authorization },
      profile: profileEntity,
    };
    return {
      authorization,
      bucket,
      bucketEntity,
      document,
      fileAdapter,
      memo,
      memoEntity,
      profile,
      profileEntity,
    };
  }

  async function rowExists(table: string, id: string): Promise<boolean> {
    const [{ exists }] = await dataSource.query(
      `SELECT EXISTS(SELECT 1 FROM "${table}" WHERE id = $1) AS exists`,
      [id]
    );
    return exists;
  }
});
