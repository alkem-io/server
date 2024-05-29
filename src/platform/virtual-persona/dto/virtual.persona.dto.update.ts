import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity';
import { VirtualContributorEngine } from '@common/enums/virtual.persona.engine';

@InputType()
export class UpdateVirtualPersonaInput extends UpdateNameableInput {
  @Field(() => VirtualContributorEngine, { nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  engine!: VirtualContributorEngine;
}
