import { InputType, Field } from '@nestjs/graphql';
import { NAMEID_LENGTH } from '@src/common/constants';
import { IsOptional, MaxLength } from 'class-validator';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';

@InputType()
export class CreateDocumentInput extends CreateNameableInput {
  // Override
  @Field(() => NameID, {
    nullable: true,
    description: 'A readable identifier, unique within the containing scope.',
  })
  @MaxLength(NAMEID_LENGTH)
  @IsOptional()
  nameID!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
