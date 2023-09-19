import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GuidanceEngineQueryResponse } from './dto/guidance.engine.dto.question.response';
import { CHAT_GUIDANCE_SERVICE } from '@common/constants';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { LogContext } from '@common/enums';
import { GuidanceEngineInputBase } from './dto/guidance.engine.dto.base';
import { GuidanceEngineBaseResponse } from './dto/guidance.engine.dto.base.response';
import { IChatGuidanceQueryResult } from '@services/api/chat-guidance/dto/chat.guidance.query.result.dto';
import { GuidanceEngineQueryInput } from './dto/guidance.engine.dto.query';
import { ChatGuidanceLogService } from '@services/api/chat-guidance/chat.guidance.log.service';

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
    const response = this.GuidanceEngineClient.send(
      { cmd: GuidanceEngineEventType.QUERY },
      eventData
    );

    try {
      const responseData = await firstValueFrom<GuidanceEngineQueryResponse>(
        response
      );
      const message = responseData.result;
      let formattedString = message;
      // Check if response is a string containing stringified JSON
      if (typeof message === 'string' && message.startsWith('{')) {
        formattedString = message
          .replace(/\\\\n/g, ' ')
          .replace(/\\\\/g, '\\')
          .replace(/<\|im_end\|>/g, '');
      }

      const jsonObject = JSON.parse(formattedString);
      const result: IChatGuidanceQueryResult = {
        ...jsonObject,
        sources: this.extractMetadata(jsonObject.sources),
      };

      await this.chatGuidanceLogService.logAnswer(
        eventData.question,
        jsonObject as GuidanceEngineQueryResponse,
        eventData.userId
      );
      return result;
    } catch (err: any) {
      const errorMessage = `Could not send query to chat guidance adapter! ${err}`;
      this.logger.error(errorMessage, LogContext.CHAT_GUIDANCE);
      return {
        answer: errorMessage,
        question: eventData.question,
        sources: [],
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
        LogContext.CHAT_GUIDANCE
      );
      return false;
    }
  }

  private extractMetadata(metadata: string): { uri: string; title: string }[] {
    // const text =
    // "[Document(page_content='What does it take to build a community? | Alkemio Foundation Search Home Manifesto Partners News About Our team Structure Contact Support Vision FAQ Visit the platform What does it take to build a community?  Mayte Ragni,   Birgit Ros 22 February 2023 3 min read   Explore Building a community and keeping it active is a challenging task. ...metadata={'source': 'https://www.alkemio.org/post/2023-02-community-workshop/index.html', 'title': 'What does it take to build a community? | Alkemio Foundation'}), Document(page_content='Also, you can add additional tags to summarize the content and make the Space easier to find. ...metadata={'source': 'https://www.alkemio.org/help/community-management/index.html', 'title': 'Alkemio Foundation'}), Document(page_content='Besides some descriptive information, it is key to engage and guide your community when they land on the platform. ...metadata={'source': 'https://www.alkemio.org/help/community-management/index.html', 'title': 'Alkemio Foundation'}), Document(page_content='workshop | Alkemio Foundation Search Home Manifesto Partners News About Our team Structure Contact Support Vision FAQ Visit the platform workshop What does it take to build a community?  Identifying drivers and blockers Mayte Ragni,   Birgit Ros 22 February 2023 3 min read Blogs  Newsletter  Releases © 2023 Stichting Alkemio  Privacy   Security   Support', metadata={'source': 'https://www.alkemio.org/tag/workshop/index.html', 'title': 'workshop | Alkemio Foundation'})]";

    // Use regular expressions to extract metadata sections
    const metadataMatches = metadata.match(/metadata=\{.*?\}/g);

    // Initialize an empty array to store extracted objects
    const metadataObjects: { uri: string; title: string }[] = [];

    // Loop through metadata matches and extract source and title
    if (metadataMatches) {
      metadataMatches.forEach(metadataMatch => {
        const sourceMatch = metadataMatch.match(/'source': '([^']*)'/);
        const titleMatch = metadataMatch.match(/'title': '([^']*)'/);

        if (sourceMatch && titleMatch) {
          const uri = sourceMatch[1];
          const title = titleMatch[1];
          metadataObjects.push({ uri, title });
        }
      });
    }

    return metadataObjects;
  }
}
