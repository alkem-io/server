import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import JSON from 'graphql-type-json';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity';
import { VirtualContributorEngine } from '@common/enums/virtual.persona.engine';

@InputType()
export class UpdateVirtualPersonaInput extends UpdateNameableInput {
  @Field(() => JSON, { nullable: false })
  @MaxLength(LONG_TEXT_LENGTH)
  prompt!: string;

  @Field(() => VirtualContributorEngine, { nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  engine!: VirtualContributorEngine;
}
