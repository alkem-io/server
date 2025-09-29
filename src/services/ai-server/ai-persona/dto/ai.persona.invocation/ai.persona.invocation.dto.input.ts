import { UUID } from '@domain/common/scalars';
import { ExternalMetadata } from '@domain/communication/vc-interaction/vc.interaction.entity';
import { Field, InputType } from '@nestjs/graphql';
import { PromptGraph } from '../../../prompt-graph/dto/prompt.graph.dto';
import { ResultHandler } from './result.handler.dto';
import { InvocationOperation } from './invocation.operation.dto';

@InputType()
export class AiPersonaInvocationInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'AI Persona ID.',
    deprecationReason: 'Use aiPersonaID instead',
  })
  aiPersonaServiceID?: string;

  @Field(() => UUID, {
    nullable: false,
    description: 'AI Persona ID.',
  })
  aiPersonaID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The message being sent to the engine.',
  })
  message!: string;

  @Field(() => String, {
    nullable: true,
    description: 'The ID of the body of knowledge to use.',
  })
  bodyOfKnowledgeID?: string;

  @Field(() => String, {
    nullable: true,
    description: 'The ID of the context, the AI Persona is asked a question.',
  })
  contextID?: string = undefined;

  @Field(() => String, {
    nullable: true,
    description: 'User identifier used internaly by the engine.',
  })
  userID?: string = undefined;

  @Field(() => String, {
    nullable: true,
    description:
      'The ID of the message thread where the Virtual Contributor is asked a question if applicable.',
  })
  threadID?: string = undefined;

  @Field(() => String, {
    nullable: true,
    description:
      'The Virtual Contributor interaciton part of which is this question.',
  })
  interactionID?: string = undefined;

  @Field(() => String, {
    nullable: true,
    description: 'The Virtual Contributor description.',
  })
  description?: string = undefined;

  @Field(() => String, {
    nullable: false,
    description: 'The Virtual Contributor displayName.',
  })
  displayName!: string;

  // intentially skippuing the Field decorator as we are not sure we want to expose this data
  // through the API
  externalMetadata: ExternalMetadata = {};
  @Field(() => ResultHandler, {
    nullable: false,
    description: 'What should happen with the result of the VC invocation',
  })
  resultHandler!: ResultHandler;

  @Field(() => InvocationOperation, {
    nullable: true,
    description: 'Operation we want the engine to execute - defaults to Query',
  })
  operation?: InvocationOperation = InvocationOperation.QUERY;
  language?: string;

  @Field(() => PromptGraph, {
    nullable: true,
    description: 'Optional prompt graph to use for this invocation',
  })
  promptGraph?: PromptGraph;
}
