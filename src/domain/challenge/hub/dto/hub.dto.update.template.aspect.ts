import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateAspectTemplateInput {
  @Field({ nullable: false })
  type!: string;

  @Field({ nullable: true })
  description!: string;
}
