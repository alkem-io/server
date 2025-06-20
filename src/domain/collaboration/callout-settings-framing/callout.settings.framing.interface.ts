import { Field, ObjectType } from '@nestjs/graphql';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { CalloutFramingType } from '@common/enums/callout.framing.type';

@ObjectType('CalloutSettingsFraming')
export abstract class ICalloutSettingsFraming extends IBaseAlkemio {
  @Field(() => CalloutFramingType, {
    nullable: false,
    description:
      'The type of additional content attached to the framing of the callout.',
  })
  type!: CalloutFramingType;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Can comment to callout framing.',
  })
  commentsEnabled!: boolean;
}
