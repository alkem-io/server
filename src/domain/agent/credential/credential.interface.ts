import { AuthorizationCredential } from '@common/enums';
import { IBaseCherrytwist } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Credential')
export abstract class ICredential extends IBaseCherrytwist {
  @Field(() => String)
  resourceID!: string;

  @Field(() => AuthorizationCredential)
  type!: string;
}
