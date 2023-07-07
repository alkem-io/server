import { Field, ObjectType } from '@nestjs/graphql';
import { IUser } from '@domain/community/user/user.interface';
import { IInvitation } from '@domain/community/invitation';
import { IApplication } from '@domain/community/application';
import { ISpace } from '@domain/challenge/space/space.interface';

@ObjectType()
export class MeQueryResults {
  @Field(() => IUser, {
    description: 'The current authenticated user',
  })
  user!: IUser;
  // exposed through the field resolver
  invitations!: IInvitation[];
  applications!: IApplication[];
  spaceMemberships!: ISpace[];
}
