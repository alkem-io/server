import { UpdateBaseCherrytwistInput } from '@domain/common/entity/base-entity';
import { InputType, Field } from '@nestjs/graphql';
import { MID_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import { MaxLength } from 'class-validator';

@InputType()
export class UpdateActorGroupInput extends UpdateBaseCherrytwistInput {
  @Field({ nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(MID_TEXT_LENGTH)
  description?: string;
}
