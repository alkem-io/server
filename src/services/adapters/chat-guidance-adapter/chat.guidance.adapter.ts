import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ChatGuidanceQuestionResponse } from './dto/chat.guidance.adapter.dto.question.response';
import { LogContext } from '@common/enums/logging.context';
import { stringifyWithoutAuthorization } from '@common/utils/stringify.util';
import { ChatGuidanceInputBase } from './dto/chat.guidance.dto.input.base';
import { ChatGuidanceEventType } from './chat.guidance.event.type';
import { ChatGuidanceInputQuery } from './dto/chat.guidance.dto.input.query';

@Injectable()
export class ChatGuidanceAdapter {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async askQuestion(
    eventData: ChatGuidanceInputQuery
  ): Promise<ChatGuidanceQuestionResponse> {
    const event = ChatGuidanceEventType.QUERY;
    this.logEventTriggered(eventData, event);

    const response = `${eventData.question}`;
    return {
      result: response,
    };
  }

  private logEventTriggered(
    eventData: ChatGuidanceInputBase,
    eventType: ChatGuidanceEventType
  ) {
    // Stringify without authorization information
    const loggedData = stringifyWithoutAuthorization(eventData);
    this.logger.verbose?.(
      `[${eventType}] - received: ${loggedData}`,
      LogContext.NOTIFICATIONS
    );
  }
}
