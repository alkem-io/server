import { INameable } from '@domain/common/entity/nameable-entity';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('IRoomableNameable')
export abstract class IRoomableNameable extends INameable {
  communicationRoomID!: string;
  displayName!: string;
}
