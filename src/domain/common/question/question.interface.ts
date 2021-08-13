import { ObjectType } from '@nestjs/graphql';
import { INVP } from '../nvp/nvp.interface';

@ObjectType('Question')
export class IQuestion extends INVP {}
