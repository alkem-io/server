import { randomUUID } from 'node:crypto';
import { MessageSendLimitReachedException } from '@common/exceptions/message.send.limit.reached.exception';
import { AddMessageSendAllowance1791600000000 } from '@src/migrations/1791600000000-AddMessageSendAllowance';
import { DataSource } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MessageSendAllowanceService } from './message.send.allowance.service';

const databaseUrl = process.env.MIGRATION_TEST_DATABASE_URL;
const describePostgres = databaseUrl ? describe : describe.skip;

describePostgres('MessageSendAllowanceService (PostgreSQL)', () => {
  const schema = `message_send_allowance_${randomUUID().replaceAll('-', '')}`;
  let dataSource: DataSource;
  let service: MessageSendAllowanceService;

  // Every pooled connection resolves unqualified names in the test schema, so
  // the concurrent claims on separate connections see the same table.
  const openDataSource = async () => {
    const source = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      extra: { options: `-c search_path=${schema}`, max: 4 },
    });
    await source.initialize();
    return source;
  };

  const useDataSource = (source: DataSource) => {
    dataSource = source;
    service = new MessageSendAllowanceService(source.manager);
  };

  const newActor = async (): Promise<string> => {
    const id = randomUUID();
    await dataSource.query('INSERT INTO actor (id) VALUES ($1)', [id]);
    return id;
  };

  const sentAtCount = async (actorId: string): Promise<number | undefined> => {
    const rows: { n: number }[] = await dataSource.query(
      'SELECT cardinality("sentAt")::int AS n FROM message_send_allowance WHERE "actorId" = $1',
      [actorId]
    );
    return rows[0]?.n;
  };

  const ageRow = async (actorId: string, ages: string[]) => {
    await dataSource.query(
      `UPDATE message_send_allowance
         SET "sentAt" = ARRAY(SELECT now() - a::interval FROM unnest($2::text[]) AS a)
       WHERE "actorId" = $1`,
      [actorId, ages]
    );
  };

  const claimTimes = async (
    actorId: string,
    times: number,
    action: Parameters<
      MessageSendAllowanceService['claim']
    >[2] = 'sendMessageToUsers'
  ) => {
    for (let i = 0; i < times; i++) {
      await service.claim(actorId, 1, action);
    }
  };

  beforeAll(async () => {
    useDataSource(await openDataSource());
    await dataSource.query(`CREATE SCHEMA "${schema}"`);
    await dataSource.query('CREATE TABLE actor (id uuid PRIMARY KEY)');
    const queryRunner = dataSource.createQueryRunner();
    try {
      await new AddMessageSendAllowance1791600000000().up(queryRunner);
    } finally {
      await queryRunner.release();
    }
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await dataSource.destroy();
    }
  });

  it('admits 20 single claims and refuses the 21st', async () => {
    const actorId = await newActor();
    await claimTimes(actorId, 20);

    await expect(
      service.claim(actorId, 1, 'sendMessageToUsers')
    ).rejects.toBeInstanceOf(MessageSendLimitReachedException);
    expect(await sentAtCount(actorId)).toBe(20);
  });

  it('shares one allowance across the send actions', async () => {
    const actorId = await newActor();
    await claimTimes(actorId, 12, 'sendMessageToUsers');
    await claimTimes(actorId, 8, 'sendDirectMessageToUsers');

    await expect(
      service.claim(actorId, 1, 'sendMessageToOrganization')
    ).rejects.toBeInstanceOf(MessageSendLimitReachedException);
  });

  it('counts a time for 60 minutes and no longer', async () => {
    const actorId = await newActor();
    await claimTimes(actorId, 20);

    await ageRow(actorId, Array(20).fill('59 minutes 50 seconds'));
    await expect(
      service.claim(actorId, 1, 'sendMessageToUsers')
    ).rejects.toBeInstanceOf(MessageSendLimitReachedException);

    await ageRow(actorId, Array(20).fill('60 minutes'));
    await service.claim(actorId, 1, 'sendMessageToUsers');
    expect(await sentAtCount(actorId)).toBe(1);
  });

  it('rolls the window rather than resetting at a boundary', async () => {
    const actorId = await newActor();
    await service.claim(actorId, 20, 'sendMessageToUsers');
    await ageRow(actorId, [
      ...Array(10).fill('61 minutes'),
      ...Array(10).fill('30 minutes'),
    ]);

    await service.claim(actorId, 10, 'sendMessageToUsers');
    await expect(
      service.claim(actorId, 1, 'sendMessageToUsers')
    ).rejects.toBeInstanceOf(MessageSendLimitReachedException);
    expect(await sentAtCount(actorId)).toBe(20);
  });

  it('refuses a send larger than what is left as a whole and consumes nothing', async () => {
    const actorId = await newActor();
    await claimTimes(actorId, 18);

    await expect(
      service.claim(actorId, 3, 'sendMessageToUsers')
    ).rejects.toBeInstanceOf(MessageSendLimitReachedException);
    expect(await sentAtCount(actorId)).toBe(18);

    await service.claim(actorId, 2, 'sendMessageToUsers');
    expect(await sentAtCount(actorId)).toBe(20);
  });

  it('admits exactly one of two simultaneous claims at 19', async () => {
    const actorId = await newActor();
    await claimTimes(actorId, 19);

    const outcomes = await Promise.allSettled([
      service.claim(actorId, 1, 'sendMessageToUsers'),
      service.claim(actorId, 1, 'sendDirectMessageToUsers'),
    ]);

    expect(outcomes.filter(o => o.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.filter(o => o.status === 'rejected');
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      MessageSendLimitReachedException
    );
    expect(await sentAtCount(actorId)).toBe(20);
  });

  it('admits exactly one of two simultaneous first claims of 15', async () => {
    const actorId = await newActor();

    const outcomes = await Promise.allSettled([
      service.claim(actorId, 15, 'sendMessageToUsers'),
      service.claim(actorId, 15, 'sendDirectMessageToUsers'),
    ]);

    expect(outcomes.filter(o => o.status === 'fulfilled')).toHaveLength(1);
    expect(await sentAtCount(actorId)).toBe(15);
  });

  it('refuses a first send of 21 without writing a row, then admits 20', async () => {
    const actorId = await newActor();

    await expect(
      service.claim(actorId, 21, 'sendMessageToUsers')
    ).rejects.toBeInstanceOf(MessageSendLimitReachedException);
    expect(await sentAtCount(actorId)).toBeUndefined();

    await claimTimes(actorId, 20);
    expect(await sentAtCount(actorId)).toBe(20);
  });

  it('still refuses the 21st over a new connection', async () => {
    const actorId = await newActor();
    await claimTimes(actorId, 20);

    await dataSource.destroy();
    useDataSource(await openDataSource());

    await expect(
      service.claim(actorId, 1, 'sendMessageToUsers')
    ).rejects.toBeInstanceOf(MessageSendLimitReachedException);
  });

  it('fails with the database error for an unknown actor and writes nothing', async () => {
    const actorId = randomUUID();

    const error = await service.claim(actorId, 1, 'sendMessageToUsers').then(
      () => undefined,
      (e: unknown) => e
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(MessageSendLimitReachedException);
    expect(await sentAtCount(actorId)).toBeUndefined();
  });

  it('removes the row with the actor', async () => {
    const actorId = await newActor();
    await service.claim(actorId, 1, 'sendMessageToUsers');
    expect(await sentAtCount(actorId)).toBe(1);

    await dataSource.query('DELETE FROM actor WHERE id = $1', [actorId]);
    expect(await sentAtCount(actorId)).toBeUndefined();
  });

  it('drops the table on down and creates it again on up', async () => {
    const migration = new AddMessageSendAllowance1791600000000();
    const tableExists = async () => {
      const rows: { t: string | null }[] = await dataSource.query(
        `SELECT to_regclass('"${schema}".message_send_allowance')::text AS t`
      );
      return rows[0].t !== null;
    };
    const queryRunner = dataSource.createQueryRunner();
    try {
      await migration.down(queryRunner);
      expect(await tableExists()).toBe(false);
      await migration.up(queryRunner);
      expect(await tableExists()).toBe(true);
    } finally {
      await queryRunner.release();
    }
  });
});
