import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';

@InputType()
export class UpdateUserInput extends UpdateNameableInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  lastName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  phone?: string;

  @Field({
    nullable: true,
    description:
      'Set this user profile as being used as a service account or not.',
  })
  serviceProfile?: boolean;
}
