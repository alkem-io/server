import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import JSON from 'graphql-type-json';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity';
import { VirtualPersonaEngine } from '@common/enums/virtual.persona.engine';

@InputType()
export class CreateVirtualPersonaInput extends CreateNameableInput {
  @Field(() => JSON, { nullable: false })
  @MaxLength(LONG_TEXT_LENGTH)
  prompt!: string;

  @Field(() => VirtualPersonaEngine, { nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  engine!: VirtualPersonaEngine;
}
