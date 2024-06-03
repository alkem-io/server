import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity';
import { VirtualContributorEngine } from '@common/enums/virtual.contributor.engine';
import JSON from 'graphql-type-json';

@InputType()
export class CreateVirtualPersonaInput extends CreateNameableInput {
  @Field(() => VirtualContributorEngine, { nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  engine!: VirtualContributorEngine;

  @Field(() => JSON, { nullable: true })
  @MaxLength(LONG_TEXT_LENGTH)
  prompt!: string;
}
