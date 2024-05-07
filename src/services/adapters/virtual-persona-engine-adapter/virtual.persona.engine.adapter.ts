import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ClientProxy } from '@nestjs/microservices';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import {
  VIRTUAL_PERSONA_ENGINE_ALKEMIO_DIGILEEFOMGEVING,
  VIRTUAL_PERSONA_ENGINE_CHAT_GUIDANCE,
  VIRTUAL_PERSONA_ENGINE_COMMUNITY_MANAGER,
} from '@common/constants';
import { Source } from '../chat-guidance-adapter/source.type';
import { VirtualPersonaEngineAdapterQueryInput } from './dto/virtual.persona.engine.adapter.dto.question.input';
import { VirtualPersonaEngineAdapterQueryResponse } from './dto/virtual.persona.engine.adapter.dto.question.response';
import { LogContext } from '@common/enums/logging.context';
import { VirtualPersonaEngineAdapterInputBase } from './dto/virtual.persona.engine.adapter.dto.base';
import { VirtualPersonaEngineAdapterBaseResponse } from './dto/virtual.persona.engine.adapter.dto.base.response';
import { IVirtualPersonaQuestionResult } from '@domain/community/virtual-persona/dto/virtual.persona.question.dto.result';
import { VirtualPersonaEngine } from '@common/enums/virtual.persona.engine';
import { ChatGuidanceInput } from '@services/api/chat-guidance/dto/chat.guidance.dto.input';

enum VirtualPersonaEventType {
  QUERY = 'query',
  INGEST = 'ingest',
  RESET = 'reset',
}

const successfulIngestionResponse = 'Ingest successful';
const successfulResetResponse = 'Reset function executed';

@Injectable()
export class VirtualPersonaEngineAdapter {
  constructor(
    @Inject(VIRTUAL_PERSONA_ENGINE_COMMUNITY_MANAGER)
    private virtualPersonaEngineCommunityManager: ClientProxy,
    @Inject(VIRTUAL_PERSONA_ENGINE_ALKEMIO_DIGILEEFOMGEVING)
    private virtualPersonaEngineAlkemioDigileefomgeving: ClientProxy,
    @Inject(VIRTUAL_PERSONA_ENGINE_CHAT_GUIDANCE)
    private virtualPersonaEngineChatGuidance: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async sendQuery(
    eventData: VirtualPersonaEngineAdapterQueryInput
  ): Promise<IVirtualPersonaQuestionResult> {
    let responseData: VirtualPersonaEngineAdapterQueryResponse | undefined;

    try {
      switch (eventData.engine) {
        case VirtualPersonaEngine.COMMUNITY_MANAGER:
          const responseCommunityManager =
            this.virtualPersonaEngineCommunityManager.send<
              VirtualPersonaEngineAdapterQueryResponse,
              VirtualPersonaEngineAdapterQueryInput
            >({ cmd: VirtualPersonaEventType.QUERY }, eventData);
          responseData = await firstValueFrom(responseCommunityManager);
          break;
        case VirtualPersonaEngine.ALKEMIO_DIGILEEFOMGEVING:
          const responseAlkemioDigileefomgeving =
            this.virtualPersonaEngineAlkemioDigileefomgeving.send<
              VirtualPersonaEngineAdapterQueryResponse,
              VirtualPersonaEngineAdapterQueryInput
            >({ cmd: VirtualPersonaEventType.QUERY }, eventData);
          responseData = await firstValueFrom(responseAlkemioDigileefomgeving);
          break;
        case VirtualPersonaEngine.GUIDANCE:
          const responseChatGuidance =
            this.virtualPersonaEngineChatGuidance.send<
              VirtualPersonaEngineAdapterQueryResponse,
              ChatGuidanceInput
            >({ cmd: VirtualPersonaEventType.QUERY }, {
              ...eventData,
              language: 'EN',
            } as ChatGuidanceInput);
          responseData = await firstValueFrom(responseChatGuidance);
          break;
      }
    } catch (e) {
      const errorMessage = `Error received from guidance chat server! ${e}`;
      this.logger.error(errorMessage, undefined, LogContext.CHAT_GUIDANCE);
      // not a real answer; just return an error
      return {
        answer: errorMessage,
        question: eventData.question,
      };
    }

    if (!responseData) {
      const errorMessage = `Unable to get a response from virtual persona engine ('${eventData.engine}') server!`;
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

      return {
        ...jsonObject,
        sources: jsonObject.sources,
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

  public async sendReset(
    eventData: VirtualPersonaEngineAdapterInputBase
  ): Promise<boolean> {
    const response = this.virtualPersonaEngineCommunityManager.send(
      { cmd: VirtualPersonaEventType.RESET },
      eventData
    );

    try {
      const responseData =
        await firstValueFrom<VirtualPersonaEngineAdapterBaseResponse>(response);

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

  public async sendIngest(
    eventData: VirtualPersonaEngineAdapterInputBase
  ): Promise<boolean> {
    const response = this.virtualPersonaEngineCommunityManager.send(
      { cmd: VirtualPersonaEventType.INGEST },
      eventData
    );

    try {
      const responseData =
        await firstValueFrom<VirtualPersonaEngineAdapterBaseResponse>(response);
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
    // deduplicate sources
    const sourceSet = new Set<string>();
    const metadataObjects: Source[] = [];

    // Loop through metadata matches and extract source and title
    for (const metadataMatch of metadata) {
      const uri = metadataMatch;
      const title = metadataMatch;

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
