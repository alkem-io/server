import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Discussion')
export abstract class IDiscussion extends IBaseAlkemio {
  @Field(() => String, {
    description: 'The title of the Discussion.',
  })
  title!: string;

  @Field(() => String, {
    description: 'The category assigned to this Discussion.',
  })
  category?: string;

  discussionRoomID!: string;
}
