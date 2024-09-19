import { Field, InputType } from '@nestjs/graphql';

@InputType('ExternalConfig')
export class IExternalConfig {
  @Field(() => String, { nullable: false })
  apiKey?: string;

  @Field(() => String, { nullable: true })
  assistantId?: string;
}
