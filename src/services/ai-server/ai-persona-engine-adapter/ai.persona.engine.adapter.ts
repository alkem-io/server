import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ClientProxy } from '@nestjs/microservices';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import {
  VIRTUAL_CONTRIBUTOR_ENGINE_EXPERT,
  VIRTUAL_CONTRIBUTOR_ENGINE_GUIDANCE,
  VIRTUAL_CONTRIBUTOR_ENGINE_COMMUNITY_MANAGER,
  VIRTUAL_CONTRIBUTOR_ENGINE_GENERIC,
  VIRTUAL_CONTRIBUTOR_ENGINE_OPENAI_ASSISTANT,
} from '@common/constants';
import { Source } from '../../adapters/chat-guidance-adapter/source.type';
import { AiPersonaEngineAdapterInvocationInput } from './dto/ai.persona.engine.adapter.dto.invocation.input';
import { AiPersonaEngineAdapterQueryResponse } from './dto/ai.persona.engine.adapter.dto.question.response';
import { LogContext } from '@common/enums/logging.context';
import { AiPersonaEngineAdapterInputBase } from './dto/ai.persona.engine.adapter.dto.base';
import { AiPersonaEngineAdapterBaseResponse } from './dto/ai.persona.engine.adapter.dto.base.response';
import { ChatGuidanceInput } from '@services/api/chat-guidance/dto/chat.guidance.dto.input';
import { ValidationException } from '@common/exceptions';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { IMessageAnswerToQuestion } from '@domain/communication/message.answer.to.question/message.answer.to.question.interface';
import { EventBus } from '@nestjs/cqrs';
import { InvokeEngine } from '@services/infrastructure/event-bus/messages/invoke.engine';

enum AiPersonaEngineEventType {
  QUERY = 'query',
  INGEST = 'ingest',
  RESET = 'reset',
}

const successfulIngestionResponse = 'Ingest successful';
const successfulResetResponse = 'Reset function executed';

@Injectable()
export class AiPersonaEngineAdapter {
  constructor(
    @Inject(VIRTUAL_CONTRIBUTOR_ENGINE_COMMUNITY_MANAGER)
    private virtualContributorEngineCommunityManager: ClientProxy,
    @Inject(VIRTUAL_CONTRIBUTOR_ENGINE_EXPERT)
    private virtualContributorEngineExpert: ClientProxy,
    @Inject(VIRTUAL_CONTRIBUTOR_ENGINE_GENERIC)
    private virtualContributorEngineGeneric: ClientProxy,
    @Inject(VIRTUAL_CONTRIBUTOR_ENGINE_OPENAI_ASSISTANT)
    private virtualContributorEngineOpenaiAssistant: ClientProxy,
    @Inject(VIRTUAL_CONTRIBUTOR_ENGINE_GUIDANCE)
    private virtualContributorEngineGuidance: ClientProxy,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private eventBus: EventBus
  ) {}

