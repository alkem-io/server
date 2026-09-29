import { ActorType } from '@common/enums/actor.type';
import { CalloutFormQuestionType } from '@common/enums/callout.form.question.type';
import { CalloutFormResponseMode } from '@common/enums/callout.form.response.mode';
import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';
import { CalloutFormState } from '@common/enums/callout.form.state';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { ValidationException } from '@common/exceptions';
import { CalloutForm } from '../callout-form/callout.form.entity';
import { CalloutFormErrorCode } from '../callout-form/callout.form.error.codes';
import { ICalloutFormQuestion } from '../callout-form/callout.form.question.interface';
import { CalloutFormResponse } from './callout.form.response.entity';
import { CalloutFormResponseService } from './callout.form.response.service';

const Q_SHORT = '00000000-0000-4000-8000-000000000001';
const Q_LONG = '00000000-0000-4000-8000-000000000002';
const Q_SINGLE = '00000000-0000-4000-8000-000000000003';
const Q_MULTI = '00000000-0000-4000-8000-000000000004';
const O_A = '00000000-0000-4000-8000-0000000000a1';
const O_B = '00000000-0000-4000-8000-0000000000a2';
const O_C = '00000000-0000-4000-8000-0000000000a3';
const FOREIGN = '00000000-0000-4000-8000-0000000000ff';

const questions = (required = false): ICalloutFormQuestion[] => [
  {
    id: Q_SHORT,
    prompt: 'Short?',
    type: CalloutFormQuestionType.SHORT_TEXT,
    required,
  },
  {
    id: Q_LONG,
    prompt: 'Long?',
    type: CalloutFormQuestionType.LONG_TEXT,
    required,
  },
  {
    id: Q_SINGLE,
    prompt: 'Single?',
    type: CalloutFormQuestionType.SINGLE_CHOICE,
    required,
    options: [
      { id: O_A, label: 'A' },
      { id: O_B, label: 'B' },
    ],
  },
  {
    id: Q_MULTI,
    prompt: 'Multi?',
    type: CalloutFormQuestionType.MULTIPLE_CHOICE,
    required,
    options: [
      { id: O_A, label: 'A' },
      { id: O_B, label: 'B' },
      { id: O_C, label: 'C' },
    ],
  },
];

const failure = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationException);
    return (error as ValidationException).details as {
      code: string;
      questionIDs?: string[];
    };
  }
  throw new Error('expected a ValidationException');
};

