import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IRoom } from '../room/room.interface';

@ObjectType('Communication')
export abstract class ICommunication extends IAuthorizable {
  @Field(() => IRoom, {
    nullable: false,
    description: 'The updates on this Communication.',
  })
  updates!: IRoom;

  spaceID?: string;

  displayName!: string;
}
