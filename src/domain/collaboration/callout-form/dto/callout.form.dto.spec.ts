import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SubmitCalloutFormResponseInput } from '../../callout-form-response/dto/callout.form.response.dto.submit';
import { CreateCalloutFormInput } from './callout.form.dto.create';
import { UpdateCalloutFormInput } from './callout.form.dto.update';

const QUESTION_ID = '00000000-0000-4000-8000-000000000001';
const FORM_ID = '00000000-0000-4000-8000-0000000000f0';

const errorsOf = async (cls: any, plain: unknown) =>
  validate(plainToInstance(cls, plain) as object);

describe('Form DTO validation', () => {
  const question = (overrides: Record<string, unknown> = {}) => ({
    prompt: 'What is your name?',
    type: 'short_text',
    ...overrides,
  });

  describe('CreateCalloutFormInput', () => {
    it('accepts a minimal definition', async () => {
      expect(
        await errorsOf(CreateCalloutFormInput, { questions: [question()] })
      ).toHaveLength(0);
    });

    it.each([
      ['a blank prompt', { prompt: '   ' }],
      ['an empty prompt', { prompt: '' }],
      ['a 513-character prompt', { prompt: 'x'.repeat(513) }],
      ['a 2049-character explanation', { explanation: 'x'.repeat(2049) }],
      ['an unknown type', { type: 'rating' }],
      ['a blank option label', { options: [{ label: ' ' }] }],
      [
        'a 513-character option label',
        { options: [{ label: 'x'.repeat(513) }] },
      ],
    ])('rejects %s', async (_name, overrides) => {
      const errors = await errorsOf(CreateCalloutFormInput, {
        questions: [question(overrides)],
      });
      expect(errors.length).toBeGreaterThan(0);
    });

    it('accepts the 512 / 2048 boundaries', async () => {
      expect(
        await errorsOf(CreateCalloutFormInput, {
          questions: [
            question({
              prompt: 'x'.repeat(512),
              explanation: 'y'.repeat(2048),
              options: [{ label: 'z'.repeat(512) }],
            }),
          ],
        })
      ).toHaveLength(0);
    });

    it('leaves the counts (questions 1-50, options 2-20) to the service, which reports them with reason codes', async () => {
      expect(
        await errorsOf(CreateCalloutFormInput, { questions: [] })
      ).toHaveLength(0);
      expect(
        await errorsOf(CreateCalloutFormInput, {
          questions: Array.from({ length: 51 }, () => question()),
        })
      ).toHaveLength(0);
    });
  });

  describe('UpdateCalloutFormInput', () => {
    it('requires a UUID form id and validates question ids', async () => {
      expect(
        await errorsOf(UpdateCalloutFormInput, {
          formID: 'not-a-uuid',
        })
      ).not.toHaveLength(0);
      expect(
        await errorsOf(UpdateCalloutFormInput, {
          formID: FORM_ID,
          questions: [{ id: 'nope', ...question(), required: false }],
        })
      ).not.toHaveLength(0);
      expect(
        await errorsOf(UpdateCalloutFormInput, {
          formID: FORM_ID,
          questions: [{ id: QUESTION_ID, ...question(), required: true }],
        })
      ).toHaveLength(0);
    });

    it('requires the required flag on a question update', async () => {
      expect(
        await errorsOf(UpdateCalloutFormInput, {
          formID: FORM_ID,
          questions: [question()],
        })
      ).not.toHaveLength(0);
    });
  });

  describe('SubmitCalloutFormResponseInput', () => {
    const submit = (overrides: Record<string, unknown> = {}) => ({
      formID: FORM_ID,
      acknowledgedVisibility: 'admins',
      answers: [{ questionID: QUESTION_ID, text: 'hi' }],
      ...overrides,
    });

    it('accepts a well-formed submission', async () => {
      expect(
        await errorsOf(SubmitCalloutFormResponseInput, submit())
      ).toHaveLength(0);
    });

    it.each([
      [
        'a missing acknowledged visibility',
        { acknowledgedVisibility: undefined },
      ],
      ['an unknown visibility', { acknowledgedVisibility: 'everyone' }],
      ['a non-uuid form id', { formID: 'x' }],
      ['a non-uuid question id', { answers: [{ questionID: 'x', text: 'a' }] }],
      [
        'a non-uuid selected option',
        { answers: [{ questionID: QUESTION_ID, selectedOptionIDs: ['x'] }] },
      ],
    ])('rejects %s', async (_name, overrides) => {
      expect(
        await errorsOf(SubmitCalloutFormResponseInput, submit(overrides))
      ).not.toHaveLength(0);
    });

    it('does not cap answer length: the type-dependent 512 / 2048 limit is enforced by the service with a reason code', async () => {
      expect(
        await errorsOf(
          SubmitCalloutFormResponseInput,
          submit({
            answers: [{ questionID: QUESTION_ID, text: 'x'.repeat(5000) }],
          })
        )
      ).toHaveLength(0);
    });
  });
});
