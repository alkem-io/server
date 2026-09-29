import {
  FORM_RESPONSES_PAGE_MAX,
  LONG_TEXT_LENGTH,
  MID_TEXT_LENGTH,
} from '@common/constants';
import { ActorType } from '@common/enums/actor.type';
import { CalloutFormQuestionType } from '@common/enums/callout.form.question.type';
import { CalloutFormResponseMode } from '@common/enums/callout.form.response.mode';
import { CalloutFormState } from '@common/enums/callout.form.state';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { LogContext } from '@common/enums/logging.context';
import {
  EntityNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { getPaginationResults } from '@core/pagination/pagination.fn';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOneOptions, Repository } from 'typeorm';
import { CalloutForm } from '../callout-form/callout.form.entity';
import { CalloutFormErrorCode } from '../callout-form/callout.form.error.codes';
import { ICalloutFormQuestion } from '../callout-form/callout.form.question.interface';
import { widthOf } from '../callout-form/callout.form.width';
import { CalloutFormAnswerInput } from '../callout-form/dto/callout.form.dto.answer.input';
import { ICalloutFormAnswer } from './callout.form.response.answer.interface';
import { CalloutFormResponse } from './callout.form.response.entity';
import { ICalloutFormResponse } from './callout.form.response.interface';
import { SubmitCalloutFormResponseInput } from './dto/callout.form.response.dto.submit';
import { CalloutFormResponsesScope } from './dto/callout.form.responses.view';

const DEFAULT_PAGE_SIZE = 25;

export type CalloutFormResponsePage = IPaginatedType<ICalloutFormResponse>;

export type SubmittedCalloutFormResponse = {
  response: ICalloutFormResponse;
  /** The visibility that was in force under the form row lock. */
  visibility: CalloutForm['visibility'];
};

@Injectable()
export class CalloutFormResponseService {
  constructor(
    private actorLookupService: ActorLookupService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @InjectRepository(CalloutFormResponse)
    private responseRepository: Repository<CalloutFormResponse>
  ) {}

  /**
   * Validates the answers against the definition (invariants I6/I7) and builds
   * the immutable snapshots that are stored. Prompts and option labels are
   * taken from the definition — client-supplied labels are never trusted, and
   * never accepted. Errors carry a reason code and question ids only, never
   * the answer text.
   */
  public validateAndSnapshotAnswers(
    questions: ICalloutFormQuestion[],
    answers: CalloutFormAnswerInput[]
  ): ICalloutFormAnswer[] {
    const questionByID = new Map(
      questions.map(question => [question.id, question])
    );
    const snapshotByQuestion = new Map<string, ICalloutFormAnswer>();
    const answeredQuestionIDs = new Set<string>();

    for (const answer of answers) {
      const question = questionByID.get(answer.questionID);
      if (!question) {
        throw this.reject(
          'An answer refers to a question that is not part of this Form',
          CalloutFormErrorCode.FORM_ANSWER_UNKNOWN_QUESTION,
          [answer.questionID]
        );
      }
      if (answeredQuestionIDs.has(question.id)) {
        throw this.reject(
          'A question was answered more than once',
          CalloutFormErrorCode.FORM_ANSWER_DUPLICATE_QUESTION,
          [question.id]
        );
      }
      answeredQuestionIDs.add(question.id);

      const snapshot = this.snapshotAnswer(question, answer);
      if (snapshot) {
        snapshotByQuestion.set(question.id, snapshot);
      }
    }

    const missingRequired = questions
      .filter(
        question => question.required && !snapshotByQuestion.has(question.id)
      )
      .map(question => question.id);
    if (missingRequired.length > 0) {
      throw this.reject(
        'Required questions were not answered',
        CalloutFormErrorCode.FORM_ANSWER_REQUIRED,
        missingRequired
      );
    }

    // Definition order; unanswered optional questions have no entry.
    return questions
      .map(question => snapshotByQuestion.get(question.id))
      .filter((snapshot): snapshot is ICalloutFormAnswer => !!snapshot);
  }

  private snapshotAnswer(
    question: ICalloutFormQuestion,
    answer: CalloutFormAnswerInput
  ): ICalloutFormAnswer | undefined {
    const hasText = typeof answer.text === 'string' && answer.text.length > 0;
    const selectedIDs = answer.selectedOptionIDs ?? [];

    const isTextQuestion =
      question.type === CalloutFormQuestionType.SHORT_TEXT ||
      question.type === CalloutFormQuestionType.LONG_TEXT;

    if (isTextQuestion) {
      if (selectedIDs.length > 0) {
        throw this.reject(
          'Options were given for a text question',
          CalloutFormErrorCode.FORM_ANSWER_TYPE_MISMATCH,
          [question.id]
        );
      }
      const maxLength =
        question.type === CalloutFormQuestionType.SHORT_TEXT
          ? MID_TEXT_LENGTH
          : LONG_TEXT_LENGTH;
      // UTF-16 length, exactly like @MaxLength.
      if (hasText && answer.text!.length > maxLength) {
        throw this.reject(
          'An answer is too long',
          CalloutFormErrorCode.FORM_ANSWER_TOO_LONG,
          [question.id]
        );
      }
      if (!hasText || answer.text!.trim().length === 0) {
        return undefined; // empty: caught by the required check when needed
      }
      return {
        questionID: question.id,
        prompt: question.prompt,
        type: question.type,
        text: answer.text,
      };
    }

    // choice questions
    if (hasText) {
      throw this.reject(
        'Text was given for a choice question',
        CalloutFormErrorCode.FORM_ANSWER_TYPE_MISMATCH,
        [question.id]
      );
    }
    if (selectedIDs.length === 0) {
      return undefined;
    }
    if (
      new Set(selectedIDs).size !== selectedIDs.length ||
      (question.type === CalloutFormQuestionType.SINGLE_CHOICE &&
        selectedIDs.length !== 1)
    ) {
      throw this.reject(
        'The number of selected options is not valid for this question',
        CalloutFormErrorCode.FORM_ANSWER_SELECTION_COUNT,
        [question.id]
      );
    }
    const options = question.options ?? [];
    const optionIDs = new Set(options.map(option => option.id));
    if (selectedIDs.some(id => !optionIDs.has(id))) {
      throw this.reject(
        'A selected option is not an option of this question',
        CalloutFormErrorCode.FORM_ANSWER_INVALID_OPTION,
        [question.id]
      );
    }
    const selected = new Set(selectedIDs);
    return {
      questionID: question.id,
      prompt: question.prompt,
      type: question.type,
      selectedOptions: options
        .filter(option => selected.has(option.id))
        .map(option => ({ id: option.id, label: option.label })),
    };
  }