describe('CalloutFormResponseService', () => {
  const actorLookupService = { getActorTypeByIdOrFail: vi.fn() };
  const entityManager = { transaction: vi.fn() };
  const repository = {
    findOne: vi.fn(),
    remove: vi.fn(),
    count: vi.fn(),
    find: vi.fn(),
    createQueryBuilder: vi.fn(),
  };
  let service: CalloutFormResponseService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new CalloutFormResponseService(
      actorLookupService as any,
      entityManager as any,
      repository as any
    );
  });

  describe('validateAndSnapshotAnswers', () => {
    it('snapshots prompts and labels from the definition, ignoring anything client-side', () => {
      const result = service.validateAndSnapshotAnswers(questions(), [
        { questionID: Q_SHORT, text: 'hello' },
        { questionID: Q_MULTI, selectedOptionIDs: [O_C, O_A] },
        { questionID: Q_SINGLE, selectedOptionIDs: [O_B] },
      ]);
      expect(result).toEqual([
        {
          questionID: Q_SHORT,
          prompt: 'Short?',
          type: CalloutFormQuestionType.SHORT_TEXT,
          text: 'hello',
        },
        {
          questionID: Q_SINGLE,
          prompt: 'Single?',
          type: CalloutFormQuestionType.SINGLE_CHOICE,
          selectedOptions: [{ id: O_B, label: 'B' }],
        },
        {
          questionID: Q_MULTI,
          prompt: 'Multi?',
          type: CalloutFormQuestionType.MULTIPLE_CHOICE,
          selectedOptions: [
            { id: O_A, label: 'A' },
            { id: O_C, label: 'C' },
          ],
        },
      ]);
    });

    it('leaves no entry for unanswered optional questions', () => {
      expect(
        service.validateAndSnapshotAnswers(questions(), [
          { questionID: Q_SHORT, text: '   ' },
          { questionID: Q_MULTI, selectedOptionIDs: [] },
        ])
      ).toEqual([]);
    });

    it.each([
      ['short 512', Q_SHORT, 512, true],
      ['short 513', Q_SHORT, 513, false],
      ['long 2048', Q_LONG, 2048, true],
      ['long 2049', Q_LONG, 2049, false],
    ])('length boundary %s', (_label, questionID, length, accepted) => {
      const act = () =>
        service.validateAndSnapshotAnswers(questions(), [
          { questionID, text: 'x'.repeat(length) },
        ]);
      if (accepted) {
        expect(act()).toHaveLength(1);
      } else {
        expect(failure(act)).toEqual({
          code: CalloutFormErrorCode.FORM_ANSWER_TOO_LONG,
          questionIDs: [questionID],
        });
      }
    });

    it('counts astral characters as UTF-16 units, like @MaxLength', () => {
      // 256 astral characters = 512 UTF-16 units: accepted; 257 = 514: rejected
      const astral = String.fromCodePoint(0x1f600);
      expect(
        service.validateAndSnapshotAnswers(questions(), [
          { questionID: Q_SHORT, text: astral.repeat(256) },
        ])
      ).toHaveLength(1);
      expect(
        failure(() =>
          service.validateAndSnapshotAnswers(questions(), [
            { questionID: Q_SHORT, text: astral.repeat(257) },
          ])
        ).code
      ).toBe(CalloutFormErrorCode.FORM_ANSWER_TOO_LONG);
    });

    it.each([
      [
        'unknown question',
        [{ questionID: FOREIGN, text: 'x' }],
        CalloutFormErrorCode.FORM_ANSWER_UNKNOWN_QUESTION,
      ],
      [
        'duplicate question',
        [
          { questionID: Q_SHORT, text: 'x' },
          { questionID: Q_SHORT, text: 'y' },
        ],
        CalloutFormErrorCode.FORM_ANSWER_DUPLICATE_QUESTION,
      ],
      [
        'text on a choice question',
        [{ questionID: Q_SINGLE, text: 'x' }],
        CalloutFormErrorCode.FORM_ANSWER_TYPE_MISMATCH,
      ],
      [
        'options on a text question',
        [{ questionID: Q_SHORT, selectedOptionIDs: [O_A] }],
        CalloutFormErrorCode.FORM_ANSWER_TYPE_MISMATCH,
      ],
      [
        'foreign option',
        [{ questionID: Q_SINGLE, selectedOptionIDs: [FOREIGN] }],
        CalloutFormErrorCode.FORM_ANSWER_INVALID_OPTION,
      ],
      [
        'foreign option (multi)',
        [{ questionID: Q_MULTI, selectedOptionIDs: [O_A, FOREIGN] }],
        CalloutFormErrorCode.FORM_ANSWER_INVALID_OPTION,
      ],
      [
        'two on single choice',
        [{ questionID: Q_SINGLE, selectedOptionIDs: [O_A, O_B] }],
        CalloutFormErrorCode.FORM_ANSWER_SELECTION_COUNT,
      ],
      [
        'duplicate ids on multi',
        [{ questionID: Q_MULTI, selectedOptionIDs: [O_A, O_A] }],
        CalloutFormErrorCode.FORM_ANSWER_SELECTION_COUNT,
      ],
    ])('%s', (_label, answers, code) => {
      expect(
        failure(() =>
          service.validateAndSnapshotAnswers(questions(), answers as any)
        ).code
      ).toBe(code);
    });

    it.each([
      ['missing', []],
      ['whitespace-only text', [{ questionID: Q_SHORT, text: ' \n\t' }]],
    ])('required short text %s -> FORM_ANSWER_REQUIRED naming every missing required question', (_label, answers) => {
      const details = failure(() =>
        service.validateAndSnapshotAnswers(questions(true), answers as any)
      );
      expect(details.code).toBe(CalloutFormErrorCode.FORM_ANSWER_REQUIRED);
      expect(details.questionIDs).toEqual(
        expect.arrayContaining([Q_SHORT, Q_LONG, Q_SINGLE, Q_MULTI])
      );
    });

    it('a required multiple choice with an empty selection is missing', () => {
      const details = failure(() =>
        service.validateAndSnapshotAnswers(questions(true), [
          { questionID: Q_SHORT, text: 'a' },
          { questionID: Q_LONG, text: 'b' },
          { questionID: Q_SINGLE, selectedOptionIDs: [O_A] },
          { questionID: Q_MULTI, selectedOptionIDs: [] },
        ])
      );
      expect(details.questionIDs).toEqual([Q_MULTI]);
    });

    it('never puts the answer text in the error', () => {
      const secret = 'SECRET-ANSWER-MARKER';
      try {
        service.validateAndSnapshotAnswers(questions(), [
          { questionID: Q_SINGLE, text: secret },
        ]);
      } catch (error) {
        expect(JSON.stringify(error)).not.toContain(secret);
        expect((error as Error).message).not.toContain(secret);
        expect(JSON.stringify((error as any).details)).not.toContain(secret);
        return;
      }
      throw new Error('expected failure');
    });
  });

  describe('submitResponse', () => {
    const formID = '77777777-7777-4777-8777-777777777777';
    const actorID = '88888888-8888-4888-8888-888888888888';
    let locked: CalloutForm;
    let manager: {
      findOne: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      save: ReturnType<typeof vi.fn>;
    };

    const input = (
      overrides: Record<string, unknown> = {}
    ): Parameters<CalloutFormResponseService['submitResponse']>[2] =>
      ({
        formID,
        acknowledgedVisibility: CalloutFormResponseVisibility.ADMINS,
        answers: [{ questionID: Q_SHORT, text: 'hello' }],
        ...overrides,
      }) as any;

    const arrange = (form: Partial<CalloutForm> = {}, ownCount = 0) => {
      locked = Object.assign(new CalloutForm(), {
        id: formID,
        questions: questions(),
        visibility: CalloutFormResponseVisibility.ADMINS,
        responseMode: CalloutFormResponseMode.SINGLE,
        state: CalloutFormState.OPEN,
        ...form,
      });
      manager = {
        findOne: vi.fn().mockResolvedValue(locked),
        count: vi.fn().mockResolvedValue(ownCount),
        create: vi.fn((_entity: unknown, data: object) => ({ ...data })),
        save: vi.fn(async (entity: object) => ({
          ...entity,
          id: 'response-1',
          createdDate: new Date('2026-01-01T00:00:00Z'),
        })),
      };
      entityManager.transaction.mockImplementation(async (cb: any) =>
        cb(manager)
      );
      actorLookupService.getActorTypeByIdOrFail.mockResolvedValue(
        ActorType.USER
      );
    };

    const codeOf = async (
      calloutVisibility: CalloutVisibility,
      submitInput = input()
    ) => {
      try {
        await service.submitResponse(actorID, calloutVisibility, submitInput);
      } catch (error) {
        return (error as ValidationException).details?.code;
      }
      return undefined;
    };

    it('stores the response under the form row lock and reports the locked visibility', async () => {
      arrange();
      const result = await service.submitResponse(
        actorID,
        CalloutVisibility.PUBLISHED,
        input()
      );
      expect(manager.findOne).toHaveBeenCalledWith(CalloutForm, {
        where: { id: formID },
        lock: { mode: 'pessimistic_write' },
      });
      expect(manager.create).toHaveBeenCalledWith(
        CalloutFormResponse,
        expect.objectContaining({ formId: formID, createdBy: actorID })
      );
      expect(result.response.id).toBe('response-1');
      expect(result.visibility).toBe(CalloutFormResponseVisibility.ADMINS);
    });

    it('checks in a fixed order: a draft, closed, widened form reports the draft first', async () => {
      arrange({
        state: CalloutFormState.CLOSED,
        visibility: CalloutFormResponseVisibility.MEMBERS,
      });
      expect(await codeOf(CalloutVisibility.DRAFT, input())).toBe(
        CalloutFormErrorCode.CALLOUT_NOT_PUBLISHED
      );
    });

    it('then closed, then widened, then already responded, then answers', async () => {
      arrange({
        state: CalloutFormState.CLOSED,
        visibility: CalloutFormResponseVisibility.MEMBERS,
      });
      expect(await codeOf(CalloutVisibility.PUBLISHED)).toBe(
        CalloutFormErrorCode.FORM_CLOSED
      );

      arrange({ visibility: CalloutFormResponseVisibility.MEMBERS }, 1);
      expect(await codeOf(CalloutVisibility.PUBLISHED)).toBe(
        CalloutFormErrorCode.FORM_VISIBILITY_CHANGED
      );

      arrange({}, 1);
      expect(
        await codeOf(
          CalloutVisibility.PUBLISHED,
          input({ answers: [{ questionID: FOREIGN, text: 'x' }] })
        )
      ).toBe(CalloutFormErrorCode.FORM_RESPONSE_ALREADY_EXISTS);

      arrange({});
      expect(
        await codeOf(
          CalloutVisibility.PUBLISHED,
          input({ answers: [{ questionID: FOREIGN, text: 'x' }] })
        )
      ).toBe(CalloutFormErrorCode.FORM_ANSWER_UNKNOWN_QUESTION);
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('accepts a narrower current visibility than the one acknowledged', async () => {
      arrange({ visibility: CalloutFormResponseVisibility.ADMINS });
      expect(
        await codeOf(
          CalloutVisibility.PUBLISHED,
          input({
            acknowledgedVisibility: CalloutFormResponseVisibility.MEMBERS,
          })
        )
      ).toBeUndefined();
    });

    it('rejects a second response in SINGLE mode but not in MULTIPLE mode', async () => {
      arrange({ responseMode: CalloutFormResponseMode.SINGLE }, 1);
      expect(await codeOf(CalloutVisibility.PUBLISHED)).toBe(
        CalloutFormErrorCode.FORM_RESPONSE_ALREADY_EXISTS
      );
      arrange({ responseMode: CalloutFormResponseMode.MULTIPLE }, 4);
      expect(await codeOf(CalloutVisibility.PUBLISHED)).toBeUndefined();
      expect(manager.count).not.toHaveBeenCalled();
    });

    it('rejects an anonymous or non-user actor before opening a transaction', async () => {
      arrange();
      await expect(
        service.submitResponse('', CalloutVisibility.PUBLISHED, input())
      ).rejects.toBeInstanceOf(ValidationException);
      actorLookupService.getActorTypeByIdOrFail.mockResolvedValue(
        ActorType.VIRTUAL_CONTRIBUTOR
      );
      await expect(
        service.submitResponse(actorID, CalloutVisibility.PUBLISHED, input())
      ).rejects.toBeInstanceOf(ValidationException);
      expect(entityManager.transaction).not.toHaveBeenCalled();
    });
  });

  describe('paging', () => {
    it.each([
      [undefined, 25],
      [0, 1],
      [10, 10],
      [500, 50],
    ])('clamps first=%s to %i', (first, expected) => {
      expect(service.clampPageSize(first as any)).toBe(expected);
    });

    it('returns an empty page for NONE without touching the database', async () => {
      const page = await service.paginate('f', 'NONE', '', 25);
      expect(page).toEqual({
        items: [],
        total: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      });
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('scopes OWN to the actor and ALL to the form', async () => {
      const queryBuilder = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(0),
        clone: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        addOrderBy: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
        expressionMap: { orderBys: {}, wheres: [{}] },
        alias: 'response',
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const ownerScopeCalls = () =>
        queryBuilder.andWhere.mock.calls.filter(
          ([clause]) => clause === 'response.createdBy = :actorID'
        );

      await service.paginate('form-1', 'ALL', 'actor-1', 25);
      expect(ownerScopeCalls()).toHaveLength(0);

      await service.paginate('form-1', 'OWN', 'actor-1', 25);
      expect(ownerScopeCalls()).toEqual([
        ['response.createdBy = :actorID', { actorID: 'actor-1' }],
      ]);
    });
  });

  describe('findMine', () => {
    it('is empty for an anonymous viewer', async () => {
      expect(await service.findMine('f', '')).toEqual([]);
      expect(repository.find).not.toHaveBeenCalled();
    });
  });

  describe('deleteResponse', () => {
    it('removes the response and returns it with its id', async () => {
      repository.findOne.mockResolvedValue({ id: 'r1' });
      repository.remove.mockImplementation(async (r: object) => ({
        ...r,
        id: undefined,
      }));
      const result = await service.deleteResponse('r1');
      expect(result.id).toBe('r1');
    });
  });
});
