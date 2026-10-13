import { randomUUID } from 'node:crypto';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { CalendarEventType } from '@common/enums/calendar.event.type';
import { SpaceLevel } from '@common/enums/space.level';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { Collaboration } from '@domain/collaboration/collaboration';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { Space } from '@domain/space/space/space.entity';
import { Calendar } from '@domain/timeline/calendar/calendar.entity';
import { CalendarEvent } from '@domain/timeline/event/event.entity';
import { CalendarEventService } from '@domain/timeline/event/event.service';
import { Timeline } from '@domain/timeline/timeline/timeline.entity';
import { DataSource, getMetadataArgsStorage } from 'typeorm';

/**
 * Regression coverage for the wrong "in {{subspace}}" badge on bubbled-up
 * events in a space-level calendar: every event was labelled with the same
 * unrelated space, from outside the current space tree.
 *
 * getSubspace resolved the owning space id through a raw-select alias and then
 * looked the space up by that id. The alias was unquoted, so Postgres folded it
 * to lower case and the typed read of the raw row was always undefined; the
 * follow-up lookup then ran without any WHERE filter and returned whichever
 * space the database handed back first.
 *
 * The whole defect lives in the boundary between generated SQL and the shape of
 * the raw row Postgres returns, which no mocked repository can reproduce: a
 * stub asked for `spaceId` would hand back `spaceId`. These tests therefore run
 * the real query against a real Postgres, over the real entity metadata, in a
 * throwaway schema.
 */
const describePostgres = process.env.CALENDAR_SUBSPACE_TEST_DATABASE_URL
  ? describe
  : describe.skip;

describePostgres('CalendarEvent.subspace resolution — PostgreSQL', () => {
  let source: DataSource;
  let service: CalendarEventService;
  const schema = `calendar_subspace_${randomUUID().replaceAll('-', '')}`;

  beforeAll(async () => {
    source = new DataSource({
      type: 'postgres',
      url: process.env.CALENDAR_SUBSPACE_TEST_DATABASE_URL,
      schema,
      // Use the real entities, including their imported relation targets.
      entities: getMetadataArgsStorage()
        .tables.map(table => table.target)
        .filter(target => typeof target !== 'string'),
    });
    await source.initialize();
    await source.query(`CREATE SCHEMA "${schema}"`);
    await source.synchronize();

    // Only the two repositories getSubspace uses are real; the collaborators
    // behind the service's other methods are never reached from here.
    service = new CalendarEventService(
      {} as any,
      {} as any,
      {} as any,
      source.getRepository(Space),
      source.getRepository(CalendarEvent),
      {} as any
    );
  }, 300000);

  afterAll(async () => {
    if (source?.isInitialized) {
      await source.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await source.destroy();
    }
  });

  /**
   * One space with its own collaboration → timeline → calendar chain, and one
   * event on that calendar — the shape getSubspace walks back up.
   */
  const createSpaceWithEvent = async (
    level: SpaceLevel
  ): Promise<{ space: Space; event: CalendarEvent }> => {
    const calendar = await source
      .getRepository(Calendar)
      .save(source.getRepository(Calendar).create({}));
    const timeline = await source
      .getRepository(Timeline)
      .save(source.getRepository(Timeline).create({ calendar }));
    const collaboration = await source
      .getRepository(Collaboration)
      .save(
        source
          .getRepository(Collaboration)
          .create({ isTemplate: false, timeline })
      );
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
        collaboration,
      })
    );
    const events = source.getRepository(CalendarEvent);
    const event = await events.save(
      events.create({
        nameID: `event-${randomUUID().slice(0, 8)}`,
        type: CalendarEventType.EVENT,
        createdBy: randomUUID(),
        startDate: new Date('2026-01-01T10:00:00Z'),
        wholeDay: false,
        multipleDays: false,
        durationMinutes: 60,
        visibleOnParentCalendar: true,
        calendar,
      })
    );

    return { space, event };
  };

  it('resolves a bubbled-up subspace event to its own subspace, never to an unrelated space', async () => {
    // Two L1 subspaces, each with its own event. Both are candidates for an
    // unfiltered lookup, so a lookup that drops its WHERE clause can agree with
    // at most one of them — which is what makes the second assertion below
    // discriminating rather than lucky.
    const first = await createSpaceWithEvent(SpaceLevel.L1);
    const second = await createSpaceWithEvent(SpaceLevel.L1);

    const firstResolved = await service.getSubspace(first.event);
    const secondResolved = await service.getSubspace(second.event);

    expect(firstResolved?.id).toBe(first.space.id);
    expect(secondResolved?.id).toBe(second.space.id);
    // Stated separately: the failure mode was not "off by one neighbour" but
    // "the same arbitrary space for every event".
    expect(firstResolved?.id).not.toBe(secondResolved?.id);
    // The resolved Space is handed straight to GraphQL, so it has to arrive
    // hydrated the way a repository read hydrates it — eager relations
    // included.
    expect(firstResolved?.authorization?.id).toBe(
      first.space.authorization?.id
    );
  }, 120000);

  it('resolves an event on an L0 space own calendar to undefined, so it carries no badge', async () => {
    const levelZero = await createSpaceWithEvent(SpaceLevel.L0);

    await expect(service.getSubspace(levelZero.event)).resolves.toBeUndefined();
  }, 120000);

  it('resolves an event whose calendar hangs off no space at all to undefined', async () => {
    const calendar = await source
      .getRepository(Calendar)
      .save(source.getRepository(Calendar).create({}));
    const events = source.getRepository(CalendarEvent);
    const orphan = await events.save(
      events.create({
        nameID: `event-${randomUUID().slice(0, 8)}`,
        type: CalendarEventType.EVENT,
        createdBy: randomUUID(),
        startDate: new Date('2026-01-01T10:00:00Z'),
        wholeDay: false,
        multipleDays: false,
        durationMinutes: 60,
        visibleOnParentCalendar: false,
        calendar,
      })
    );

    await expect(service.getSubspace(orphan)).resolves.toBeUndefined();
  }, 120000);
});
