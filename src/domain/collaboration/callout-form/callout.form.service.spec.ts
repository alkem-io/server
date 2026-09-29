import { CalloutFormQuestionType } from '@common/enums/callout.form.question.type';
import { CalloutFormResponseMode } from '@common/enums/callout.form.response.mode';
import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';
import { CalloutFormState } from '@common/enums/callout.form.state';
import { ValidationException } from '@common/exceptions';
import { CalloutFormResponse } from '../callout-form-response/callout.form.response.entity';
import { CalloutForm } from './callout.form.entity';
import { CalloutFormErrorCode } from './callout.form.error.codes';
import { ICalloutFormQuestion } from './callout.form.question.interface';
import {
  CalloutFormQuestionInput,
  CalloutFormService,
} from './callout.form.service';

const codeOf = (fn: () => unknown): unknown => {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationException);
    return (error as ValidationException).details?.code;
  }
  throw new Error('expected a ValidationException');
};

const text = (prompt = 'Name'): CalloutFormQuestionInput => ({
  prompt,
  type: CalloutFormQuestionType.SHORT_TEXT,
});
const choice = (
  labels: string[],
  type = CalloutFormQuestionType.SINGLE_CHOICE
): CalloutFormQuestionInput => ({
  prompt: 'Pick',
  type,
  options: labels.map(label => ({ label })),
});

