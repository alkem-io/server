import { randomUUID } from 'node:crypto';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { MimeTypeVisual } from '@common/enums/mime.file.type.visual';
import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import { SpaceLevel } from '@common/enums/space.level';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { SpaceSortMode } from '@common/enums/space.sort.mode';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import {
  PlatformRolesAccessService,
  resolveRoleCredential,
} from '@domain/access/platform-roles-access/platform.roles.access.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { SpaceResolverMutations } from '@domain/space/space/space.resolver.mutations';
import { SpaceService } from '@domain/space/space/space.service';
import { SpaceAuthorizationService } from '@domain/space/space/space.service.authorization';
import { SpacePlatformRolesAccessService } from '@domain/space/space/space.service.platform.roles.access';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { ISpaceSettings } from '@domain/space/space.settings/space.settings.interface';
import { SpaceSettingsService } from '@domain/space/space.settings/space.settings.service';
import { Document } from '@domain/storage/document/document.entity';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { StorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.entity';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { StorageBucket } from '@domain/storage/storage-bucket/storage.bucket.entity';
import { StorageBucketAuthorizationService } from '@domain/storage/storage-bucket/storage.bucket.service.authorization';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { DataSource, getMetadataArgsStorage } from 'typeorm';

/**
 * Storage read rules follow space visibility.
 *
 * A Space's storage aggregator, its direct bucket and every document in that
 * bucket carry a stored authorization policy. The public storage route and the
 * storage lookups evaluate READ on exactly those stored policies, so these
 * tests run the real Space authorization reset (and, for a settings change,
 * the real settings mutation) and then evaluate READ on the policies as they
 * were persisted in PostgreSQL.
 *
 * What is real: the policy services, the Space and storage authorization
 * services, the platform roles access computation, the settings service and
 * the settings mutation. What is replaced:
 * - the Space rows. A Space is a class-table-inheritance actor with a dozen
 *   owned relations; the tests keep the Space graph in memory and serve it
 *   through a minimal store, while the storage aggregator, its bucket, the
 *   document and every policy are real rows;
 * - the Space's non-storage children (community, collaboration, about,
 *   profile, templates, license), whose cascades never touch storage;
 * - the open-invitation query of the role set, which reads invitations.
 */
const describePostgres = process.env.STORAGE_AUTHORIZATION_TEST_DATABASE_URL
  ? describe
  : describe.skip;

type TestSpace = {
  id: string;
  level: SpaceLevel;
  visibility: SpaceVisibility;
  settings: ISpaceSettings;
  authorization: IAuthorizationPolicy;
  parentSpace?: TestSpace;
  subspaces: TestSpace[];
  storageAggregator: { id: string };
  [key: string]: unknown;
};

type StoredStorage = {
  aggregatorPolicyID: string;
  bucketPolicyID: string;
  documentPolicyID: string;
};

describePostgres(
  'storage read rules follow space visibility — PostgreSQL',
  () => {
    let source: DataSource;
    const schema = `storage_read_rules_${randomUUID().replaceAll('-', '')}`;

    const authorizationService = new AuthorizationService({} as any);
    let policies: AuthorizationPolicyService;
    let spaceAuthorization: SpaceAuthorizationService;
    let spaceMutations: SpaceResolverMutations;

    const spacesInMemory = new Map<string, TestSpace>();
    const storageBySpace = new Map<string, StoredStorage>();
    const spacePlatformRolesAccess = new SpacePlatformRolesAccessService(
      new PlatformRolesAccessService({} as any),
      {} as any
    );

    beforeAll(async () => {
      source = new DataSource({
        type: 'postgres',
        url: process.env.STORAGE_AUTHORIZATION_TEST_DATABASE_URL,
        schema,
        // Use the real entities, including their imported relation targets.
        entities: getMetadataArgsStorage()
          .tables.map(table => table.target)
          .filter(target => typeof target !== 'string'),
      });
      await source.initialize();
      await source.query(`CREATE SCHEMA "${schema}"`);
      await source.synchronize();

      policies = new AuthorizationPolicyService(
        source.getRepository(AuthorizationPolicy),
        authorizationService,
        {} as any,
        { get: () => 500 } as any
      );

      // Serves the in-memory Space graph to both SpaceLookupService (through
      // an entity manager) and SpaceService (through a repository).
      const spaceStore = {
        findOne: async (entityOrOptions: any, maybeOptions?: any) => {
          const options = maybeOptions ?? entityOrOptions;
          return spacesInMemory.get(options.where.id) ?? null;
        },
        findOneOrFail: async (options: any) => {
          const space = spacesInMemory.get(options.where.id);
          if (!space) throw new Error('space not found in test store');
          return space;
        },
        save: async (space: TestSpace) => space,
      };
      const spaceLookup = new SpaceLookupService(
        {} as any,
        spaceStore as any,
        spaceStore as any,
        {} as any
      );

      // The role set resolves role credentials from the in-memory roles of
      // each Space; only its invitation query is answered here.
      const roleSetService = Object.create(
        RoleSetService.prototype
      ) as RoleSetService;
      Object.assign(roleSetService, {
        invitationService: {
          getActorIDsWithOpenInvitationOnRoleSet: async () => [],
        },
      });

      const outsideStorage = { applyAuthorizationPolicy: async () => [] };
      const storageAggregatorService = new StorageAggregatorService(
        policies,
        {} as any,
        {} as any,
        {} as any,
        source.getRepository(StorageAggregator),
        {} as any
      );
      spaceAuthorization = new SpaceAuthorizationService(
        new PlatformAuthorizationPolicyService(policies, {} as any),
        policies,
        roleSetService,
        new StorageAggregatorAuthorizationService(
          policies,
          storageAggregatorService,
          new StorageBucketAuthorizationService(
            policies,
            new DocumentAuthorizationService(policies)
          )
        ),
        outsideStorage as any,
        outsideStorage as any,
        outsideStorage as any,
        outsideStorage as any,
        outsideStorage as any,
        spaceLookup,
        outsideStorage as any,
        new PlatformRolesAccessService({} as any),
        {
          verbose: () => undefined,
          // A skipped cascade step must fail the test, not pass it silently.
          error: (message: string) => {
            throw new Error(message);
          },
        } as any
      );

      const spaceService = new SpaceService(
        {} as any,
        policies,
        authorizationService,
        {} as any,
        {} as any,
        {} as any,
        roleSetService,
        {} as any,
        new SpaceSettingsService({} as any),
        {} as any,
        spaceLookup,
        storageAggregatorService,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        spacePlatformRolesAccess,
        {} as any,
        {} as any,
        spaceStore as any,
        {} as any
      );
      spaceMutations = new SpaceResolverMutations(
        {} as any,
        {} as any,
        authorizationService,
        policies,
        spaceService,
        spaceAuthorization,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any
      );
    }, 300000);

    afterAll(async () => {
      if (source?.isInitialized) {
        await source.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await source.destroy();
      }
    });

    const settingsWithPrivacy = (mode: SpacePrivacyMode): ISpaceSettings => ({
      privacy: { mode, allowPlatformSupportAsAdmin: false },
      membership: {
        policy: CommunityMembershipPolicy.OPEN,
        trustedOrganizations: [],
        allowSubspaceAdminsToInviteMembers: false,
      },
      collaboration: {
        inheritMembershipRights: true,
        allowMembersToCreateSubspaces: true,
        allowMembersToCreateCallouts: true,
        allowEventsFromSubspaces: true,
        allowMembersToVideoCall: false,
        allowGuestContributions: false,
      },
      sortMode: SpaceSortMode.ALPHABETICAL,
      layout: {
        calloutDescriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
      },
    });

    /** A Space with a persisted aggregator, direct bucket and one document. */
    const createSpace = async (options: {
      privacy: SpacePrivacyMode;
      visibility?: SpaceVisibility;
      parent?: TestSpace;
    }): Promise<TestSpace> => {
      const { privacy, parent } = options;
      const id = randomUUID();
      const level = parent ? ((parent.level + 1) as SpaceLevel) : SpaceLevel.L0;
      const parentRoles = (parent?.community as any)?.roleSet.roles ?? [];
      const roles = [RoleName.MEMBER, RoleName.LEAD, RoleName.ADMIN].map(
        name => {
          const parentRole = parentRoles.find(
            (role: any) => role.name === name
          );
          return {
            id: randomUUID(),
            name,
            credential: { type: resolveRoleCredential(name), resourceID: id },
            parentCredentials: parentRole
              ? [parentRole.credential, ...parentRole.parentCredentials]
              : [],
          };
        }
      );

      const bucket = await source.getRepository(StorageBucket).save(
        source.getRepository(StorageBucket).create({
          authorization: new AuthorizationPolicy(
            AuthorizationPolicyType.STORAGE_BUCKET
          ),
          allowedMimeTypes: [MimeTypeVisual.PNG],
          maxFileSize: 1024,
        })
      );
      const aggregator = await source.getRepository(StorageAggregator).save(
        source.getRepository(StorageAggregator).create({
          type: StorageAggregatorType.SPACE,
          directStorage: bucket,
          authorization: new AuthorizationPolicy(
            AuthorizationPolicyType.STORAGE_AGGREGATOR
          ),
        })
      );
      const document = await source.getRepository(Document).save(
        source.getRepository(Document).create({
          storageBucket: bucket,
          authorization: new AuthorizationPolicy(
            AuthorizationPolicyType.DOCUMENT
          ),
          createdBy: randomUUID(),
          displayName: 'stored.png',
          mimeType: MimeTypeVisual.PNG,
          size: 1,
          externalID: randomUUID(),
        })
      );
      storageBySpace.set(id, {
        aggregatorPolicyID: aggregator.authorization!.id,
        bucketPolicyID: bucket.authorization!.id,
        documentPolicyID: document.authorization!.id,
      });

      const space: TestSpace = {
        id,
        level,
        visibility: options.visibility ?? SpaceVisibility.ACTIVE,
        levelZeroSpaceID: parent ? parent.levelZeroSpaceID : id,
        settings: settingsWithPrivacy(privacy),
        authorization: await policies.save(
          new AuthorizationPolicy(AuthorizationPolicyType.SPACE)
        ),
        parentSpace: parent,
        subspaces: [],
        community: {
          id: randomUUID(),
          roleSet: { id: randomUUID(), type: RoleSetType.SPACE, roles },
        },
        collaboration: { id: randomUUID() },
        about: { id: randomUUID(), profile: { id: randomUUID() } },
        profile: { id: randomUUID() },
        storageAggregator: { id: aggregator.id },
        templatesManager: { id: randomUUID() },
        license: { id: randomUUID() },
        account: parent ? undefined : { id: randomUUID() },
      };
      space.platformRolesAccess =
        spacePlatformRolesAccess.createPlatformRolesAccess(
          space as any,
          space.settings,
          parent?.platformRolesAccess as any
        );
      parent?.subspaces.push(space);
      spacesInMemory.set(id, space);
      return space;
    };

    /** The authorization reset of a level-zero Space and its subspaces. */
    const resetAuthorization = async (levelZero: TestSpace) => {
      const updated = await spaceAuthorization.applyAuthorizationPolicy(
        levelZero.id
      );
      await policies.saveAll(updated);
    };

    const storedPolicy = (policyID: string) =>
      source
        .getRepository(AuthorizationPolicy)
        .findOneByOrFail({ id: policyID });

    const anonymous: ICredentialDefinition[] = [
      { type: AuthorizationCredential.GLOBAL_ANONYMOUS, resourceID: '' },
    ];
    const registeredNonMember = (): ICredentialDefinition[] => [
      { type: AuthorizationCredential.GLOBAL_REGISTERED, resourceID: '' },
      {
        type: AuthorizationCredential.USER_SELF_MANAGEMENT,
        resourceID: randomUUID(),
      },
    ];
    /** A member of the Space, and therefore of every Space above it. */
    const memberOf = (space: TestSpace): ICredentialDefinition[] => {
      const credentials = registeredNonMember();
      for (let s: TestSpace | undefined = space; s; s = s.parentSpace) {
        credentials.push({
          type: AuthorizationCredential.SPACE_MEMBER,
          resourceID: s.id,
        });
      }
      return credentials;
    };

    type StorageRead = {
      aggregator: boolean;
      bucket: boolean;
      document: boolean;
      space: boolean;
    };

    const storageRead = async (
      space: TestSpace,
      credentials: ICredentialDefinition[]
    ): Promise<StorageRead> => {
      const stored = storageBySpace.get(space.id)!;
      const read = async (policyID: string) =>
        authorizationService.isAccessGrantedForCredentials(
          credentials,
          await storedPolicy(policyID),
          AuthorizationPrivilege.READ
        );
      return {
        aggregator: await read(stored.aggregatorPolicyID),
        bucket: await read(stored.bucketPolicyID),
        document: await read(stored.documentPolicyID),
        space: await read(space.authorization.id),
      };
    };

    const expectStorageRead = async (
      space: TestSpace,
      credentials: ICredentialDefinition[],
      expected: boolean
    ) => {
      const read = await storageRead(space, credentials);
      expect({
        aggregator: read.aggregator,
        bucket: read.bucket,
        document: read.document,
      }).toEqual({
        aggregator: expected,
        bucket: expected,
        document: expected,
      });
      // Storage never answers differently from the Space that owns it.
      expect(read.document).toBe(read.space);
    };

    type Case = {
      name: string;
      build: () => Promise<{ levelZero: TestSpace; target: TestSpace }>;
      anonymous: boolean;
      registered: boolean;
      member: boolean;
    };

    const cases: Case[] = [
      {
        name: 'a private space',
        build: async () => {
          const levelZero = await createSpace({
            privacy: SpacePrivacyMode.PRIVATE,
          });
          return { levelZero, target: levelZero };
        },
        anonymous: false,
        registered: false,
        member: true,
      },
      {
        name: 'a public space',
        build: async () => {
          const levelZero = await createSpace({
            privacy: SpacePrivacyMode.PUBLIC,
          });
          return { levelZero, target: levelZero };
        },
        anonymous: true,
        registered: true,
        member: true,
      },
      {
        // An archived Space grants nothing to anyone, its members included;
        // its storage follows it.
        name: 'an archived public space',
        build: async () => {
          const levelZero = await createSpace({
            privacy: SpacePrivacyMode.PUBLIC,
            visibility: SpaceVisibility.ARCHIVED,
          });
          return { levelZero, target: levelZero };
        },
        anonymous: false,
        registered: false,
        member: false,
      },
      {
        name: 'a private subspace of a public space',
        build: async () => {
          const levelZero = await createSpace({
            privacy: SpacePrivacyMode.PUBLIC,
          });
          const target = await createSpace({
            privacy: SpacePrivacyMode.PRIVATE,
            parent: levelZero,
          });
          return { levelZero, target };
        },
        anonymous: false,
        registered: false,
        member: true,
      },
      {
        name: 'a public subspace of a private space',
        build: async () => {
          const levelZero = await createSpace({
            privacy: SpacePrivacyMode.PRIVATE,
          });
          const target = await createSpace({
            privacy: SpacePrivacyMode.PUBLIC,
            parent: levelZero,
          });
          return { levelZero, target };
        },
        anonymous: false,
        registered: false,
        member: true,
      },
    ];

    describe.each(cases)('the direct storage of $name', testCase => {
      let target: TestSpace;

      beforeAll(async () => {
        const built = await testCase.build();
        target = built.target;
        await resetAuthorization(built.levelZero);
      });

      it(`is ${testCase.anonymous ? '' : 'not '}readable without a session`, async () => {
        await expectStorageRead(target, anonymous, testCase.anonymous);
      });

      it(`is ${testCase.registered ? '' : 'not '}readable by a registered non-member`, async () => {
        await expectStorageRead(
          target,
          registeredNonMember(),
          testCase.registered
        );
      });

      it(`is ${testCase.member ? '' : 'not '}readable by a member`, async () => {
        await expectStorageRead(target, memberOf(target), testCase.member);
      });
    });

    describe('a privacy change through the settings update', () => {
      let levelZero: TestSpace;
      let subspace: TestSpace;
      let admin: ActorContext;

      const changePrivacy = async (mode: SpacePrivacyMode) => {
        await spaceMutations.updateSpaceSettings(admin, {
          spaceID: levelZero.id,
          settings: { privacy: { mode } },
        });
      };

      beforeAll(async () => {
        levelZero = await createSpace({ privacy: SpacePrivacyMode.PUBLIC });
        subspace = await createSpace({
          privacy: SpacePrivacyMode.PUBLIC,
          parent: levelZero,
        });
        await resetAuthorization(levelZero);
        admin = new ActorContext();
        admin.actorID = randomUUID();
        admin.credentials = [
          { type: AuthorizationCredential.GLOBAL_REGISTERED, resourceID: '' },
          {
            type: AuthorizationCredential.SPACE_ADMIN,
            resourceID: levelZero.id,
          },
        ];
      });

      it('takes storage read away when a public space becomes private, and gives it back when it becomes public again', async () => {
        await expectStorageRead(levelZero, anonymous, true);
        await expectStorageRead(subspace, anonymous, true);

        await changePrivacy(SpacePrivacyMode.PRIVATE);

        for (const space of [levelZero, subspace]) {
          await expectStorageRead(space, anonymous, false);
          await expectStorageRead(space, registeredNonMember(), false);
          await expectStorageRead(space, memberOf(space), true);
        }

        await changePrivacy(SpacePrivacyMode.PUBLIC);

        for (const space of [levelZero, subspace]) {
          await expectStorageRead(space, anonymous, true);
          await expectStorageRead(space, registeredNonMember(), true);
        }
      });
    });
  }
);
