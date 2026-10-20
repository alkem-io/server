import { DevicePushToken } from '@domain/device-push-token/device.push.token.entity';
import { DevicePushTokenService } from '@domain/device-push-token/device.push.token.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { repositoryMockFactory } from '@test/utils/repository.mock.factory';
import { getMetadataArgsStorage, In } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockConfigService = {
  get: vi.fn((key: string) => {
    const config: Record<string, unknown> = {
      'notifications.push.max_subscriptions_per_user': 10,
    };
    return config[key];
  }),
};

describe('DevicePushTokenService', () => {
  let service: DevicePushTokenService;
  let repository: ReturnType<typeof repositoryMockFactory>;

  beforeEach(async () => {
    repository = repositoryMockFactory();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicePushTokenService,
        {
          provide: getRepositoryToken(DevicePushToken),
          useValue: repository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DevicePushTokenService>(DevicePushTokenService);
    // The cap read runs on every register; a user at or under the cap evicts
    // nothing.
    repository.find!.mockResolvedValue([]);
  });

  describe('register (SC-001)', () => {
    it('binds the token in ONE upsert, conflicting on the token', async () => {
      repository.upsert!.mockResolvedValue({ identifiers: [] });

      await service.register('user-1', { token: 'tok-1', platform: 'android' });

      expect(repository.upsert).toHaveBeenCalledTimes(1);
      expect(repository.upsert).toHaveBeenCalledWith(
        {
          token: 'tok-1',
          platform: 'android',
          userId: 'user-1',
          updatedDate: expect.any(Date),
        },
        { conflictPaths: ['token'] }
      );
      // A findOne+save rewrite reintroduces the live defect X-3.
      expect(repository.findOne).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('binds the row to the ACTOR, so a second user registering the same token rebinds it', async () => {
      repository.upsert!.mockResolvedValue({ identifiers: [] });

      await service.register('user-1', { token: 'shared', platform: 'ios' });
      await service.register('user-2', { token: 'shared', platform: 'ios' });

      expect(repository.upsert).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ userId: 'user-1' }),
        { conflictPaths: ['token'] }
      );
      expect(repository.upsert).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ userId: 'user-2' }),
        { conflictPaths: ['token'] }
      );
    });

    // The rebind must REFRESH the timestamp, or the cap evicts the row it just
    // wrote. `DO UPDATE SET` only touches columns named in the upsert literal,
    // and the migration defaults both date columns to `now()` at insert — so a
    // rebound row would otherwise carry the FIRST owner's timestamp while the
    // eviction orders `updatedDate DESC`. Drop `updatedDate` from the literal
    // and this case goes red; it is the only thing standing between the
    // shared-device rebind and a success response that deleted its own row.
    it('refreshes updatedDate on the rebind, so the cap cannot evict the row it just wrote', async () => {
      repository.upsert!.mockResolvedValue({ identifiers: [] });

      await service.register('user-2', { token: 'shared', platform: 'ios' });

      const [payload] = repository.upsert!.mock.calls[0];
      expect(payload).toHaveProperty('updatedDate');
      expect(payload.updatedDate).toBeInstanceOf(Date);
    });
  });

  // SEC-086-01 / ENG-086-SRV-02. `registerDevicePushToken` is NON_ADMIN and
  // needs only a session, so without this bound one caller mints unbounded
  // rows and every later notification for them publishes one AMQP message per
  // row onto the queue that carries all web push too. Same bound, same config
  // value as the web half's `enforceSubscriptionCap`.
  describe('register enforces the per-user cap (SEC-086-01)', () => {
    it('evicts the rows beyond the cap, newest kept', async () => {
      repository.upsert!.mockResolvedValue({ identifiers: [] });
      repository.find!.mockResolvedValue(
        Array.from({ length: 13 }, (_, index) => ({ id: `tok-${index}` }))
      );
      repository.delete!.mockResolvedValue({ affected: 3 });

      await service.register('user-1', { token: 'tok-new', platform: 'ios' });

      expect(repository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { updatedDate: 'DESC' },
        select: { id: true },
      });
      expect(repository.delete).toHaveBeenCalledWith([
        'tok-10',
        'tok-11',
        'tok-12',
      ]);
    });

    it('deletes nothing for a user at the cap', async () => {
      repository.upsert!.mockResolvedValue({ identifiers: [] });
      repository.find!.mockResolvedValue(
        Array.from({ length: 10 }, (_, index) => ({ id: `tok-${index}` }))
      );

      await service.register('user-1', { token: 'tok-new', platform: 'ios' });

      expect(repository.delete).not.toHaveBeenCalled();
    });
  });

  describe('unregister (SC-002)', () => {
    it('deletes by { token, userId } — never by token alone', async () => {
      repository.delete!.mockResolvedValue({ affected: 1 });

      await service.unregister('user-1', 'tok-1');

      expect(repository.delete).toHaveBeenCalledWith({
        token: 'tok-1',
        userId: 'user-1',
      });
    });

    it('is a no-op on a token that is not the actor’s, and never throws', async () => {
      repository.delete!.mockResolvedValue({ affected: 0 });

      await expect(
        service.unregister('user-1', 'unknown-token')
      ).resolves.toBeUndefined();
    });
  });

  // SC-015, second half (the fan-out read's predicate). A wrong column — `id`,
  // the key BaseAlkemioEntity inherits, instead of `userId` — or a missing
  // `In` returns no rows for EVERY recipient, so the native publish loop emits
  // nothing and the widened early return fires exactly as it did before, with
  // every other wave-2 gate leg green.
  describe('getTokensForUsers (SC-015)', () => {
    it('queries by userId with In(...) over the given users', async () => {
      repository.find!.mockResolvedValue([]);

      await service.getTokensForUsers(['a', 'b']);

      expect(repository.find).toHaveBeenCalledWith({
        where: { userId: In(['a', 'b']) },
      });
    });
  });

  // SC-018, entity half. A pure entity-schema assertion, no database — house
  // pattern src/domain/common/memo/memo.entity.schema.spec.ts:23-33.
  //
  // Both constraints the migration creates must ALSO be declared on the
  // entity, or TypeORM's differ treats them as drift. Without the @Index, the
  // next unrelated `migration:generate` emits DROP INDEX
  // "IDX_device_push_token_token" and `upsert(..., { conflictPaths: ['token'] })`
  // then raises Postgres 42P10 on every device registration. Without
  // onDelete: 'CASCADE' on the relation, the same generate drops and re-adds
  // the FK as NO ACTION, after which deleting a user either fails outright or
  // orphans rows that keep receiving pushes for a deleted account.
  it('declares the UNIQUE token index and the cascading user relation ON THE ENTITY (SC-018)', () => {
    const index = getMetadataArgsStorage().indices.find(
      candidate =>
        candidate.target === DevicePushToken &&
        candidate.name === 'IDX_device_push_token_token'
    );
    expect(index).toBeDefined();
    expect(index!.columns).toEqual(['token']);
    expect(index!.unique).toBe(true);

    const relation = getMetadataArgsStorage().relations.find(
      candidate =>
        candidate.target === DevicePushToken &&
        candidate.propertyName === 'user'
    );
    expect(relation).toBeDefined();
    expect(relation!.options.onDelete).toBe('CASCADE');
  });
});