describe('CalloutFormService', () => {
  const entityManager = {
    transaction: vi.fn(),
  };
  const repository = { findOne: vi.fn() };
  let service: CalloutFormService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new CalloutFormService(entityManager as any, repository as any);
  });

  describe('validateDefinition', () => {
    it.each([
      [0, CalloutFormErrorCode.FORM_QUESTIONS_COUNT],
      [51, CalloutFormErrorCode.FORM_QUESTIONS_COUNT],
    ])('rejects %i questions', (count, code) => {
      const questions = Array.from({ length: count }, () => text());
      expect(
        codeOf(() => service.validateDefinition(questions, undefined, 0))
      ).toBe(code);
    });

    it.each([1, 50])('accepts %i questions', count => {
      const questions = Array.from({ length: count }, () => text());
      expect(service.validateDefinition(questions, undefined, 0)).toHaveLength(
        count
      );
    });

    it.each([
      [['a'], true],
      [['a', 'b'], false],
      [Array.from({ length: 20 }, (_, i) => `o${i}`), false],
      [Array.from({ length: 21 }, (_, i) => `o${i}`), true],
    ])('choice options %j -> rejected: %s', (labels, rejected) => {
      const act = () =>
        service.validateDefinition([choice(labels)], undefined, 0);
      if (rejected) {
        expect(codeOf(act)).toBe(CalloutFormErrorCode.FORM_OPTIONS_COUNT);
      } else {
        expect(act()[0].options).toHaveLength(labels.length);
      }
    });

    it('rejects options on a text question', () => {
      const question = { ...text(), options: [{ label: 'a' }, { label: 'b' }] };
      expect(
        codeOf(() => service.validateDefinition([question], undefined, 0))
      ).toBe(CalloutFormErrorCode.FORM_OPTIONS_COUNT);
    });

    it('rejects duplicate option labels, trimmed and case-sensitive', () => {
      expect(
        codeOf(() =>
          service.validateDefinition([choice(['a', ' a '])], undefined, 0)
        )
      ).toBe(CalloutFormErrorCode.FORM_OPTIONS_DUPLICATE);
      expect(
        service.validateDefinition([choice(['a', 'A'])], undefined, 0)[0]
          .options
      ).toHaveLength(2);
    });

    it('assigns server ids and trims prompt and labels', () => {
      const [question] = service.validateDefinition(
        [
          {
            ...choice([' yes ', 'no']),
            prompt: '  Pick  ',
            explanation: '  ',
            required: true,
          },
        ],
        undefined,
        0
      );
      expect(question.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(question.prompt).toBe('Pick');
      expect(question.explanation).toBeUndefined();
      expect(question.required).toBe(true);
      expect(question.options?.map(o => o.label)).toEqual(['yes', 'no']);
      expect(question.options?.every(o => /^[0-9a-f-]{36}$/.test(o.id))).toBe(
        true
      );
    });

    describe('updating an existing definition', () => {
      const existing: ICalloutFormQuestion[] = [
        {
          id: '11111111-1111-4111-8111-111111111111',
          prompt: 'Name',
          type: CalloutFormQuestionType.SHORT_TEXT,
          required: false,
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          prompt: 'Pick',
          type: CalloutFormQuestionType.SINGLE_CHOICE,
          required: false,
          options: [
            { id: '33333333-3333-4333-8333-333333333333', label: 'a' },
            { id: '44444444-4444-4444-8444-444444444444', label: 'b' },
          ],
        },
      ];

      it('keeps the ids of known questions and options', () => {
        const result = service.validateDefinition(
          [
            { id: existing[0].id, ...text('Renamed'), required: true },
            {
              id: existing[1].id,
              prompt: 'Pick',
              type: CalloutFormQuestionType.SINGLE_CHOICE,
              options: [
                { id: existing[1].options![1].id, label: 'b' },
                { label: 'c' },
              ],
            },
          ],
          existing,
          3
        );
        expect(result[0].id).toBe(existing[0].id);
        expect(result[0].prompt).toBe('Renamed');
        expect(result[1].options![0].id).toBe(existing[1].options![1].id);
        expect(result[1].options![1].id).not.toBe(existing[1].options![0].id);
      });

      it('rejects an unknown question id and a repeated one', () => {
        expect(
          codeOf(() =>
            service.validateDefinition(
              [{ id: '99999999-9999-4999-8999-999999999999', ...text() }],
              existing,
              0
            )
          )
        ).toBe(CalloutFormErrorCode.FORM_UNKNOWN_QUESTION_ID);
        expect(
          codeOf(() =>
            service.validateDefinition(
              [
                { id: existing[0].id, ...text() },
                { id: existing[0].id, ...text() },
              ],
              existing,
              0
            )
          )
        ).toBe(CalloutFormErrorCode.FORM_UNKNOWN_QUESTION_ID);
      });

      it('rejects any id on a form that has no existing definition', () => {
        expect(
          codeOf(() =>
            service.validateDefinition(
              [{ id: existing[0].id, ...text() }],
              undefined,
              0
            )
          )
        ).toBe(CalloutFormErrorCode.FORM_UNKNOWN_QUESTION_ID);
      });

      it('rejects an option id that belongs to another question', () => {
        expect(
          codeOf(() =>
            service.validateDefinition(
              [
                { id: existing[0].id, ...text() },
                {
                  id: existing[1].id,
                  prompt: 'Pick',
                  type: CalloutFormQuestionType.SINGLE_CHOICE,
                  options: [{ id: existing[0].id, label: 'a' }, { label: 'b' }],
                },
              ],
              existing,
              0
            )
          )
        ).toBe(CalloutFormErrorCode.FORM_UNKNOWN_OPTION_ID);
      });

      it.each([
        [0, false],
        [1, true],
      ])('type change with %i responses -> locked: %s', (responseCount, locked) => {
        const act = () =>
          service.validateDefinition(
            [
              {
                id: existing[0].id,
                prompt: 'Name',
                type: CalloutFormQuestionType.LONG_TEXT,
              },
            ],
            existing,
            responseCount
          );
        if (locked) {
          expect(codeOf(act)).toBe(
            CalloutFormErrorCode.FORM_QUESTION_TYPE_LOCKED
          );
        } else {
          expect(act()[0].type).toBe(CalloutFormQuestionType.LONG_TEXT);
        }
      });

      it('allows toggling required even with responses', () => {
        const [question] = service.validateDefinition(
          [{ id: existing[0].id, ...text(), required: true }],
          existing,
          10
        );
        expect(question.required).toBe(true);
      });
    });
  });

  describe('createCalloutForm', () => {
    it('defaults to ADMINS / SINGLE / OPEN', () => {
      const form = service.createCalloutForm({ questions: [text()] } as any);
      expect(form.visibility).toBe(CalloutFormResponseVisibility.ADMINS);
      expect(form.responseMode).toBe(CalloutFormResponseMode.SINGLE);
      expect(form.state).toBe(CalloutFormState.OPEN);
      expect(form.questions).toHaveLength(1);
    });

    it('applies the given settings', () => {
      const form = service.createCalloutForm({
        questions: [text()],
        settings: {
          visibility: CalloutFormResponseVisibility.MEMBERS,
          responseMode: CalloutFormResponseMode.MULTIPLE,
          state: CalloutFormState.CLOSED,
        },
      } as any);
      expect(form.visibility).toBe(CalloutFormResponseVisibility.MEMBERS);
      expect(form.responseMode).toBe(CalloutFormResponseMode.MULTIPLE);
      expect(form.state).toBe(CalloutFormState.CLOSED);
    });

    it('validates the definition', () => {
      expect(() => service.createCalloutForm({ questions: [] } as any)).toThrow(
        ValidationException
      );
    });
  });

  describe('updateCalloutForm', () => {
    const formID = '55555555-5555-4555-8555-555555555555';
    let locked: CalloutForm;
    let manager: {
      findOne: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      query: ReturnType<typeof vi.fn>;
      save: ReturnType<typeof vi.fn>;
    };

    const arrange = (
      form: Partial<CalloutForm>,
      responseCount: number,
      multiHolders: unknown[] = []
    ) => {
      locked = Object.assign(new CalloutForm(), {
        id: formID,
        questions: [],
        visibility: CalloutFormResponseVisibility.ADMINS,
        responseMode: CalloutFormResponseMode.MULTIPLE,
        state: CalloutFormState.OPEN,
        ...form,
      });
      manager = {
        findOne: vi.fn().mockResolvedValue(locked),
        count: vi.fn().mockResolvedValue(responseCount),
        query: vi.fn().mockResolvedValue(multiHolders),
        save: vi.fn(async (entity: unknown) => entity),
      };
      entityManager.transaction.mockImplementation(async (cb: any) =>
        cb(manager)
      );
    };

    const rejection = async (input: any) => {
      try {
        await service.updateCalloutForm(input);
      } catch (error) {
        return (error as ValidationException).details?.code;
      }
      return undefined;
    };

    it('takes the pessimistic write lock on the form row', async () => {
      arrange({}, 0);
      await service.updateCalloutForm({ formID, settings: {} } as any);
      expect(manager.findOne).toHaveBeenCalledWith(CalloutForm, {
        where: { id: formID },
        lock: { mode: 'pessimistic_write' },
      });
      expect(manager.count).toHaveBeenCalledWith(CalloutFormResponse, {
        where: { formId: formID },
      });
    });

    it.each([
      [0, undefined],
      [1, CalloutFormErrorCode.FORM_VISIBILITY_WIDENING_BLOCKED],
    ])('widening ADMINS -> MEMBERS with %i responses -> %s', async (count, code) => {
      arrange({}, count);
      expect(
        await rejection({
          formID,
          settings: { visibility: CalloutFormResponseVisibility.MEMBERS },
        })
      ).toBe(code);
    });

    it('narrows MEMBERS -> ADMINS whatever the response count', async () => {
      arrange({ visibility: CalloutFormResponseVisibility.MEMBERS }, 9);
      await service.updateCalloutForm({
        formID,
        settings: { visibility: CalloutFormResponseVisibility.ADMINS },
      } as any);
      expect(locked.visibility).toBe(CalloutFormResponseVisibility.ADMINS);
    });

    it.each([
      [[], undefined],
      [
        [{ createdBy: 'u1' }],
        CalloutFormErrorCode.FORM_RESPONSE_MODE_SWITCH_BLOCKED,
      ],
    ])('MULTIPLE -> SINGLE with multi-response holders %j -> %s', async (holders, code) => {
      arrange({}, 3, holders);
      expect(
        await rejection({
          formID,
          settings: { responseMode: CalloutFormResponseMode.SINGLE },
        })
      ).toBe(code);
    });

    it('switches SINGLE -> MULTIPLE without looking at responses', async () => {
      arrange({ responseMode: CalloutFormResponseMode.SINGLE }, 5);
      await service.updateCalloutForm({
        formID,
        settings: { responseMode: CalloutFormResponseMode.MULTIPLE },
      } as any);
      expect(locked.responseMode).toBe(CalloutFormResponseMode.MULTIPLE);
      expect(manager.query).not.toHaveBeenCalled();
    });

    it('opens and closes freely', async () => {
      arrange({}, 4);
      await service.updateCalloutForm({
        formID,
        settings: { state: CalloutFormState.CLOSED },
      } as any);
      expect(locked.state).toBe(CalloutFormState.CLOSED);
    });

    it('validates the definition against the locked current one', async () => {
      const questionID = '66666666-6666-4666-8666-666666666666';
      arrange(
        {
          questions: [
            {
              id: questionID,
              prompt: 'Name',
              type: CalloutFormQuestionType.SHORT_TEXT,
              required: false,
            },
          ],
        },
        2
      );
      expect(
        await rejection({
          formID,
          questions: [
            {
              id: questionID,
              prompt: 'Name',
              type: CalloutFormQuestionType.LONG_TEXT,
              required: false,
            },
          ],
        })
      ).toBe(CalloutFormErrorCode.FORM_QUESTION_TYPE_LOCKED);
      expect(manager.save).not.toHaveBeenCalled();
    });
  });
});
