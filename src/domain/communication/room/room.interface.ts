import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';

@ObjectType('Room2')
export abstract class IRoom extends IAuthorizable {
  type!: string;

  @Field(() => Number, {
    description: 'The number of messages in the Room.',
  })
  messagesCount!: number;

  externalRoomID!: string;

  displayName!: string;
}
