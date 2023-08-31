import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { CANVAS_VALUE_LENGTH } from '@common/constants';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';

@InputType()
export class CreateWhiteboardRtInput extends CreateNameableInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(CANVAS_VALUE_LENGTH)
  content?: string;

  // Override
  @Field(() => NameID, {
    nullable: true,
    description:
      'A readable identifier, unique within the containing scope. If not provided it will be generated based on the displayName.',
  })
  nameID!: string;
}
