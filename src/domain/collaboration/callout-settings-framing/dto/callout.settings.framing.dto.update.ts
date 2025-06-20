import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateCalloutSettingsFramingInput {
  @Field(() => CalloutFramingType, {
    description:
      'The type of additional content attached to the framing of the callout.',
    nullable: true,
  })
  type?: CalloutFramingType;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Can comment to callout framing.',
  })
  commentsEnabled?: boolean;
}
