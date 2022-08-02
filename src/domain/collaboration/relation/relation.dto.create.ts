import { InputType, Field } from '@nestjs/graphql';
import { SMALL_TEXT_LENGTH, LONG_TEXT_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class CreateRelationInput {
  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  type!: string;

  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  actorName!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  actorType?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  actorRole?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;
}
