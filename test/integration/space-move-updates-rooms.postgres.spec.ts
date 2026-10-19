import { randomUUID } from 'node:crypto';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RoomType } from '@common/enums/room.type';
import { SpaceLevel } from '@common/enums/space.level';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { Communication } from '@domain/communication/communication/communication.entity';
import { Room } from '@domain/communication/room/room.entity';
import { SpaceMoveRoomsService } from '@domain/communication/space-move-rooms/space.move.rooms.service';
import { Community } from '@domain/community/community/community.entity';
import { Space } from '@domain/space/space/space.entity';
import { DataSource, getMetadataArgsStorage } from 'typeorm';
import { vi } from 'vitest';

/**
 * Regression coverage for the cross-L0 subspace move silently skipping the
 * revoke-and-recreate of the moved subtree's updates rooms.
 *
 * The move located each space's updates room through communication."spaceID",
 * but that column never holds the owning space's id: older rows carry the
 * level-zero space id and every newer row carries an empty string. The lookup
 * therefore matched nothing for any moved subspace.
 *
 * The defect sits in the generated SQL against real column contents, which a
 * mocked query builder cannot reproduce, so these tests run the real queries
 * against a real Postgres, over the real entity metadata, in a throwaway schema.
 */
const describePostgres = process.env.SPACE_MOVE_ROOMS_TEST_DATABASE_URL
  ? describe
  : describe.skip;

describePostgres(
  'SpaceMoveRoomsService updates-room lookup — PostgreSQL',
  () => {
    let source: DataSource;
    const schema = `space_move_rooms_${randomUUID().replaceAll('-', '')}`;

    beforeAll(async () => {
      source = new DataSource({
        type: 'postgres',
        url: process.env.SPACE_MOVE_ROOMS_TEST_DATABASE_URL,
        schema,
        entities: getMetadataArgsStorage()
          .tables.map(table => table.target)
          .filter(target => typeof target !== 'string'),
      });
      await source.initialize();
      await source.query(`CREATE SCHEMA "${schema}"`);
      await source.synchronize();
    }, 300000);

    afterAll(async () => {
      if (source?.isInitialized) {
        await source.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await source.destroy();
      }
    });

    const logger = {
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      verbose: vi.fn(),
      debug: vi.fn(),
    };

    const buildService = (descendantSpaceIds: string[] = []) => {
      const spaceLookupService = {
        getAllDescendantSpaceIDs: vi.fn().mockResolvedValue(descendantSpaceIds),
      };
      const communicationAdapter = {
        batchRemoveMember: vi.fn().mockResolvedValue(true),
      };
      const roomService = {
        deleteRoom: vi.fn().mockResolvedValue({}),
        createRoom: vi
          .fn()
          .mockImplementation(async () => ({ id: randomUUID() }) as Room),
      };
      const communicationService = {
        getCommunicationOrFail: vi
          .fn()
          .mockImplementation(async (id: string) => ({ id })),
        save: vi.fn().mockImplementation(async (c: unknown) => c),
      };
      const service = new SpaceMoveRoomsService(
        spaceLookupService as any,
        communicationAdapter as any,
        roomService as any,
        communicationService as any,
        source.manager,
        logger as any
      );
      return { service, roomService };
    };

    /**
     * A space with its community -> communication -> updates room chain, with
     * communication."spaceID" set to what production rows actually hold.
     */
    const createSpaceWithUpdatesRoom = async (
      level: SpaceLevel,
      storedSpaceID: string
    ): Promise<{ space: Space; communication: Communication; room: Room }> => {
      const communication = new Communication(
        `comm-${randomUUID().slice(0, 8)}`
      );
      communication.spaceID = storedSpaceID;
      communication.updates = new Room('updates', RoomType.UPDATES);
      const savedCommunication = await source
        .getRepository(Communication)
        .save(communication);

      const community = new Community();
      community.communication = savedCommunication;
      const savedCommunity = await source
        .getRepository(Community)
        .save(community);

      const spaces = source.getRepository(Space);
      const space = await spaces.save(
        spaces.create({
          nameID: `space-${randomUUID().slice(0, 8)}`,
          authorization: new AuthorizationPolicy(AuthorizationPolicyType.SPACE),
          level,
          sortOrder: 0,
          pinned: false,
          visibility: SpaceVisibility.ACTIVE,
          settings: {} as any,
          platformRolesAccess: { roles: [] } as any,
          community: savedCommunity,
        })
      );

      return {
        space,
        communication: savedCommunication,
        room: savedCommunication.updates,
      };
    };

    it('finds the updates rooms of the moved subtree whatever communication."spaceID" holds', async () => {
      const levelZeroID = randomUUID();
      // Newer rows store an empty string; older rows store the level-zero id.
      const moved = await createSpaceWithUpdatesRoom(SpaceLevel.L1, '');
      const child = await createSpaceWithUpdatesRoom(
        SpaceLevel.L2,
        levelZeroID
      );
      // Outside the moved subtree: must never be touched.
      const unrelated = await createSpaceWithUpdatesRoom(SpaceLevel.L1, '');

      const { service } = buildService();
      const subtree = [moved.space.id, child.space.id];

      const communications =
        await service.getCommunicationsWithUpdatesRooms(subtree);
      expect(
        communications
          .map(c => ({
            communicationId: c.communicationId,
            updatesRoomId: c.updatesRoomId,
            spaceId: c.spaceId,
          }))
          .sort((a, b) => a.spaceId.localeCompare(b.spaceId))
      ).toEqual(
        [
          {
            communicationId: moved.communication.id,
            updatesRoomId: moved.room.id,
            spaceId: moved.space.id,
          },
          {
            communicationId: child.communication.id,
            updatesRoomId: child.room.id,
            spaceId: child.space.id,
          },
        ].sort((a, b) => a.spaceId.localeCompare(b.spaceId))
      );

      const roomIds = await service.collectAllRoomIdsInSubtree(subtree);
      expect(roomIds).toEqual(
        expect.arrayContaining([moved.room.id, child.room.id])
      );
      expect(roomIds).not.toContain(unrelated.room.id);
    }, 120000);

    it('recreates the updates room of every space in the moved subtree', async () => {
      const moved = await createSpaceWithUpdatesRoom(SpaceLevel.L1, '');
      const child = await createSpaceWithUpdatesRoom(
        SpaceLevel.L2,
        randomUUID()
      );
      const unrelated = await createSpaceWithUpdatesRoom(SpaceLevel.L1, '');

      const { service, roomService } = buildService([child.space.id]);

      await service.handleRoomsDuringMove(moved.space.id, ['actor-1']);

      const deletedRoomIds = roomService.deleteRoom.mock.calls.map(
        ([arg]) => (arg as { roomID: string }).roomID
      );
      expect(deletedRoomIds.sort()).toEqual(
        [moved.room.id, child.room.id].sort()
      );
      expect(deletedRoomIds).not.toContain(unrelated.room.id);
      expect(roomService.createRoom).toHaveBeenCalledTimes(2);
    }, 120000);
  }
);
