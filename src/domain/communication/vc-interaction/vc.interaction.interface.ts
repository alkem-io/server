import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';
import { IRoom } from '../room/room.interface';

@ObjectType('VcInteraction')
export abstract class IVcInteraction extends IBaseAlkemio {
  @Field(() => IRoom)
  room!: IRoom;

  @Field(() => String)
  threadID!: string;

  virtualContributorID!: string;
}
