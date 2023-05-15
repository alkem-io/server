import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { ObjectType } from '@nestjs/graphql';

@ObjectType('IRoomable')
export abstract class IRoomable extends IAuthorizable {
  communicationRoomID!: string;
  displayName!: string;
}
