import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ChatGuidanceQuestionResponse as ChatGuidanceQueryResponse } from './dto/chat.guidance.adapter.dto.question.response';
import { ChatGuidanceEventType } from './chat.guidance.event.type';
import { ChatGuidanceInputQuery } from './dto/chat.guidance.dto.input.query';
import { CHAT_GUIDANCE_SERVICE } from '@common/constants';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { IChatGuidanceResult } from '@services/api/chat-guidance/dto/chat.guidance.result.dto';
import { LogContext } from '@common/enums';
import { ChatGuidanceInputBase } from './dto/chat.guidance.dto.input.base';
import { ChatGuidanceBaseResponse } from './dto/chat.guidance.adapter.dto.base.response';
import { IChatGuidanceQueryResult } from '@services/api/chat-guidance/dto/chat.guidance.query.result.dto';

@Injectable()
export class ChatGuidanceAdapter {
  constructor(
    @Inject(CHAT_GUIDANCE_SERVICE) private chatGuidanceClient: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async sendQuery(
    eventData: ChatGuidanceInputQuery
  ): Promise<IChatGuidanceQueryResult | undefined> {
    const response = this.chatGuidanceClient.send(
      { cmd: ChatGuidanceEventType.QUERY },
      eventData
    );

    try {
      const responseData = await firstValueFrom<ChatGuidanceQueryResponse>(
        response
      );
      const message = responseData.result;
      let cleanedString = message;
      // Check if response is a string containing stringified JSON
      if (typeof message === 'string' && message.startsWith('{')) {
        cleanedString = message.replace(/\\\\n/g, ' ').replace(/\\\\/g, '\\');
      }

      const jsonObject = JSON.parse(cleanedString);
      const result: IChatGuidanceQueryResult = {
        ...jsonObject,
      };
      return result;
    } catch (err: any) {
      this.logger.error(
        `Could not send query to chat guidance adapter! ${err}`,
        LogContext.CHAT_GUIDANCE
      );
    }
  }

  async sendReset(
    eventData: ChatGuidanceInputBase
  ): Promise<IChatGuidanceResult | undefined> {
    const response = this.chatGuidanceClient.send(
      { cmd: ChatGuidanceEventType.RESET },
      eventData
    );

    try {
      const responseData = await firstValueFrom<ChatGuidanceBaseResponse>(
        response
      );

      const result: IChatGuidanceResult = {
        answer: responseData.result,
      };

      return result;
    } catch (err: any) {
      this.logger.error(
        `Could not send reset to chat guidance adapter! ${err}`,
        LogContext.CHAT_GUIDANCE
      );
      return undefined;
    }
  }

  async sendIngest(): Promise<any> {
    const response = this.chatGuidanceClient.send(
      { cmd: ChatGuidanceEventType.INGEST },
      {}
    );

    try {
      const responseData = await firstValueFrom<ChatGuidanceBaseResponse>(
        response
      );

      const result: IChatGuidanceResult = {
        answer: responseData.result,
      };

      return result;
    } catch (err: any) {
      this.logger.error(
        `Could not send ingest to chat guidance adapter! ${err}`,
        LogContext.CHAT_GUIDANCE
      );
      return undefined;
    }
  }
}
