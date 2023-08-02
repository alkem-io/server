import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ChatGuidanceQueryResponse } from './dto/chat.guidance.adapter.dto.question.response';
import { ChatGuidanceInputQuery } from './dto/chat.guidance.dto.input.query';
import { CHAT_GUIDANCE_SERVICE } from '@common/constants';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { LogContext } from '@common/enums';
import { ChatGuidanceInputBase } from './dto/chat.guidance.dto.input.base';
import { ChatGuidanceBaseResponse } from './dto/chat.guidance.adapter.dto.base.response';
import { IChatGuidanceQueryResult } from '@services/api/chat-guidance/dto/chat.guidance.query.result.dto';

enum ChatGuidanceEventType {
  QUERY = 'query',
  INGEST = 'ingest',
  RESET = 'reset',
}

const successfulIngestionResponse = 'Ingest function executed';
const successfulResetResponse = 'Reset function executed';

@Injectable()
export class ChatGuidanceAdapter {
  constructor(
    @Inject(CHAT_GUIDANCE_SERVICE) private chatGuidanceClient: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async sendQuery(
    eventData: ChatGuidanceInputQuery
  ): Promise<IChatGuidanceQueryResult> {
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
        cleanedString = message
          .replace(/\\\\n/g, ' ')
          .replace(/\\\\/g, '\\')
          .replace(/<\|im_end\|>/g, '');
      }

      const jsonObject = JSON.parse(cleanedString);
      const result: IChatGuidanceQueryResult = {
        ...jsonObject,
      };
      return result;
    } catch (err: any) {
      const errorMessage = `Could not send query to chat guidance adapter! ${err}`;
      this.logger.error(errorMessage, LogContext.CHAT_GUIDANCE);
      return {
        answer: errorMessage,
        question: eventData.question,
        sources: '',
      };
    }
  }

  async sendReset(eventData: ChatGuidanceInputBase): Promise<boolean> {
    const response = this.chatGuidanceClient.send(
      { cmd: ChatGuidanceEventType.RESET },
      eventData
    );

    try {
      const responseData = await firstValueFrom<ChatGuidanceBaseResponse>(
        response
      );

      return responseData.result === successfulResetResponse;
    } catch (err: any) {
      this.logger.error(
        `Could not send reset to chat guidance adapter! ${err}`,
        LogContext.CHAT_GUIDANCE
      );
      return false;
    }
  }

  async sendIngest(): Promise<boolean> {
    const response = this.chatGuidanceClient.send(
      { cmd: ChatGuidanceEventType.INGEST },
      {}
    );

    try {
      const responseData = await firstValueFrom<ChatGuidanceBaseResponse>(
        response
      );
      return responseData.result === successfulIngestionResponse;
    } catch (err: any) {
      this.logger.error(
        `Could not send ingest to chat guidance adapter! ${err}`,
        LogContext.CHAT_GUIDANCE
      );
      return false;
    }
  }
}
