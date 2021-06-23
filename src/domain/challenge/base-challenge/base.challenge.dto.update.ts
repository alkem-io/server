import { InputType, Field } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { UpdateContextInput } from '@domain/context/context';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity';

@InputType()
export class UpdateBaseChallengeInput extends UpdateNameableInput {
  @Field(() => UpdateContextInput, {
    nullable: true,
    description: 'Update the contained Context entity.',
  })
  @IsOptional()
  context?: UpdateContextInput;

  @Field(() => [String], {
    nullable: true,
    description: 'Update the tags on the Tagset.',
  })
  @IsOptional()
  tags?: string[];
}
