import { randomUUID } from 'node:crypto';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { MimeTypeVisual } from '@common/enums/mime.file.type.visual';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { StorageBucket } from '@domain/storage/storage-bucket/storage.bucket.entity';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
import { isConversationBucket } from '@domain/storage/storage-bucket/storage.bucket.utils';
import { DataSource, getMetadataArgsStorage } from 'typeorm';

const describePostgres = process.env.CONVERSATION_MEDIA_TEST_DATABASE_URL
  ? describe
  : describe.skip;

describePostgres('conversation direct-storage ownership — PostgreSQL', () => {
  let source: DataSource;
  const schema = `conversation_owner_${randomUUID().replaceAll('-', '')}`;

  beforeAll(async () => {
    source = new DataSource({
      type: 'postgres',
      url: process.env.CONVERSATION_MEDIA_TEST_DATABASE_URL,
      schema,
      // Use the real entities, including their imported relation targets.
      entities: getMetadataArgsStorage()
        .tables.map(table => table.target)
        .filter(target => typeof target !== 'string'),
    });
    await source.initialize();
    await source.query(`CREATE SCHEMA "${schema}"`);
    await source.synchronize();
  });

  afterAll(async () => {
    if (source?.isInitialized) {
      await source.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await source.destroy();
    }
  });

  it('loads the owner through directStorageId with a NULL bucket parent FK', async () => {
    const buckets = source.getRepository(StorageBucket);
    const aggregators = source.getRepository(StorageAggregator);
    const bucket = await buckets.save(
      buckets.create({
        authorization: new AuthorizationPolicy(
          AuthorizationPolicyType.STORAGE_BUCKET
        ),
        allowedMimeTypes: [MimeTypeVisual.PNG],
        maxFileSize: 1024,
      })
    );
    const owner = await aggregators.save(
      aggregators.create({
        type: StorageAggregatorType.CONVERSATION,
        directStorage: bucket,
        authorization: new AuthorizationPolicy(
          AuthorizationPolicyType.STORAGE_AGGREGATOR
        ),
      })
    );

    const loaded = await buckets.findOneOrFail({
      where: { id: bucket.id },
      relations: { storageAggregator: true, directStorageOwner: true },
    });
    expect(loaded.storageAggregator).toBeNull();
    expect(loaded.directStorageOwner?.id).toBe(owner.id);
    expect(isConversationBucket(loaded)).toBe(true);

    const authorization = new AuthorizationService({} as any);
    const policies = new AuthorizationPolicyService(
      source.getRepository(AuthorizationPolicy),
      authorization,
      {} as any,
      { get: () => 500 } as any
    );
    const creator = randomUUID();
    const credentials = [
      {
        type: AuthorizationCredential.USER_SELF_MANAGEMENT,
        resourceID: creator,
      },
    ];
    const documentPolicy = new AuthorizationPolicy(
      AuthorizationPolicyType.DOCUMENT
    );
    documentPolicy.credentialRules.push(
      policies.createCredentialRule(
        [
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        credentials,
        'credentialRule-documentCreatedBy'
      )
    );
    const document = {
      id: randomUUID(),
      createdBy: creator,
      authorization: await policies.save(documentPolicy),
      tagset: null,
    };
    loaded.documents = [document as any];
    const parent = await policies.save(
      new AuthorizationPolicy(
        AuthorizationPolicyType.COMMUNICATION_CONVERSATION
      )
    );
    const bucketAuthorization = new StorageBucketAuthorizationService(
      policies,
      new DocumentAuthorizationService(policies)
    );
    await bucketAuthorization.applyAuthorizationPolicy(loaded, parent);
    const repairedPolicy = await source
      .getRepository(AuthorizationPolicy)
      .findOneByOrFail({ id: document.authorization.id });
    const privileges = authorization.getGrantedPrivileges(
      credentials,
      repairedPolicy
    );
    expect(privileges).not.toContain(AuthorizationPrivilege.READ);
    expect(privileges).not.toContain(AuthorizationPrivilege.UPDATE);
    expect(privileges).not.toContain(AuthorizationPrivilege.DELETE);

    // A child bucket's parent FK cannot stand in for a direct-storage owner.
    const child = await buckets.save(
      buckets.create({
        storageAggregator: owner,
        allowedMimeTypes: [MimeTypeVisual.PNG],
        maxFileSize: 1024,
      })
    );
    const loadedChild = await buckets.findOneOrFail({
      where: { id: child.id },
      relations: { storageAggregator: true, directStorageOwner: true },
    });
    expect(loadedChild.storageAggregator?.type).toBe(
      StorageAggregatorType.CONVERSATION
    );
    expect(loadedChild.directStorageOwner).toBeNull();
    expect(isConversationBucket(loadedChild)).toBe(false);

    const relation = source
      .getMetadata(StorageBucket)
      .findRelationWithPropertyPath('directStorageOwner');
    expect(relation?.isOwning).toBe(false);
    expect(relation?.joinColumns).toEqual([]);
    expect(
      relation?.inverseRelation?.joinColumns.map(column => column.databaseName)
    ).toEqual(['directStorageId']);
  });
});
