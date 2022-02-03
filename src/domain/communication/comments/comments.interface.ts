import { ObjectType } from '@nestjs/graphql';
import { IRoomable } from '../room/roomable.interface';

@ObjectType('Comments')
export abstract class IComments extends IRoomable {}
