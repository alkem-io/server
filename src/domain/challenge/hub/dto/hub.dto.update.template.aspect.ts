import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateAspectTemplateInput {
  @Field({ nullable: false })
  type!: string;

  @Field({ nullable: true })
  defaultDescription!: string;

  @Field({ nullable: true })
  typeDescription!: string;
}
