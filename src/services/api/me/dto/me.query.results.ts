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

  @Field(() => [IInvitation], {
    description: 'The invitations of the current authenticated user ',
    defaultValue: [],
  })
  invitations!: IInvitation[];

  @Field(() => [IApplication], {
    description: 'The applications of the current authenticated user ',
    defaultValue: [],
  })
  applications!: IApplication[];

  @Field(() => [ISpace], {
    description: 'The Spaces which the current authenticated user is member of',
    defaultValue: [],
  })
  spaceMemberships!: ISpace[];
}
