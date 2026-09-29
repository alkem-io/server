import {
  FORM_QUESTION_OPTIONS_MAX_COUNT,
  FORM_QUESTION_OPTIONS_MIN_COUNT,
  FORM_QUESTIONS_MAX_COUNT,
  FORM_QUESTIONS_MIN_COUNT,
} from '@common/constants';
import { CalloutFormQuestionType } from '@common/enums/callout.form.question.type';
import { CalloutFormResponseMode } from '@common/enums/callout.form.response.mode';
import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';
import { CalloutFormState } from '@common/enums/callout.form.state';
import { LogContext } from '@common/enums/logging.context';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import {
  EntityManager,
  FindOneOptions,
  FindOptionsRelations,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { Callout } from '../callout/callout.entity';
import { ICallout } from '../callout/callout.interface';
import { CalloutFormResponse } from '../callout-form-response/callout.form.response.entity';
import { CalloutForm } from './callout.form.entity';
import { CalloutFormErrorCode } from './callout.form.error.codes';
import { ICalloutForm } from './callout.form.interface';
import {
  ICalloutFormQuestion,
  ICalloutFormQuestionOption,
} from './callout.form.question.interface';
import { widthOf } from './callout.form.width';
import { CreateCalloutFormInput } from './dto/callout.form.dto.create';
import { UpdateCalloutFormInput } from './dto/callout.form.dto.update';

/** The shape shared by the create and update question inputs. */
export type CalloutFormQuestionInput = {
  id?: string;
  prompt: string;
  explanation?: string;
  type: CalloutFormQuestionType;
  required?: boolean;
  options?: { id?: string; label: string }[];
};

const isChoiceType = (type: CalloutFormQuestionType): boolean =>
  type === CalloutFormQuestionType.SINGLE_CHOICE ||
  type === CalloutFormQuestionType.MULTIPLE_CHOICE;

@Injectable()
export class CalloutFormService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @InjectRepository(CalloutForm)
    private calloutFormRepository: Repository<CalloutForm>
  ) {}

  /**
   * Builds the (unsaved) Form of a new FORM framing. It is persisted by the
   * framing's cascade together with the callout.
   */
  public createCalloutForm(input: CreateCalloutFormInput): CalloutForm {
    const questions = this.validateDefinition(input.questions, undefined, 0);
    const form = new CalloutForm();
    form.questions = questions;
    form.visibility =
      input.settings?.visibility ?? CalloutFormResponseVisibility.ADMINS;
    form.responseMode =
      input.settings?.responseMode ?? CalloutFormResponseMode.SINGLE;
    form.state = input.settings?.state ?? CalloutFormState.OPEN;
    return form;
  }

  /**
   * Validates a full ordered question list (invariants I1/I2) and returns the
   * definition to store: server-assigned ids for new questions/options, trimmed
   * prompts and labels. `existing` is the current definition when updating;
   * `responseCount` locks the question type once a response exists.
   * Errors carry a reason code and question ids only.
   */
  public validateDefinition(
    questions: CalloutFormQuestionInput[],
    existing: ICalloutFormQuestion[] | undefined,
    responseCount: number
  ): ICalloutFormQuestion[] {
    if (
      questions.length < FORM_QUESTIONS_MIN_COUNT ||
      questions.length > FORM_QUESTIONS_MAX_COUNT
    ) {
      throw this.reject(
        'A Form needs between 1 and 50 questions',
        CalloutFormErrorCode.FORM_QUESTIONS_COUNT
      );
    }

    const existingByID = new Map(
      (existing ?? []).map(question => [question.id, question])
    );
    const seenQuestionIDs = new Set<string>();

    return questions.map(input => {
      let previous: ICalloutFormQuestion | undefined;
      if (input.id !== undefined) {
        previous = existingByID.get(input.id);
        if (!previous || seenQuestionIDs.has(input.id)) {
          throw this.reject(
            'A question of the update does not belong to this Form',
            CalloutFormErrorCode.FORM_UNKNOWN_QUESTION_ID,
            [input.id]
          );
        }
        seenQuestionIDs.add(input.id);
      }
      const questionID = previous?.id ?? randomUUID();

      if (previous && previous.type !== input.type && responseCount > 0) {
        throw this.reject(
          'The type of a question cannot change once the Form has responses',
          CalloutFormErrorCode.FORM_QUESTION_TYPE_LOCKED,
          [questionID]
        );
      }

      const question: ICalloutFormQuestion = {
        id: questionID,
        prompt: input.prompt.trim(),
        type: input.type,
        required: input.required ?? false,
      };
      const explanation = input.explanation?.trim();
      if (explanation) {
        question.explanation = explanation;
      }
      const options = this.validateOptions(input, questionID, previous);
      if (options) {
        question.options = options;
      }
      return question;
    });
  }

  private validateOptions(
    input: CalloutFormQuestionInput,
    questionID: string,
    previous: ICalloutFormQuestion | undefined
  ): ICalloutFormQuestionOption[] | undefined {
    const inputOptions = input.options ?? [];

    if (!isChoiceType(input.type)) {
      if (inputOptions.length > 0) {
        throw this.reject(
          'Only choice questions can have options',
          CalloutFormErrorCode.FORM_OPTIONS_COUNT,
          [questionID]
        );
      }
      return undefined;
    }

    if (
      inputOptions.length < FORM_QUESTION_OPTIONS_MIN_COUNT ||
      inputOptions.length > FORM_QUESTION_OPTIONS_MAX_COUNT
    ) {
      throw this.reject(
        'A choice question needs between 2 and 20 options',
        CalloutFormErrorCode.FORM_OPTIONS_COUNT,
        [questionID]
      );
    }

    const previousOptionIDs = new Set(
      (previous?.options ?? []).map(option => option.id)
    );
    const seenOptionIDs = new Set<string>();
    const seenLabels = new Set<string>();

    return inputOptions.map(option => {
      let optionID: string;
      if (option.id !== undefined) {
        if (!previousOptionIDs.has(option.id) || seenOptionIDs.has(option.id)) {
          throw this.reject(
            'An option of the update does not belong to this question',
            CalloutFormErrorCode.FORM_UNKNOWN_OPTION_ID,
            [questionID]
          );
        }
        optionID = option.id;
        seenOptionIDs.add(option.id);
      } else {
        optionID = randomUUID();
      }
      const label = option.label.trim();
      if (seenLabels.has(label)) {
        throw this.reject(
          'Option labels must be unique within a question',
          CalloutFormErrorCode.FORM_OPTIONS_DUPLICATE,
          [questionID]
        );
      }
      seenLabels.add(label);
      return { id: optionID, label };
    });
  }

  /**
   * Applies a definition and/or settings update under the Form row lock so it
   * serializes against submissions and other edits.
   */
  public async updateCalloutForm(
    input: UpdateCalloutFormInput
  ): Promise<ICalloutForm> {
    return this.entityManager.transaction(async manager => {
      const locked = await manager.findOne(CalloutForm, {
        where: { id: input.formID },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) {
        throw new EntityNotFoundException(
          'Form not found',
          LogContext.COLLABORATION,
          { formID: input.formID }
        );
      }

      const responseCount = await manager.count(CalloutFormResponse, {
        where: { formId: input.formID },
      });

      const settings = input.settings;
      if (settings?.visibility !== undefined) {
        if (
          widthOf(settings.visibility) > widthOf(locked.visibility) &&
          responseCount > 0
        ) {
          throw this.reject(
            'The response visibility cannot be widened once the Form has responses',
            CalloutFormErrorCode.FORM_VISIBILITY_WIDENING_BLOCKED
          );
        }
        locked.visibility = settings.visibility;
      }
      if (settings?.responseMode !== undefined) {
        if (
          settings.responseMode === CalloutFormResponseMode.SINGLE &&
          locked.responseMode === CalloutFormResponseMode.MULTIPLE &&
          (await this.hasMemberWithMultipleResponses(manager, input.formID))
        ) {
          throw this.reject(
            'The Form cannot switch to a single response while a member has several',
            CalloutFormErrorCode.FORM_RESPONSE_MODE_SWITCH_BLOCKED
          );
        }
        locked.responseMode = settings.responseMode;
      }
      if (settings?.state !== undefined) {
        locked.state = settings.state;
      }

      if (input.questions) {
        locked.questions = this.validateDefinition(
          input.questions,
          locked.questions,
          responseCount
        );
      }

      return manager.save(locked);
    });
  }

  private async hasMemberWithMultipleResponses(
    manager: EntityManager,
    formID: string
  ): Promise<boolean> {
    const rows: unknown[] = await manager.query(
      `SELECT "createdBy" FROM "callout_form_response"
        WHERE "formId" = $1 AND "createdBy" IS NOT NULL
        GROUP BY "createdBy" HAVING COUNT(*) > 1 LIMIT 1`,
      [formID]
    );
    return rows.length > 0;
  }

  public async getCalloutFormOrFail(
    formID: string,
    options?: FindOneOptions<CalloutForm>
  ): Promise<ICalloutForm> {
    const form = await this.calloutFormRepository.findOne({
      where: { id: formID },
      ...options,
    });
    if (!form) {
      throw new EntityNotFoundException(
        'Form not found',
        LogContext.COLLABORATION,
        { formID }
      );
    }
    return form;
  }

  /**
   * The Post that owns the Form. Loaded through the framing relation so this
   * module needs no dependency on the callout module.
   */
  public async getCalloutForFormOrFail(
    formID: string,
    relations: FindOptionsRelations<Callout>
  ): Promise<ICallout> {
    const callout = await this.entityManager.findOne(Callout, {
      where: { framing: { form: { id: formID } } },
      relations,
    });
    if (!callout) {
      throw new EntityNotFoundException(
        'Callout of the Form not found',
        LogContext.COLLABORATION,
        { formID }
      );
    }
    return callout;
  }

  public async getFormForFraming(
    framingID: string
  ): Promise<ICalloutForm | null> {
    const where: FindOptionsWhere<CalloutForm> = {
      framing: { id: framingID },
    };
    return this.calloutFormRepository.findOne({ where });
  }

  private reject(
    message: string,
    code: string,
    questionIDs?: string[]
  ): ValidationException {
    return new ValidationException(
      message,
      LogContext.COLLABORATION,
      questionIDs ? { code, questionIDs } : { code }
    );
  }
}
