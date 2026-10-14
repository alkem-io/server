import { randomUUID } from 'node:crypto';
import { createServer, request as httpRequest, type Server } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { MimeFileType } from '@common/enums/mime.file.type';
import { RoomType } from '@common/enums/room.type';
import { SpaceLevel } from '@common/enums/space.level';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { CalloutContribution } from '@domain/collaboration/callout-contribution/callout.contribution.entity';
import { CalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.entity';
import { Collaboration } from '@domain/collaboration/collaboration/collaboration.entity';
import { Post } from '@domain/collaboration/post/post.entity';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Profile } from '@domain/common/profile/profile.entity';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { Conversation } from '@domain/communication/conversation/conversation.entity';
import { Room } from '@domain/communication/room/room.entity';
import { Space } from '@domain/space/space/space.entity';
import { Document } from '@domain/storage/document/document.entity';
import type { IDocument } from '@domain/storage/document/document.interface';
import { DocumentService } from '@domain/storage/document/document.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { StorageBucket } from '@domain/storage/storage-bucket/storage.bucket.entity';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
import { HttpService } from '@nestjs/axios';
import type { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { RoomResolverService } from '@services/infrastructure/entity-resolver/room.resolver.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { AddContentMetadataToFile1778198400000 } from '@src/migrations/1778198400000-AddContentMetadataToFile';
import type { AlkemioConfig } from '@src/types/alkemio.config';
import axios from 'axios';
import { DataSource, getMetadataArgsStorage, In } from 'typeorm';
import { MessageAttachmentService } from './message.attachment.service';

const realServices = process.env.ATTACHMENT_PLACEMENT_REAL_SERVICES === 'true';
const describeRealServices = realServices ? describe : describe.skip;
const logger: LoggerService = { log() {}, warn() {}, error() {}, verbose() {} };
const stagingId = '00000000-0000-4000-8000-000000000013';
const fixtureMime = 'application/octet-stream' as MimeFileType;
const bytes = Buffer.concat([
  Buffer.from([0, 255, 1, 0, 128]),
  Buffer.from('082 actual file-service placement fixture'),
]);

// Every file mutation below travels through the Go HTTP service. TypeORM only
// creates the real server schema/owners/policies and reads file rows.
describeRealServices(
  'attachment placement — real PostgreSQL and Go HTTP',
  () => {
    let database: DataSource;
    let files: FileServiceAdapter;
    let placement: MessageAttachmentService;
    let policies: AuthorizationPolicyService;
    let fileServiceUrl: string;
    const proxies: Server[] = [];

    const configuration = (url: string) =>
      new ConfigService({
        authorization: { chunk: 100 },
        storage: {
          file_service: {
            enabled: true,
            url,
            timeout: 15_000,
            retries: 2,
            matrix_media_bucket_id: stagingId,
          },
        },
      }) as ConfigService<AlkemioConfig, true>;

    function services(url: string) {
      const config = configuration(url);
      const http = new HttpService(axios.create({ proxy: false }));
      const adapter = new FileServiceAdapter(http, config, logger);
      const authorization = new AuthorizationService(logger);
      const policy = new AuthorizationPolicyService(
        database.getRepository(AuthorizationPolicy),
        authorization,
        logger,
        config
      );
      const tagsets = new TagsetService(
        policy,
        database.getRepository(Tagset),
        logger
      );
      const document = new DocumentService(
        config,
        policy,
        tagsets,
        database.getRepository(Document),
        logger,
        adapter
      );
      const bucket = new StorageBucketService(
        document,
        new DocumentAuthorizationService(policy),
        undefined as never,
        policy,
        authorization,
        undefined as never,
        database.getRepository(StorageBucket),
        database.getRepository(Document),
        logger,
        database.getRepository(Profile),
        config as unknown as ConfigService,
        adapter,
        tagsets,
        undefined as never
      );
      const messages = new MessageAttachmentService(
        config,
        bucket,
        new StorageAggregatorResolverService(
          undefined as never,
          database.manager,
          database.getRepository(StorageAggregator),
          logger
        ),
        new RoomResolverService(database.manager, logger),
        database.getRepository(Conversation),
        database.getRepository(Document),
        logger
      );
      return { adapter, document, bucket, messages, policy };
    }

    beforeAll(async () => {
      fileServiceUrl = process.env.ATTACHMENT_PLACEMENT_FILE_SERVICE_URL ?? '';
      if (!fileServiceUrl || !process.env.ATTACHMENT_PLACEMENT_DB_PORT)
        throw new Error('Use the dedicated real-service fixture runner');
      database = new DataSource({
        type: 'postgres',
        host: process.env.ATTACHMENT_PLACEMENT_DB_HOST,
        port: Number(process.env.ATTACHMENT_PLACEMENT_DB_PORT),
        username: process.env.ATTACHMENT_PLACEMENT_DB_USER,
        password: process.env.ATTACHMENT_PLACEMENT_DB_PASSWORD,
        database: process.env.ATTACHMENT_PLACEMENT_DB_NAME,
        // Existing persisted-owner fixture pattern: register the actual entity
        // graph, including imported relation targets and the real unique index.
        entities: [
          ...new Set(
            getMetadataArgsStorage().tables.map(table => table.target)
          ),
        ].filter(target => typeof target !== 'string'),
      });
      await database.initialize();
      await database.synchronize();
      // This Go-owned column is deliberately absent from the TypeORM entity.
      // Apply its real server migration rather than inventing a fixture schema.
      const migrationRunner = database.createQueryRunner();
      try {
        await new AddContentMetadataToFile1778198400000().up(migrationRunner);
      } finally {
        await migrationRunner.release();
      }
      const actual = services(fileServiceUrl);
      files = actual.adapter;
      placement = actual.messages;
      policies = actual.policy;
      await database.getRepository(StorageBucket).save({
        id: stagingId,
        allowedMimeTypes: [],
        maxFileSize: 0,
      });
      // A missing reference must reach the real direct-content route, not an
      // ID metadata lookup or the removed content-matches capability.
      const missing = await fetch(referenceContentURL(randomUUID()), {
        method: 'HEAD',
      });
      expect(missing.status).toBe(404);
    }, 60_000);

    afterAll(async () => {
      for (const proxy of proxies) {
        proxy.closeAllConnections();
        await new Promise<void>(resolve => proxy.close(() => resolve()));
      }
      if (database?.isInitialized) await database.destroy();
    });

    async function ownedBucket(type: StorageAggregatorType) {
      const actorID = randomUUID();
      const policy = new AuthorizationPolicy(
        AuthorizationPolicyType.STORAGE_BUCKET
      );
      policy.credentialRules.push(
        policies.createCredentialRule(
          [AuthorizationPrivilege.READ, AuthorizationPrivilege.CONTRIBUTE],
          [
            {
              type: AuthorizationCredential.USER_SELF_MANAGEMENT,
              resourceID: actorID,
            },
          ],
          'Communication Conversation Participants Access (Membership-based)'
        )
      );
      const bucket = await database.getRepository(StorageBucket).save({
        authorization: policy,
        allowedMimeTypes: [fixtureMime],
        maxFileSize: 1024,
      });
      const owner = await database.getRepository(StorageAggregator).save({
        type,
        directStorage: bucket,
        authorization: new AuthorizationPolicy(
          AuthorizationPolicyType.STORAGE_AGGREGATOR
        ),
      });
      return { bucket, owner, actorID };
    }

    async function destination() {
      const { bucket, owner, actorID } = await ownedBucket(
        StorageAggregatorType.CONVERSATION
      );
      const room = await database
        .getRepository(Room)
        .save(
          new Room(`placement-${randomUUID()}`, RoomType.CONVERSATION_DIRECT)
        );
      await database
        .getRepository(Conversation)
        .save({ room, storageAggregator: owner });
      return { bucket, room, actorID };
    }

    async function stage(mediaID = randomUUID()) {
      const form = new FormData();
      form.append('displayName', mediaID);
      form.append('storageBucketId', stagingId);
      form.append('externalReference', mediaID);
      form.append('skipImageProcessing', 'true');
      form.append(
        'file',
        new Blob([bytes], { type: fixtureMime }),
        `${mediaID}.bin`
      );
      const response = await fetch(`${fileServiceUrl}/internal/file`, {
        method: 'POST',
        body: form,
      });
      const created = (await response.json()) as { id: string };
      expect(response.status, JSON.stringify(created)).toBe(201);
      const document = await load(created.id);
      expect(document.mimeType).toBe(fixtureMime);
      expect(document.storageBucket.id).toBe(stagingId);
      expect(document.authorization).toBeNull();
      expect(document.tagset).toBeNull();
      return { document, mediaID };
    }

    function referenceContentURL(reference: string): string {
      return `${fileServiceUrl}/internal/file/by-reference/content?ref=${encodeURIComponent(reference)}`;
    }

    async function assertReferenceContent(reference: string): Promise<void> {
      const url = referenceContentURL(reference);
      const head = await fetch(url, { method: 'HEAD' });
      expect(head.status).toBe(200);
      expect(head.headers.get('content-type')).toBe(fixtureMime);
      expect(head.headers.get('content-length')).toBe(String(bytes.length));
      expect((await head.arrayBuffer()).byteLength).toBe(0);
      const content = await fetch(url);
      expect(content.status).toBe(200);
      expect(content.headers.get('content-type')).toBe(fixtureMime);
      expect(content.headers.get('content-length')).toBe(String(bytes.length));
      expect(Buffer.from(await content.arrayBuffer())).toEqual(bytes);
    }

    function load(id: string) {
      return database.getRepository(Document).findOneOrFail({
        where: { id },
        relations: {
          storageBucket: true,
          authorization: true,
          tagset: { authorization: true },
        },
      });
    }

    function deliver(
      target: Awaited<ReturnType<typeof destination>>,
      mediaID: string,
      displayName = 'first-name.bin',
      owner = placement
    ) {
      return owner.prepareInboundAttachments(target.room, target.actorID, [
        {
          media_id: mediaID,
          mime_type: fixtureMime,
          size: bytes.length,
          display_name: displayName,
        },
      ]);
    }

    async function associations(mediaID: string) {
      return database.getRepository(Document).find({
        where: { externalReference: mediaID },
        relations: {
          storageBucket: true,
          authorization: true,
          tagset: { authorization: true },
        },
        order: { createdDate: 'ASC', id: 'ASC' },
      });
    }

    function assertComplete(
      document: IDocument,
      target: Awaited<ReturnType<typeof destination>>
    ) {
      expect(document.storageBucket.id).toBe(target.bucket.id);
      expect(document.authorization?.id).toBeTruthy();
      expect(document.tagset?.id).toBeTruthy();
      expect(document.tagset?.authorization?.id).toBeTruthy();
      expect(
        document.authorization?.credentialRules.map(rule => rule.name)
      ).toContain(
        'Communication Conversation Participants Access (Membership-based)'
      );
      expect(
        document.authorization?.credentialRules.map(rule => rule.name)
      ).not.toContain('credentialRule-documentCreatedBy');
      expect(document.temporaryLocation).toBe(false);
    }

    async function metadataCounts() {
      return {
        policy: await database.getRepository(AuthorizationPolicy).count(),
        tagset: await database.getRepository(Tagset).count(),
      };
    }

    // Hold only this fixture's row lock. Both actual Go handlers finish their
    // snapshot reads, then block on UPDATE. Releasing it exercises the actual
    // version CAS; there is no mocked handler/repository and no timing threshold.
    async function simultaneousWrites(
      fileID: string | undefined,
      attempts: () => Promise<unknown>[]
    ) {
      const blocker = database.createQueryRunner();
      await blocker.connect();
      await blocker.startTransaction();
      if (fileID) {
        await blocker.query('SELECT id FROM file WHERE id=$1 FOR UPDATE', [
          fileID,
        ]);
      } else {
        // COPY reads remain possible; both INSERTs wait before testing the
        // real bucket/reference unique index with distinct prepared metadata.
        await blocker.query('LOCK TABLE file IN SHARE MODE');
      }
      const results = Promise.allSettled(attempts());
      try {
        const deadline = Date.now() + 10_000;
        let waiting = 0;
        while (waiting < 2 && Date.now() < deadline) {
          const rows = await database.query(
            `SELECT count(*)::int AS count
          FROM pg_stat_activity WHERE datname=current_database()
          AND pid<>pg_backend_pid() AND wait_event_type='Lock'
          AND query LIKE $1`,
            [fileID ? '%UPDATE file%' : '%INSERT INTO file%']
          );
          waiting = rows[0].count;
          if (waiting < 2) await delay(20);
        }
        expect(
          waiting,
          'Both real Go writes must wait behind the fixture lock'
        ).toBe(2);
      } finally {
        await blocker.rollbackTransaction();
        await blocker.release();
      }
      return results;
    }

    it('moves the first staged identity with complete persisted policy and tagset', async () => {
      const target = await destination();
      const staged = await stage();
      await deliver(target, staged.mediaID);
      const rows = await associations(staged.mediaID);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(staged.document.id);
      expect(rows[0].externalReference).toBe(staged.mediaID);
      expect(rows[0].createdDate).toEqual(staged.document.createdDate);
      expect(rows[0].createdBy).toBe(target.actorID);
      assertComplete(rows[0], target);
      await assertReferenceContent(staged.mediaID);
    });

    it('rejects a sequential stale expected-staging MOVE rather than stealing the placed file', async () => {
      const first = await destination();
      const second = await destination();
      const staged = await stage();
      await deliver(first, staged.mediaID);
      const before = await load(staged.document.id);
      await expect(
        files.moveDocument(staged.document.id, {
          expectedStorageBucketId: stagingId,
          storageBucketId: second.bucket.id,
          displayName: 'stale-name.bin',
        })
      ).rejects.toMatchObject({ httpStatus: 409 });
      const after = await load(staged.document.id);
      expect(after.storageBucket.id).toBe(first.bucket.id);
      expect(after.displayName).toBe(before.displayName);
      expect(after.authorization?.id).toBe(before.authorization?.id);
      expect(after.tagset.id).toBe(before.tagset.id);
      expect(after.version).toBe(before.version);
    });

    it('reuses duplicate delivery without changing first attribution/name or allocating metadata', async () => {
      const target = await destination();
      const staged = await stage();
      await deliver(target, staged.mediaID);
      const first = await load(staged.document.id);
      const before = await metadataCounts();
      await placement.prepareInboundAttachments(target.room, randomUUID(), [
        {
          media_id: staged.mediaID,
          mime_type: fixtureMime,
          size: bytes.length,
          display_name: 'later-name.bin',
        },
      ]);
      expect(await metadataCounts()).toEqual(before);
      const rows = await associations(staged.mediaID);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(first.id);
      expect(rows[0].createdBy).toBe(first.createdBy);
      expect(rows[0].displayName).toBe(first.displayName);
      expect(rows[0].authorization?.id).toBe(first.authorization?.id);
      expect(rows[0].tagset.id).toBe(first.tagset.id);
    });

    it('converges simultaneous same-bucket receipts after the real Go version conflict', async () => {
      const target = await destination();
      const staged = await stage();
      const before = await metadataCounts();
      const results = await simultaneousWrites(staged.document.id, () => [
        deliver(target, staged.mediaID, 'first-contender.bin'),
        deliver(target, staged.mediaID, 'second-contender.bin'),
      ]);
      expect(results.map(result => result.status)).toEqual([
        'fulfilled',
        'fulfilled',
      ]);
      const rows = await associations(staged.mediaID);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(staged.document.id);
      expect(['first-contender.bin', 'second-contender.bin']).toContain(
        rows[0].displayName
      );
      assertComplete(rows[0], target);
      expect(await metadataCounts()).toEqual({
        policy: before.policy + 2,
        tagset: before.tagset + 1,
      });
    });

    it('converges simultaneous different-bucket forwards without relocating the winner', async () => {
      const first = await destination();
      const second = await destination();
      const staged = await stage();
      const results = await simultaneousWrites(staged.document.id, () => [
        deliver(first, staged.mediaID, 'in-first.bin'),
        deliver(second, staged.mediaID, 'in-second.bin'),
      ]);
      expect(results.map(result => result.status)).toEqual([
        'fulfilled',
        'fulfilled',
      ]);
      const rows = await associations(staged.mediaID);
      expect(rows).toHaveLength(2);
      expect(rows.map(row => row.id)).toContain(staged.document.id);
      const inFirst = rows.find(
        row => row.storageBucket.id === first.bucket.id
      )!;
      const inSecond = rows.find(
        row => row.storageBucket.id === second.bucket.id
      )!;
      assertComplete(inFirst, first);
      assertComplete(inSecond, second);
      expect(inFirst.displayName).toBe('in-first.bin');
      expect(inSecond.displayName).toBe('in-second.bin');
      expect(inFirst.size).toBe(bytes.length);
      expect(inSecond.size).toBe(bytes.length);
      expect(inFirst.mimeType).toBe(fixtureMime);
      expect(inSecond.mimeType).toBe(fixtureMime);
      await assertReferenceContent(staged.mediaID);

      const third = await destination();
      const before = await metadataCounts();
      const copies = await simultaneousWrites(undefined, () => [
        deliver(third, staged.mediaID, 'first-copy-name.bin'),
        deliver(third, staged.mediaID, 'second-copy-name.bin'),
      ]);
      expect(copies.map(result => result.status)).toEqual([
        'fulfilled',
        'fulfilled',
      ]);
      const afterCopies = await associations(staged.mediaID);
      expect(afterCopies).toHaveLength(3);
      const inThird = afterCopies.find(
        row => row.storageBucket.id === third.bucket.id
      )!;
      assertComplete(inThird, third);
      expect(['first-copy-name.bin', 'second-copy-name.bin']).toContain(
        inThird.displayName
      );
      expect(await metadataCounts()).toEqual({
        policy: before.policy + 2,
        tagset: before.tagset + 1,
      });
    });

    it('retains committed metadata after a lost HTTP response and reuses it on receipt retry', async () => {
      const target = await destination();
      const staged = await stage();
      let patchCount = 0;
      let committedStatus: number | undefined;
      const proxy = createServer((incoming, outgoing) => {
        const upstream = httpRequest(
          new URL(incoming.url!, fileServiceUrl),
          {
            method: incoming.method,
            headers: incoming.headers,
          },
          response => {
            if (incoming.method === 'PATCH') {
              patchCount++;
              committedStatus = response.statusCode;
              // The real service has returned after its actual DB commit. Read its
              // body, then lose the downstream connection instead of fabricating an error.
              response.resume();
              response.on('end', () => incoming.socket.destroy());
            } else {
              outgoing.writeHead(response.statusCode!, response.headers);
              response.pipe(outgoing);
            }
          }
        );
        upstream.on('error', () => incoming.socket.destroy());
        incoming.pipe(upstream);
      });
      proxies.push(proxy);
      await new Promise<void>(resolve => proxy.listen(0, '127.0.0.1', resolve));
      const address = proxy.address();
      if (!address || typeof address === 'string')
        throw new Error('Missing proxy port');
      const throughProxy = services(`http://127.0.0.1:${address.port}`);
      await expect(
        deliver(
          target,
          staged.mediaID,
          'committed-name.bin',
          throughProxy.messages
        )
      ).resolves.toBe(target.bucket.id);
      expect(patchCount).toBe(1);
      expect(committedStatus).toBe(200);
      const committed = await load(staged.document.id);
      assertComplete(committed, target);
      const before = await metadataCounts();
      await deliver(target, staged.mediaID, 'retry-name.bin');
      expect(await metadataCounts()).toEqual(before);
      const after = await load(staged.document.id);
      expect(after.displayName).toBe('committed-name.bin');
      expect(after.authorization?.id).toBe(committed.authorization?.id);
      expect(after.tagset.id).toBe(committed.tagset.id);
    });

    it('keeps committed COPY metadata after a 504 retry with the same prepared IDs', async () => {
      const first = await destination();
      const second = await destination();
      const staged = await stage();
      await deliver(first, staged.mediaID);
      const before = await metadataCounts();
      let copyCount = 0;
      const upstreamReplies: { status: number; reused?: boolean }[] = [];
      const proxy = createServer((incoming, outgoing) => {
        const isCopy =
          incoming.method === 'POST' && incoming.url === '/internal/file/copy';
        const upstream = httpRequest(
          new URL(incoming.url!, fileServiceUrl),
          {
            method: incoming.method,
            headers: incoming.headers,
          },
          response => {
            if (!isCopy) {
              outgoing.writeHead(response.statusCode!, response.headers);
              response.pipe(outgoing);
              return;
            }
            const attempt = ++copyCount;
            const chunks: Buffer[] = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => {
              const body = Buffer.concat(chunks);
              upstreamReplies.push({
                status: response.statusCode!,
                reused: JSON.parse(body.toString()).reused,
              });
              if (attempt === 1) {
                // Actual Go COPY already committed. A gateway can still return
                // 504; the existing JSON POST retry repeats the SAME policy IDs.
                outgoing.writeHead(504, { 'Content-Type': 'application/json' });
                outgoing.end(
                  JSON.stringify({ error: 'fixture gateway lost response' })
                );
              } else {
                outgoing.writeHead(response.statusCode!, response.headers);
                outgoing.end(body);
              }
            });
          }
        );
        upstream.on('error', () => incoming.socket.destroy());
        incoming.pipe(upstream);
      });
      proxies.push(proxy);
      await new Promise<void>(resolve => proxy.listen(0, '127.0.0.1', resolve));
      const address = proxy.address();
      if (!address || typeof address === 'string')
        throw new Error('Missing proxy port');
      const throughProxy = services(`http://127.0.0.1:${address.port}`);
      await deliver(
        second,
        staged.mediaID,
        'copy-committed.bin',
        throughProxy.messages
      );
      expect(copyCount).toBe(2);
      expect(upstreamReplies[0]).toEqual({ status: 201, reused: false });
      // The actual schema also uniquely constrains auth/tagset. Depending on
      // which unique index reports first, the retry returns reference-reuse
      // 201 or a metadata-index 409. Either must preserve the committed row.
      expect([201, 409]).toContain(upstreamReplies[1].status);
      if (upstreamReplies[1].status === 201)
        expect(upstreamReplies[1].reused).toBe(true);
      expect(await metadataCounts()).toEqual({
        policy: before.policy + 2,
        tagset: before.tagset + 1,
      });
      const rows = await associations(staged.mediaID);
      expect(rows).toHaveLength(2);
      const copied = rows.find(
        row => row.storageBucket.id === second.bucket.id
      )!;
      assertComplete(copied, second);
      expect(copied.displayName).toBe('copy-committed.bin');
      expect(copied.createdBy).toBe(second.actorID);
      await assertReferenceContent(staged.mediaID);
    });

    it('recomposes persisted conversation file and tagset policies after member removal without creator rights', async () => {
      const target = await destination();
      const staged = await stage();
      await deliver(target, staged.mediaID);
      const authorization = new AuthorizationService(logger);
      const member = [
        {
          type: AuthorizationCredential.USER_SELF_MANAGEMENT,
          resourceID: target.actorID,
        },
      ];
      const outsider = [
        {
          type: AuthorizationCredential.USER_SELF_MANAGEMENT,
          resourceID: randomUUID(),
        },
      ];
      const before = await load(staged.document.id);
      expect(
        authorization.getGrantedPrivileges(member, before.authorization!)
      ).toContain(AuthorizationPrivilege.READ);
      expect(
        authorization.getGrantedPrivileges(outsider, before.authorization!)
      ).not.toContain(AuthorizationPrivilege.READ);
      expect(
        authorization.getGrantedPrivileges(member, before.tagset.authorization!)
      ).toContain(AuthorizationPrivilege.READ);
      const bucket = await database.getRepository(StorageBucket).findOneOrFail({
        where: { id: target.bucket.id },
        relations: {
          directStorageOwner: true,
          documents: { tagset: { authorization: true } },
        },
      });
      expect(bucket.storageAggregator).toBeUndefined();
      expect(bucket.directStorageOwner?.type).toBe(
        StorageAggregatorType.CONVERSATION
      );
      // This is the real policy compositor and persisted rows, not an HTTP
      // auth/cache timing assertion (the separate live gate owns that).
      const noMembers = await policies.save(
        new AuthorizationPolicy(
          AuthorizationPolicyType.COMMUNICATION_CONVERSATION
        )
      );
      await new StorageBucketAuthorizationService(
        policies,
        new DocumentAuthorizationService(policies)
      ).applyAuthorizationPolicy(bucket, noMembers);
      const after = await load(staged.document.id);
      expect(
        authorization.getGrantedPrivileges(member, after.authorization!)
      ).not.toContain(AuthorizationPrivilege.READ);
      expect(
        authorization.getGrantedPrivileges(member, after.tagset.authorization!)
      ).not.toContain(AuthorizationPrivilege.READ);
      expect(
        after.authorization?.credentialRules.map(rule => rule.name)
      ).not.toContain('credentialRule-documentCreatedBy');
      expect(after.id).toBe(before.id);
      expect(after.tagset.id).toBe(before.tagset.id);
    });

    it('retains ordinary user creator rights and mutable source/snapshot file identities through the cascade', async () => {
      const target = await ownedBucket(StorageAggregatorType.USER);
      const actual = services(fileServiceUrl);
      // Shared buffer helper used by ordinary profile/Collabora creation.
      // Full Collabora/profile domain behaviour is covered by their own suites.
      const ordinary = await actual.bucket.uploadFileAsDocumentFromBuffer(
        target.bucket.id,
        bytes,
        'ordinary.bin',
        fixtureMime,
        target.actorID,
        true
      );
      const snapshot = await files.createSnapshotInBucket(
        Buffer.concat([bytes, Buffer.from('snapshot')]),
        target.bucket.id
      );
      const bucket = await database.getRepository(StorageBucket).findOneOrFail({
        where: { id: target.bucket.id },
        relations: {
          directStorageOwner: true,
          documents: { tagset: { authorization: true } },
        },
      });
      const emptyParent = await policies.save(
        new AuthorizationPolicy(AuthorizationPolicyType.STORAGE_AGGREGATOR)
      );
      await new StorageBucketAuthorizationService(
        policies,
        new DocumentAuthorizationService(policies)
      ).applyAuthorizationPolicy(bucket, emptyParent);
      const plain = await load(ordinary.id);
      expect(plain.externalReference).toBeNull();
      expect(plain.temporaryLocation).toBe(true);
      expect(
        plain.authorization?.credentialRules.map(rule => rule.name)
      ).toContain('credentialRule-documentCreatedBy');
      const creator = [
        {
          type: AuthorizationCredential.USER_SELF_MANAGEMENT,
          resourceID: target.actorID,
        },
      ];
      expect(
        new AuthorizationService(logger).getGrantedPrivileges(
          creator,
          plain.authorization!
        )
      ).toEqual(
        expect.arrayContaining([
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ])
      );
      const internal = await load(snapshot.id);
      expect(internal.authorization).toBeNull();
      expect(internal.tagset).toBeNull();
      expect(internal.externalReference).toBeNull();
      await files.updateDocument(plain.id, { displayName: 'renamed.bin' });
      const replacement = Buffer.concat([bytes, Buffer.from('updated')]);
      const changed = await fetch(
        `${fileServiceUrl}/internal/file/${plain.id}/content`,
        {
          method: 'PUT',
          headers: { 'Content-Type': fixtureMime },
          body: replacement,
        }
      );
      expect(changed.status).toBe(200);
      const renamed = await load(plain.id);
      expect(renamed.displayName).toBe('renamed.bin');
      expect(renamed.externalReference).toBeNull();
      await expect(files.getDocumentContent(plain.id)).resolves.toEqual(
        replacement
      );
      await expect(files.getDocumentContent(internal.id)).resolves.toEqual(
        Buffer.concat([bytes, Buffer.from('snapshot')])
      );
    });

    it('maps callout and post rooms to the same persisted Space bucket and reuses one reference association', async () => {
      const target = await ownedBucket(StorageAggregatorType.SPACE);
      const calloutsSet = await database
        .getRepository(CalloutsSet)
        .save({ type: CalloutsSetType.COLLABORATION });
      const collaboration = await database
        .getRepository(Collaboration)
        .save({ calloutsSet });
      await database.getRepository(Space).save({
        nameID: randomUUID(),
        collaboration,
        storageAggregator: target.owner,
        level: SpaceLevel.L0,
        visibility: SpaceVisibility.ACTIVE,
        settings: {},
        platformRolesAccess: { roles: [] },
      });
      const calloutRoom = await database
        .getRepository(Room)
        .save(new Room('callout comments', RoomType.CALLOUT));
      const anotherCalloutRoom = await database
        .getRepository(Room)
        .save(new Room('other callout comments', RoomType.CALLOUT));
      const postRoom = await database
        .getRepository(Room)
        .save(new Room('post comments', RoomType.POST));
      const callout = await database.getRepository(Callout).save({
        nameID: randomUUID(),
        sortOrder: 0,
        settings: {},
        calloutsSet,
        comments: calloutRoom,
      });
      await database.getRepository(Callout).save({
        nameID: randomUUID(),
        sortOrder: 1,
        settings: {},
        calloutsSet,
        comments: anotherCalloutRoom,
      });
      const post = await database.getRepository(Post).save({
        nameID: randomUUID(),
        createdBy: target.actorID,
        comments: postRoom,
      });
      await database
        .getRepository(CalloutContribution)
        .save({ callout, post, sortOrder: 0 });
      for (const room of [calloutRoom, postRoom, anotherCalloutRoom]) {
        expect((await placement.getTargetBucketForRoom(room))?.id).toBe(
          target.bucket.id
        );
      }
      const staged = await stage();
      await deliver(
        { ...target, room: calloutRoom },
        staged.mediaID,
        'original-space-name.bin'
      );
      const first = await load(staged.document.id);
      await deliver(
        { ...target, room: postRoom },
        staged.mediaID,
        'post-rename.bin'
      );
      await deliver(
        { ...target, room: anotherCalloutRoom },
        staged.mediaID,
        'other-rename.bin'
      );
      const rows = await associations(staged.mediaID);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(first.id);
      expect(rows[0].storageBucket.id).toBe(target.bucket.id);
      expect(rows[0].displayName).toBe('original-space-name.bin');
      expect(rows[0].createdBy).toBe(target.actorID);
      expect(
        rows[0].authorization?.credentialRules.map(rule => rule.name)
      ).toContain('credentialRule-documentCreatedBy');
      expect(rows[0].tagset.authorization?.id).toBeTruthy();
    });

    it('rejects stale staging cleanup after MOVE and retains the authorized row and bytes', async () => {
      const target = await destination();
      const staged = await stage();
      // The operator read staging before a receipt moved it. Its DELETE must
      // evaluate the source-bucket precondition atomically against that MOVE.
      await deliver(target, staged.mediaID);
      const placed = await load(staged.document.id);
      const response = await fetch(
        `${fileServiceUrl}/internal/file/${staged.document.id}?expectedStorageBucketId=${stagingId}`,
        { method: 'DELETE' }
      );
      expect(response.status).toBe(409);
      const after = await load(staged.document.id);
      expect(after.storageBucket.id).toBe(target.bucket.id);
      expect(after.authorization?.id).toBe(placed.authorization?.id);
      expect(after.tagset.id).toBe(placed.tagset.id);
      await assertReferenceContent(staged.mediaID);

      const redundant = await stage();
      const copy = await services(fileServiceUrl).bucket.copyDocumentToBucket(
        target.bucket.id,
        redundant.document,
        target.actorID,
        false,
        { externalReference: redundant.mediaID }
      );
      const removed = await fetch(
        `${fileServiceUrl}/internal/file/${redundant.document.id}?expectedStorageBucketId=${stagingId}`,
        { method: 'DELETE' }
      );
      expect(removed.status).toBe(200);
      expect(
        await database
          .getRepository(Document)
          .findOneBy({ id: redundant.document.id })
      ).toBeNull();
      expect(copy.externalReference).toBe(redundant.mediaID);
      await assertReferenceContent(redundant.mediaID);
    });

    it('keeps distinct media IDs as distinct logical files even when bytes are equal', async () => {
      const target = await destination();
      const first = await stage();
      const second = await stage();
      await deliver(target, first.mediaID);
      await deliver(target, second.mediaID);
      const rows = await database.getRepository(Document).findBy({
        storageBucket: { id: target.bucket.id },
        externalReference: In([first.mediaID, second.mediaID]),
      });
      expect(rows).toHaveLength(2);
      expect(new Set(rows.map(row => row.id)).size).toBe(2);
      await assertReferenceContent(first.mediaID);
      await assertReferenceContent(second.mediaID);
    });
  }
);
