import { AiPersonaEngine } from '@common/enums/ai.persona.engine';
import { Field, InputType } from '@nestjs/graphql';
import { LONG_TEXT_LENGTH } from '@src/common/constants';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
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
  @IsOptional()
  @ValidateNested()
  @Type(() => IExternalConfig)
  externalConfig?: IExternalConfig;
}
