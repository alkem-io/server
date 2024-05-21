import { Field, ObjectType } from '@nestjs/graphql';
import { IContributor } from '../contributor/contributor.interface';
import { IVirtualPersona } from '../virtual-persona';
import { IAccount } from '@domain/space/account/account.interface';
import { BodyOfKnowledgeType } from '@common/enums/virtual.contributor.body.of.knowledge.type';

@ObjectType('VirtualContributor')
export class IVirtualContributor extends IContributor {
  @Field(() => IVirtualPersona, {
    description: 'The virtual persona being used by this virtual contributor',
  })
  virtualPersona!: IVirtualPersona;

  communicationID!: string;
  @Field(() => IAccount, {
    description: 'The account under which the virtual contributor was created',
  })
  account!: IAccount;

  @Field(() => BodyOfKnowledgeType, {
    nullable: false,
    description: 'The body of knowledge type used for the Virtual Contributor',
  })
  bodyOfKnowledgeType!: BodyOfKnowledgeType;
  bodyOfKnowledgeID!: string;
}