  /**
   * Stores a response. Serialized against definition edits and other
   * submissions by the form row lock; the checks run in this fixed order:
   * published, open, acknowledged visibility, single-response, answers.
   */
  public async submitResponse(
    actorID: string,
    calloutVisibility: CalloutVisibility,
    input: SubmitCalloutFormResponseInput
  ): Promise<SubmittedCalloutFormResponse> {
    if (!actorID) {
      throw new ValidationException(
        'Authentication is required to respond to a Form',
        LogContext.COLLABORATION
      );
    }
    // createdBy is an FK to user(id): human users only.
    const actorType =
      await this.actorLookupService.getActorTypeByIdOrFail(actorID);
    if (actorType !== ActorType.USER) {
      throw new ValidationException(
        'Only human users can respond to a Form',
        LogContext.COLLABORATION,
        { actorType }
      );
    }

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

      if (calloutVisibility !== CalloutVisibility.PUBLISHED) {
        throw this.reject(
          'The Form can only be answered once its Post is published',
          CalloutFormErrorCode.CALLOUT_NOT_PUBLISHED
        );
      }
      if (locked.state !== CalloutFormState.OPEN) {
        throw this.reject(
          'The Form is closed',
          CalloutFormErrorCode.FORM_CLOSED
        );
      }
      if (widthOf(locked.visibility) > widthOf(input.acknowledgedVisibility)) {
        throw this.reject(
          'The response visibility changed after the notice was shown',
          CalloutFormErrorCode.FORM_VISIBILITY_CHANGED
        );
      }
      if (
        locked.responseMode === CalloutFormResponseMode.SINGLE &&
        (await manager.count(CalloutFormResponse, {
          where: { formId: locked.id, createdBy: actorID },
        })) > 0
      ) {
        throw this.reject(
          'This Form accepts a single response per member',
          CalloutFormErrorCode.FORM_RESPONSE_ALREADY_EXISTS
        );
      }

      const answers = this.validateAndSnapshotAnswers(
        locked.questions,
        input.answers
      );

      const response = manager.create(CalloutFormResponse, {
        formId: locked.id,
        createdBy: actorID,
        answers,
      });
      const saved = await manager.save(response);
      return { response: saved, visibility: locked.visibility };
    });
  }

  public async getResponseOrFail(
    responseID: string,
    options?: FindOneOptions<CalloutFormResponse>
  ): Promise<ICalloutFormResponse> {
    const response = await this.responseRepository.findOne({
      where: { id: responseID },
      ...options,
    });
    if (!response) {
      throw new EntityNotFoundException(
        'Form response not found',
        LogContext.COLLABORATION,
        { responseID }
      );
    }
    return response;
  }

  public async deleteResponse(
    responseID: string
  ): Promise<ICalloutFormResponse> {
    const response = await this.getResponseOrFail(responseID);
    const removed = await this.responseRepository.remove(
      response as CalloutFormResponse
    );
    removed.id = responseID;
    return removed;
  }

  public countForForm(formID: string): Promise<number> {
    return this.responseRepository.count({ where: { formId: formID } });
  }

  public findMine(
    formID: string,
    actorID: string
  ): Promise<ICalloutFormResponse[]> {
    if (!actorID) {
      return Promise.resolve([]);
    }
    return this.responseRepository.find({
      where: { formId: formID, createdBy: actorID },
      order: { rowId: 'ASC' },
    });
  }

  /** first defaults to the relay default page and is clamped to the page cap. */
  public clampPageSize(first?: number | null): number {
    return Math.min(
      Math.max(first ?? DEFAULT_PAGE_SIZE, 1),
      FORM_RESPONSES_PAGE_MAX
    );
  }

  /**
   * One page of the responses the viewer may read: every response for ALL,
   * only their own for OWN, nothing for NONE. `total` comes from the same
   * scoped query.
   */
  public async paginate(
    formID: string,
    scope: CalloutFormResponsesScope,
    actorID: string,
    first: number,
    after?: string
  ): Promise<CalloutFormResponsePage> {
    if (scope === 'NONE' || (scope === 'OWN' && !actorID)) {
      return {
        items: [],
        total: 0,
        pageInfo: { hasNextPage: false, hasPreviousPage: false },
      };
    }
    const query = this.responseRepository
      .createQueryBuilder('response')
      .where('response.formId = :formID', { formID });
    if (scope === 'OWN') {
      query.andWhere('response.createdBy = :actorID', { actorID });
    }
    const page = await getPaginationResults(query, {
      first: this.clampPageSize(first),
      after,
    });
    return page;
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
