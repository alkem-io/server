import { CalloutFormQuestionType } from '@common/enums/callout.form.question.type';
import { CalloutFormResponseMode } from '@common/enums/callout.form.response.mode';
import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';
import { CalloutFormState } from '@common/enums/callout.form.state';
import { ValidationException } from '@common/exceptions';
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
        codeOf(() => service.validateDefinition(questions, undefined))
      ).toBe(code);
    });

    it.each([1, 50])('accepts %i questions', count => {
      const questions = Array.from({ length: count }, () => text());
      expect(service.validateDefinition(questions, undefined)).toHaveLength(
        count
      );
    });

    it.each([
      [['a'], true],
      [['a', 'b'], false],
      [Array.from({ length: 20 }, (_, i) => `o${i}`), false],
      [Array.from({ length: 21 }, (_, i) => `o${i}`), true],
    ])('choice options %j -> rejected: %s', (labels, rejected) => {
      const act = () => service.validateDefinition([choice(labels)], undefined);
      if (rejected) {
        expect(codeOf(act)).toBe(CalloutFormErrorCode.FORM_OPTIONS_COUNT);
      } else {
        expect(act()[0].options).toHaveLength(labels.length);
      }
    });

    it('rejects options on a text question', () => {
      const question = { ...text(), options: [{ label: 'a' }, { label: 'b' }] };
      expect(
        codeOf(() => service.validateDefinition([question], undefined))
      ).toBe(CalloutFormErrorCode.FORM_OPTIONS_COUNT);
    });

    it('rejects duplicate option labels, trimmed and case-sensitive', () => {
      expect(
        codeOf(() =>
          service.validateDefinition([choice(['a', ' a '])], undefined)
        )
      ).toBe(CalloutFormErrorCode.FORM_OPTIONS_DUPLICATE);
      expect(
        service.validateDefinition([choice(['a', 'A'])], undefined)[0].options
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
        undefined
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
          existing
        );
        expect(result[0].id).toBe(existing[0].id);
        expect(result[0].prompt).toBe('Renamed');
        expect(result[1].options![0].id).toBe(existing[1].options![1].id);
        expect(result[1].options![1].id).not.toBe(existing[1].options![0].id);
      });

      it('treats an explicit null question or option id as a new item', () => {
        const result = service.validateDefinition(
          [
            { id: existing[0].id, ...text() },
            { id: null as unknown as string, ...text('Added') },
            {
              id: existing[1].id,
              prompt: 'Pick',
              type: CalloutFormQuestionType.SINGLE_CHOICE,
              options: [
                { id: existing[1].options![0].id, label: 'a' },
                { id: null as unknown as string, label: 'c' },
              ],
            },
          ],
          existing
        );
        expect(result[1].id).toMatch(/^[0-9a-f-]{36}$/);
        expect([existing[0].id, existing[1].id]).not.toContain(result[1].id);
        expect(result[2].options![1].id).toMatch(/^[0-9a-f-]{36}$/);
        expect(result[2].options![1].id).not.toBe(existing[1].options![1].id);
      });

      it('rejects an unknown question id and a repeated one', () => {
        expect(
          codeOf(() =>
            service.validateDefinition(
              [{ id: '99999999-9999-4999-8999-999999999999', ...text() }],
              existing
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
              existing
            )
          )
        ).toBe(CalloutFormErrorCode.FORM_UNKNOWN_QUESTION_ID);
      });

      it('rejects any id on a form that has no existing definition', () => {
        expect(
          codeOf(() =>
            service.validateDefinition(
              [{ id: existing[0].id, ...text() }],
              undefined
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
              existing
            )
          )
        ).toBe(CalloutFormErrorCode.FORM_UNKNOWN_OPTION_ID);
      });

      it('changes the type of a text question to another text type', () => {
        const [question] = service.validateDefinition(
          [
            {
              id: existing[0].id,
              prompt: 'Name',
              type: CalloutFormQuestionType.LONG_TEXT,
            },
          ],
          existing
        );
        expect(question.id).toBe(existing[0].id);
        expect(question.type).toBe(CalloutFormQuestionType.LONG_TEXT);
      });

      it('changes text -> choice with 2-20 options, and rejects 1 option', () => {
        const toChoice = (labels: string[]) => () =>
          service.validateDefinition(
            [
              {
                id: existing[0].id,
                prompt: 'Name',
                type: CalloutFormQuestionType.MULTIPLE_CHOICE,
                options: labels.map(label => ({ label })),
              },
            ],
            existing
          );
        const [question] = toChoice(['x', 'y'])();
        expect(question.type).toBe(CalloutFormQuestionType.MULTIPLE_CHOICE);
        expect(question.options?.map(o => o.label)).toEqual(['x', 'y']);
        expect(codeOf(toChoice(['x']))).toBe(
          CalloutFormErrorCode.FORM_OPTIONS_COUNT
        );
      });

      it('changes choice -> text when the options are dropped, and rejects it with options', () => {
        const toText = (withOptions: boolean) => () =>
          service.validateDefinition(
            [
              {
                id: existing[1].id,
                prompt: 'Pick',
                type: CalloutFormQuestionType.SHORT_TEXT,
                ...(withOptions
                  ? { options: existing[1].options!.map(o => ({ ...o })) }
                  : {}),
              },
            ],
            existing
          );
        const [question] = toText(false)();
        expect(question.type).toBe(CalloutFormQuestionType.SHORT_TEXT);
        expect(question.options).toBeUndefined();
        expect(codeOf(toText(true))).toBe(
          CalloutFormErrorCode.FORM_OPTIONS_COUNT
        );
      });

      it('allows toggling required', () => {
        const [question] = service.validateDefinition(
          [{ id: existing[0].id, ...text(), required: true }],
          existing
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

    it('defaults defaultCollapsed to false and has no title or description', () => {
      const form = service.createCalloutForm({ questions: [text()] } as any);
      expect(form.defaultCollapsed).toBe(false);
      expect(form.title).toBeNull();
      expect(form.description).toBeNull();
    });

    it('stores defaultCollapsed from the settings', () => {
      const form = service.createCalloutForm({
        questions: [text()],
        settings: { defaultCollapsed: true },
      } as any);
      expect(form.defaultCollapsed).toBe(true);
    });

    it('trims the title and description', () => {
      const form = service.createCalloutForm({
        questions: [text()],
        title: '  Feedback  ',
        description: '\n Tell us more \t',
      } as any);
      expect(form.title).toBe('Feedback');
      expect(form.description).toBe('Tell us more');
    });

    it.each([
      ['empty', ''],
      ['whitespace-only', '  \n\t '],
      ['null', null],
    ])('stores an %s title and description as null', (_name, value) => {
      const form = service.createCalloutForm({
        questions: [text()],
        title: value,
        description: value,
      } as any);
      expect(form.title).toBeNull();
      expect(form.description).toBeNull();
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
    });

    // R19: nothing in an update depends on the existing responses, so the
    // service never reads them — no count, no per-member query, no row touched.
    const expectResponsesUntouched = () => {
      expect(manager.count).not.toHaveBeenCalled();
      expect(manager.query).not.toHaveBeenCalled();
      expect(manager.save).toHaveBeenCalledTimes(1);
      expect(manager.save).toHaveBeenCalledWith(locked);
    };

    it('widens ADMINS -> MEMBERS while the Form has responses', async () => {
      arrange({}, 4);
      await service.updateCalloutForm({
        formID,
        settings: { visibility: CalloutFormResponseVisibility.MEMBERS },
      } as any);
      expect(locked.visibility).toBe(CalloutFormResponseVisibility.MEMBERS);
      expectResponsesUntouched();
    });

    it('narrows MEMBERS -> ADMINS while the Form has responses', async () => {
      arrange({ visibility: CalloutFormResponseVisibility.MEMBERS }, 9);
      await service.updateCalloutForm({
        formID,
        settings: { visibility: CalloutFormResponseVisibility.ADMINS },
      } as any);
      expect(locked.visibility).toBe(CalloutFormResponseVisibility.ADMINS);
      expectResponsesUntouched();
    });

    it('switches MULTIPLE -> SINGLE while a member holds several responses', async () => {
      arrange({}, 3, [{ createdBy: 'u1' }]);
      await service.updateCalloutForm({
        formID,
        settings: { responseMode: CalloutFormResponseMode.SINGLE },
      } as any);
      expect(locked.responseMode).toBe(CalloutFormResponseMode.SINGLE);
      expectResponsesUntouched();
    });

    it('switches SINGLE -> MULTIPLE', async () => {
      arrange({ responseMode: CalloutFormResponseMode.SINGLE }, 5);
      await service.updateCalloutForm({
        formID,
        settings: { responseMode: CalloutFormResponseMode.MULTIPLE },
      } as any);
      expect(locked.responseMode).toBe(CalloutFormResponseMode.MULTIPLE);
      expectResponsesUntouched();
    });

    it('opens and closes freely', async () => {
      arrange({}, 4);
      await service.updateCalloutForm({
        formID,
        settings: { state: CalloutFormState.CLOSED },
      } as any);
      expect(locked.state).toBe(CalloutFormState.CLOSED);
    });

    it('treats explicit null settings as not provided', async () => {
      arrange({ visibility: CalloutFormResponseVisibility.MEMBERS }, 3);
      await service.updateCalloutForm({
        formID,
        settings: { visibility: null, responseMode: null, state: null },
      } as any);
      expect(locked.visibility).toBe(CalloutFormResponseVisibility.MEMBERS);
      expect(locked.responseMode).toBe(CalloutFormResponseMode.MULTIPLE);
      expect(locked.state).toBe(CalloutFormState.OPEN);
      expect(manager.save).toHaveBeenCalledWith(locked);
    });

    describe('title and description', () => {
      it('leaves them unchanged when the keys are absent', async () => {
        arrange({ title: 'Old title', description: 'Old description' }, 2);
        await service.updateCalloutForm({ formID, settings: {} } as any);
        expect(locked.title).toBe('Old title');
        expect(locked.description).toBe('Old description');
      });

      it('sets new trimmed values, also while the Form has responses', async () => {
        arrange({ title: 'Old title', description: null }, 7);
        await service.updateCalloutForm({
          formID,
          title: '  New title ',
          description: ' New description  ',
        } as any);
        expect(locked.title).toBe('New title');
        expect(locked.description).toBe('New description');
        expect(manager.save).toHaveBeenCalledWith(locked);
      });

      it.each([
        ['empty', ''],
        ['whitespace-only', '   '],
        ['null', null],
      ])('clears them on an %s value', async (_name, value) => {
        arrange({ title: 'Old title', description: 'Old description' }, 2);
        await service.updateCalloutForm({
          formID,
          title: value,
          description: value,
        } as any);
        expect(locked.title).toBeNull();
        expect(locked.description).toBeNull();
      });

      it('updates one without touching the other', async () => {
        arrange({ title: 'Old title', description: 'Old description' }, 0);
        await service.updateCalloutForm({ formID, title: 'Only title' } as any);
        expect(locked.title).toBe('Only title');
        expect(locked.description).toBe('Old description');
      });
    });

    describe('defaultCollapsed', () => {
      it.each([
        [false, true],
        [true, false],
        [null, true],
      ])('toggles %s -> %s', async (from, to) => {
        arrange({ defaultCollapsed: from }, 3);
        await service.updateCalloutForm({
          formID,
          settings: { defaultCollapsed: to },
        } as any);
        expect(locked.defaultCollapsed).toBe(to);
      });

      it.each([
        ['absent', {}],
        ['null', { defaultCollapsed: null }],
      ])('is unchanged when %s', async (_name, settings) => {
        arrange({ defaultCollapsed: true }, 0);
        await service.updateCalloutForm({ formID, settings } as any);
        expect(locked.defaultCollapsed).toBe(true);
      });
    });

    describe('definition', () => {
      const questionID = '66666666-6666-4666-8666-666666666666';
      const arrangeWithTextQuestion = () =>
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

      it('changes the type of a question while the Form has responses', async () => {
        arrangeWithTextQuestion();
        await service.updateCalloutForm({
          formID,
          questions: [
            {
              id: questionID,
              prompt: 'Name',
              type: CalloutFormQuestionType.LONG_TEXT,
              required: false,
            },
          ],
        } as any);
        expect(locked.questions).toEqual([
          {
            id: questionID,
            prompt: 'Name',
            type: CalloutFormQuestionType.LONG_TEXT,
            required: false,
          },
        ]);
        expectResponsesUntouched();
      });

      it('validates the definition against the locked current one', async () => {
        arrangeWithTextQuestion();
        expect(
          await rejection({
            formID,
            questions: [
              {
                id: questionID,
                prompt: 'Name',
                type: CalloutFormQuestionType.SINGLE_CHOICE,
                required: false,
                options: [{ label: 'only one' }],
              },
            ],
          })
        ).toBe(CalloutFormErrorCode.FORM_OPTIONS_COUNT);
        expect(
          await rejection({
            formID,
            questions: [
              {
                id: '99999999-9999-4999-8999-999999999999',
                prompt: 'Name',
                type: CalloutFormQuestionType.SHORT_TEXT,
                required: false,
              },
            ],
          })
        ).toBe(CalloutFormErrorCode.FORM_UNKNOWN_QUESTION_ID);
        expect(manager.save).not.toHaveBeenCalled();
      });
    });
  });
});
