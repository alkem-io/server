import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ClientProxy } from '@nestjs/microservices';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { IChatGuidanceQueryResult } from '@services/api/chat-guidance/dto/chat.guidance.query.result.dto';
import { ChatGuidanceLogService } from '@services/api/chat-guidance/chat.guidance.log.service';
import { LogContext } from '@common/enums';
import { CHAT_GUIDANCE_SERVICE } from '@common/constants';
import { GuidanceEngineInputBase } from './dto/guidance.engine.dto.base';
import { GuidanceEngineBaseResponse } from './dto/guidance.engine.dto.base.response';
import { GuidanceEngineQueryInput } from './dto/guidance.engine.dto.query';
import { GuidanceEngineQueryResponse } from './dto/guidance.engine.dto.question.response';
import { Source } from './source.type';

enum GuidanceEngineEventType {
  QUERY = 'query',
  INGEST = 'ingest',
  RESET = 'reset',
}

const successfulIngestionResponse = 'Ingest function executed';
const successfulResetResponse = 'Reset function executed';

@Injectable()
export class GuidanceEngineAdapter {
  constructor(
    @Inject(CHAT_GUIDANCE_SERVICE) private GuidanceEngineClient: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private chatGuidanceLogService: ChatGuidanceLogService
  ) {}

  public async sendQuery(
    eventData: GuidanceEngineQueryInput
  ): Promise<IChatGuidanceQueryResult> {
    let responseData: GuidanceEngineQueryResponse | undefined;

    try {
      const response = this.GuidanceEngineClient.send<
        GuidanceEngineQueryResponse,
        GuidanceEngineQueryInput
      >({ cmd: GuidanceEngineEventType.QUERY }, eventData);
      responseData = await firstValueFrom(response);
    } catch (e) {
      const errorMessage = `Error received from guidance chat server! ${e}`;
      this.logger.error(errorMessage, undefined, LogContext.CHAT_GUIDANCE);
      // not a real answer; just return an error
      return {
        answer: errorMessage,
        question: eventData.question,
      };
    }

    const message = responseData.result;
    let formattedString = message;
    // Check if response is a string containing stringified JSON
    if (typeof message === 'string' && message.startsWith('{')) {
      formattedString = message
        .replace(/\\\\n/g, ' ')
        .replace(/\\\\"/g, '')
        .replace(/<\|im_end\|>/g, '');
    }

    try {
      const jsonObject = JSON.parse(formattedString);
      const answerId = await this.chatGuidanceLogService.logAnswer(
        eventData.question,
        jsonObject as GuidanceEngineQueryResponse,
        eventData.userId
      );
      return {
        ...jsonObject,
        id: answerId,
        sources: this.extractMetadata(jsonObject.sources),
      };
    } catch (err: any) {
      const errorMessage = `Could not send query to chat guidance adapter! ${err}`;
      this.logger.error(errorMessage, err?.stack, LogContext.CHAT_GUIDANCE);
      // not a real answer; just return an error
      return {
        answer: errorMessage,
        question: eventData.question,
      };
    }
  }

  public async sendReset(eventData: GuidanceEngineInputBase): Promise<boolean> {
    const response = this.GuidanceEngineClient.send(
      { cmd: GuidanceEngineEventType.RESET },
      eventData
    );

    try {
      const responseData = await firstValueFrom<GuidanceEngineBaseResponse>(
        response
      );

      return responseData.result === successfulResetResponse;
    } catch (err: any) {
      this.logger.error(
        `Could not send reset to chat guidance adapter! ${err}`,
        err?.stack,
        LogContext.CHAT_GUIDANCE
      );
      return false;
    }
  }

  public async sendIngest(): Promise<boolean> {
    const response = this.GuidanceEngineClient.send(
      { cmd: GuidanceEngineEventType.INGEST },
      {}
    );

    try {
      const responseData = await firstValueFrom<GuidanceEngineBaseResponse>(
        response
      );
      return responseData.result === successfulIngestionResponse;
    } catch (err: any) {
      this.logger.error(
        `Could not send ingest to chat guidance adapter! ${err}`,
        err?.stack,
        LogContext.CHAT_GUIDANCE
      );
      return false;
    }
  }

  private extractMetadata(metadata: string): Source[] {
    // Use regular expressions to extract metadata sections
    const metadataMatches = metadata.match(/metadata=\{.*?\}/g);

    if (!metadataMatches) {
      this.logger.warn?.(
        `Metadata match not found in: ${metadata}`,
        LogContext.CHAT_GUIDANCE
      );
      return [];
    }
    // deduplicate sources
    const sourceSet = new Set<string>();
    const metadataObjects: Source[] = [];

    // Loop through metadata matches and extract source and title
    for (const metadataMatch of metadataMatches) {
      const [, uri] = metadataMatch.match(/'source': '([^']*)'/) ?? [];
      const [, title] = metadataMatch.match(/'title': '([^']*)'/) ?? [];
      // if no matches are found log and skip
      if (!uri && !title) {
        this.logger.warn?.(
          `No title or URI found for metadata match in: ${metadataMatch}`,
          LogContext.CHAT_GUIDANCE
        );
        continue;
      }
      // log whatever was not found
      if (!uri) {
        this.logger.warn?.(
          `URI match not found in: ${metadataMatch}`,
          LogContext.CHAT_GUIDANCE
        );
      } else if (!title) {
        this.logger.warn?.(
          `Title match not found in: ${metadataMatch}`,
          LogContext.CHAT_GUIDANCE
        );
      }

      const sourceKey = uri ?? title;

      if (sourceSet.has(sourceKey)) {
        continue;
      }

      sourceSet.add(sourceKey);
      metadataObjects.push({ uri, title });
    }

    return metadataObjects;
  }
}
