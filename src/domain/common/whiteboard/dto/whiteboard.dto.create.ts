import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { NameID } from '@domain/common/scalars/scalar.nameid';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';
import { WhiteboardContent } from '@domain/common/scalars/scalar.whiteboard.content';

@InputType()
export class CreateWhiteboardInput extends CreateNameableInput {
  @Field(() => WhiteboardContent, { nullable: true })
  @IsOptional()
  content?: string;

  // Override
  @Field(() => NameID, {
    nullable: true,
    description:
      'A readable identifier, unique within the containing scope. If not provided it will be generated based on the displayName.',
  })
  nameID!: string;
}
