import { LogContext } from '@common/enums/logging.context';
import { IMessageAnswerToQuestion } from '../message.answer.to.question/message.answer.to.question.interface';
import { LoggerService } from '@nestjs/common/services/logger.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class MessageService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}
  // TODO: REMOVE??
  public convertAnswerToSimpleMessage(
    answerToQuestion: IMessageAnswerToQuestion
  ): string {
    this.logger.verbose?.(
      `Converting answer to simple message: ${JSON.stringify(
        answerToQuestion
      )}`,
      LogContext.COMMUNICATION
    );
    let answer = answerToQuestion.answer;

    if (answerToQuestion.sources) {
      answer = `${answer}\n${answerToQuestion.sources
        .map(({ title, uri }) => `- [${title}](${uri})`)
        .join('\n')}`;
    }
    return answer;
  }
}
