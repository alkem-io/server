import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ChatGuidanceQuestionResponse } from './dto/chat.guidance.adapter.dto.question.response';
import { ChatGuidanceEventType } from './chat.guidance.event.type';
import { ChatGuidanceInputQuery } from './dto/chat.guidance.dto.input.query';
import { CHAT_GUIDANCE_SERVICE } from '@common/constants';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChatGuidanceAdapter {
  constructor(
    @Inject(CHAT_GUIDANCE_SERVICE) private chatGuidanceClient: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async sendQuery(eventData: ChatGuidanceInputQuery): Promise<any> {
    const message = {
      operation: 'query',
      param: eventData,
    };
    const response = this.chatGuidanceClient.send(
      { cmd: ChatGuidanceEventType.QUERY },
      message
    );

    try {
      const responseData = await firstValueFrom<ChatGuidanceQuestionResponse>(
        response
      );
      const message = responseData.result;

      return message;
    } catch (err: any) {}
  }

  async sendReset(user_id: string): Promise<any> {
    const message = {
      operation: 'reset',
    };
    return this.chatGuidanceClient.send({ cmd: user_id }, message).toPromise();
  }

  async sendIngest(): Promise<any> {
    const message = {
      operation: 'ingest',
    };
    return this.chatGuidanceClient
      .send({ cmd: 'any_user_id' }, message)
      .toPromise();
  }

  // async askQuestion(
  //   eventData: ChatGuidanceInputQuery
  // ): Promise<ChatGuidanceQuestionResponse> {
  //   const event = ChatGuidanceEventType.QUERY;
  //   this.logEventTriggered(eventData, event);

  //   const response = `${eventData.question}`;
  //   return {
  //     result: response,
  //   };
  // }

  // private logEventTriggered(
  //   eventData: ChatGuidanceInputBase,
  //   eventType: ChatGuidanceEventType
  // ) {
  //   // Stringify without authorization information
  //   const loggedData = stringifyWithoutAuthorization(eventData);
  //   this.logger.verbose?.(
  //     `[${eventType}] - received: ${loggedData}`,
  //     LogContext.NOTIFICATIONS
  //   );
  // }
}
