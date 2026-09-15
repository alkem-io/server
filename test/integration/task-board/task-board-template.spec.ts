import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { CalloutService } from '@domain/collaboration/callout/callout.service';
import { TaskBoardService } from '@domain/collaboration/callout/task-board/task.board.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { InputCreatorService } from '../../../src/services/api/input-creator/input.creator.service';

/**
 * The template round-trip contract for a Tasks board. Saving a board as a
 * template must capture the board as its own `taskBoard` block — the ordered
 * columns — and must NOT leak the raw 'task' marker tagset into the generic
 * classification, so a callout created from the template is a board again with
 * the same columns and zero tasks. A plain posts callout must serialise with no
 * board block at all.
 */

const COLUMNS = ['Backlog', 'To do', 'In progress', 'Done'];

function baseProfile() {
  return {
    id: 'profile-1',
    displayName: 'A board',
    description: 'desc',
    tagline: 'tag',
    tagsets: [],
    references: [],
    visuals: [],
  };
}

function baseCallout(classificationTagsets: any[]) {
  return {
    id: 'callout-1',
    nameID: 'a-board',
    sortOrder: 1,
    settings: { visibility: 'published', framing: {} },
    contributionDefaults: { id: 'defaults-1' },
    classification: { id: 'cls-1', tagsets: classificationTagsets },
    framing: {
      id: 'framing-1',
      type: CalloutFramingType.NONE,
      profile: baseProfile(),
    },
  } as any;
}

describe('Task board template round-trip', () => {
  let service: InputCreatorService;
  let calloutService: { getCalloutOrFail: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InputCreatorService,
        // Real board logic — the round-trip under test.
        TaskBoardService,
        MockWinstonProvider,
      ],
    })
      .useMocker(token => {
        if (typeof token === 'string' && token === 'defaultEntityManager') {
          return { findOneOrFail: vi.fn() };
        }
        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(InputCreatorService);
    calloutService = module.get(CalloutService) as any;
  });

  it('captures a board as a taskBoard block and strips the task marker from the classification', async () => {
    calloutService.getCalloutOrFail.mockResolvedValue(
      baseCallout([
        {
          name: TagsetReservedName.TASK,
          tags: ['Backlog'],
          tagsetTemplate: { id: 'tmpl-1', allowedValues: COLUMNS },
        },
        { name: TagsetReservedName.KEYWORDS, tags: ['x'] },
      ])
    );

    const input = await service.buildCreateCalloutInputFromCallout('callout-1');

    expect(input).not.toBeNull();
    // The board is captured as its ordered columns.
    expect(input?.taskBoard).toEqual({ columns: COLUMNS });
    // The 'task' marker is gone from the generic classification; the other
    // tagset survives.
    const emittedNames = (input?.classification?.tagsets ?? []).map(
      (tagset: any) => tagset.name
    );
    expect(emittedNames).not.toContain(TagsetReservedName.TASK);
    expect(emittedNames).toContain(TagsetReservedName.KEYWORDS);
  });

  it('emits no taskBoard block for a plain posts callout', async () => {
    calloutService.getCalloutOrFail.mockResolvedValue(
      baseCallout([{ name: TagsetReservedName.KEYWORDS, tags: ['x'] }])
    );

    const input = await service.buildCreateCalloutInputFromCallout('callout-1');

    expect(input?.taskBoard).toBeUndefined();
    const emittedNames = (input?.classification?.tagsets ?? []).map(
      (tagset: any) => tagset.name
    );
    expect(emittedNames).toContain(TagsetReservedName.KEYWORDS);
  });

  it('does not fabricate a board when a task marker carries no column template', async () => {
    // A board is defined by the 'task' marker; getColumns falls back to an
    // empty list when the marker has no template, so the emitted board has no
    // columns and the callout create seeds the default set.
    calloutService.getCalloutOrFail.mockResolvedValue(
      baseCallout([{ name: TagsetReservedName.TASK, tags: ['Backlog'] }])
    );

    const input = await service.buildCreateCalloutInputFromCallout('callout-1');

    expect(input?.taskBoard).toEqual({ columns: [] });
    const emittedNames = (input?.classification?.tagsets ?? []).map(
      (tagset: any) => tagset.name
    );
    expect(emittedNames).not.toContain(TagsetReservedName.TASK);
  });
});
