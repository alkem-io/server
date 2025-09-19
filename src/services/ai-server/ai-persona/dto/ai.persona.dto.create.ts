import { Field, InputType } from '@nestjs/graphql';
import { ArrayMaxSize, IsEnum, IsString, MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH } from '@src/common/constants';
import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { IExternalConfig } from './external.config';

@InputType()
export class CreateAiPersonaInput {
  @Field(() => AiPersonaEngine, {
    nullable: true,
    defaultValue: AiPersonaEngine.EXPERT,
  })
  @IsEnum(AiPersonaEngine)
  engine!: AiPersonaEngine;

  @Field(() => [String], { nullable: true, defaultValue: [] })
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(LONG_TEXT_LENGTH, { each: true })
  prompt!: string[];

  @Field(() => IExternalConfig, { nullable: true })
  externalConfig?: IExternalConfig;
}
