import { Field, ObjectType } from '@nestjs/graphql';
import { IRoomable } from '../room/roomable.interface';

@ObjectType('Comments')
export abstract class IComments extends IRoomable {
  @Field(() => Number, {
    description: 'The number of comments.',
  })
  commentsCount!: number;
}