  public invoke(eventData: AiPersonaEngineAdapterInvocationInput): void {
    this.eventBus.publish(new InvokeEngine(eventData));
    // let responseData: AiPersonaEngineAdapterQueryResponse | undefined;
    // try {
    //   switch (eventData.engine) {
    //     case AiPersonaEngine.COMMUNITY_MANAGER:
    //       if (!eventData.prompt)
    //         throw new ValidationException(
    //           'Prompt property is required for community manager engine!',
    //           LogContext.AI_PERSONA_SERVICE_ENGINE
    //         );
    //       const responseCommunityManager =
    //         this.virtualContributorEngineCommunityManager.send<
    //           AiPersonaEngineAdapterQueryResponse,
    //           AiPersonaEngineAdapterQueryInput
    //         >({ cmd: AiPersonaEngineEventType.QUERY }, eventData);
    //       responseData = await firstValueFrom(responseCommunityManager);
    //       break;
    //     case AiPersonaEngine.GENERIC_OPENAI:
    //       const responseGeneric = this.virtualContributorEngineGeneric.send<
    //         AiPersonaEngineAdapterQueryResponse,
    //         AiPersonaEngineAdapterQueryInput
    //       >({ cmd: AiPersonaEngineEventType.QUERY }, eventData);
    //       responseData = await firstValueFrom(responseGeneric);
    //       break;
    //     case AiPersonaEngine.OPENAI_ASSISTANT:
    //       const responseOpenaiAssistant =
    //         this.virtualContributorEngineOpenaiAssistant.send<
    //           AiPersonaEngineAdapterQueryResponse,
    //           AiPersonaEngineAdapterQueryInput
    //         >({ cmd: AiPersonaEngineEventType.QUERY }, eventData);
    //       responseData = await firstValueFrom(responseOpenaiAssistant);
    //       break;
    //     case AiPersonaEngine.EXPERT:
    //       console.log(eventData);
    //       if (!eventData.contextID || !eventData.bodyOfKnowledgeID)
    //         throw new ValidationException(
    //           'ContextSpaceNameID and knowledgeSpaceNameID properties are required for expert engine!',
    //           LogContext.AI_PERSONA_SERVICE_ENGINE
    //         );
    //       const responseExpert = this.virtualContributorEngineExpert.send<
    //         AiPersonaEngineAdapterQueryResponse,
    //         AiPersonaEngineAdapterQueryInput
    //       >({ cmd: AiPersonaEngineEventType.QUERY }, eventData);
    //       responseData = await firstValueFrom(responseExpert);
    //       break;
    //     case AiPersonaEngine.GUIDANCE:
    //       const responseGuidance = this.virtualContributorEngineGuidance.send<
    //         AiPersonaEngineAdapterQueryResponse,
    //         ChatGuidanceInput
    //       >({ cmd: AiPersonaEngineEventType.QUERY }, {
    //         ...eventData,
    //         language: 'EN',
    //       } as ChatGuidanceInput);
    //       responseData = await firstValueFrom(responseGuidance);
    //       break;
    //   }
    // } catch (e) {
    //   console.log(e);
    //   const errorMessage = `Error received from guidance chat server! ${e}`;
    //   this.logger.error(e);
    //   this.logger.error(
    //     errorMessage,
    //     undefined,
    //     LogContext.AI_PERSONA_SERVICE_ENGINE
    //   );
    //   // not a real answer; just return an error
    //   return {
    //     answer: errorMessage,
    //     question: eventData.question,
    //   };
    // }

    // if (!responseData) {
    //   const errorMessage = `Unable to get a response from virtual persona engine ('${eventData.engine}') server!`;
    //   this.logger.error(
    //     errorMessage,
    //     undefined,
    //     LogContext.AI_PERSONA_SERVICE_ENGINE
    //   );
    //   // not a real answer; just return an error
    //   return {
    //     answer: errorMessage,
    //     question: eventData.question,
    //   };
    // }

    // const message = responseData.result;
    // let formattedString = message;
    // // Check if response is a string containing stringified JSON
    // if (typeof message === 'string' && message.startsWith('{')) {
    //   formattedString = message
    //     .replace(/\\\\n/g, ' ')
    //     .replace(/\\\\"/g, '')
    //     .replace(/<\|im_end\|>/g, '');
    // }

    // try {
    //   const jsonObject = JSON.parse(formattedString);

    //   return {
    //     ...jsonObject,
    //     sources: jsonObject.sources,
    //   };
    // } catch (err: any) {
    //   const errorMessage = `Could not send query to chat guidance adapter! ${err}`;
    //   this.logger.error(
    //     errorMessage,
    //     err?.stack,
    //     LogContext.AI_PERSONA_SERVICE_ENGINE
    //   );
    //   // not a real answer; just return an error
    //   return {
    //     answer: errorMessage,
    //     question: eventData.question,
    //   };
    // }
  }

  public async sendReset(
    eventData: AiPersonaEngineAdapterInputBase
  ): Promise<boolean> {
    const response = this.virtualContributorEngineCommunityManager.send(
      { cmd: AiPersonaEngineEventType.RESET },
      eventData
    );

    try {
      const responseData =
        await firstValueFrom<AiPersonaEngineAdapterBaseResponse>(response);

      return responseData.result === successfulResetResponse;
    } catch (err: any) {
      this.logger.error(
        `Could not send reset to chat guidance adapter! ${err}`,
        err?.stack,
        LogContext.AI_PERSONA_SERVICE_ENGINE
      );
      return false;
    }
  }

  public async sendIngest(
    eventData: AiPersonaEngineAdapterInputBase
  ): Promise<boolean> {
    const response = this.virtualContributorEngineCommunityManager.send(
      { cmd: AiPersonaEngineEventType.INGEST },
      eventData
    );

    try {
      const responseData =
        await firstValueFrom<AiPersonaEngineAdapterBaseResponse>(response);
      return responseData.result === successfulIngestionResponse;
    } catch (err: any) {
      this.logger.error(
        `Could not send ingest to chat guidance adapter! ${err}`,
        err?.stack,
        LogContext.AI_PERSONA_SERVICE_ENGINE
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
