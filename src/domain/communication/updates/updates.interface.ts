import { ObjectType } from '@nestjs/graphql';
import { IRoomable } from '../room/roomable.interface';

@ObjectType('Updates')
export abstract class IUpdates extends IRoomable {}
