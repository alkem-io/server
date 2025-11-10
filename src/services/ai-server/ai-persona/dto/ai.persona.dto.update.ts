import { Field, InputType } from '@nestjs/graphql';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { IExternalConfig } from './external.config';
import { PromptGraph } from '@services/ai-server/prompt-graph/dto/prompt.graph.dto';

@InputType()
export class UpdateAiPersonaInput extends UpdateBaseAlkemioInput {
  @Field(() => AiPersonaEngine, { nullable: true })
  engine?: AiPersonaEngine;

  @Field(() => [String], { nullable: true })
  prompt?: string[];

  @Field(() => IExternalConfig, { nullable: true })
  externalConfig?: IExternalConfig;

  @Field(() => PromptGraph, { nullable: true })
  promptGraph?: PromptGraph;
}
