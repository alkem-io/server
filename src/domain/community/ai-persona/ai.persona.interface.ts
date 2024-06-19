import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IAccount } from '@domain/space/account/account.interface';

@ObjectType('AiPersona')
export class IAiPersona extends IAuthorizable {
  @Field(() => IAccount, {
    nullable: true,
    description: 'The account under which the AI Persona was created',
  })
  account!: IAccount;
}
