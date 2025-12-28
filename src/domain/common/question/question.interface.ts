import { ObjectType } from '@nestjs/graphql';
import { INVP } from '@domain/common/nvp';

@ObjectType('Question')
export class IQuestion extends INVP {}
