import { ObjectType } from '@nestjs/graphql';
import { IUser } from '@domain/community/user/user.interface';
import { IInvitation } from '@domain/community/invitation';
import { IApplication } from '@domain/community/application';
import { ISpace } from '@domain/space/space/space.interface';

@ObjectType()
export class MeQueryResults {
  // exposed through the field resolver
  user!: IUser;
  invitations!: IInvitation[];
  applications!: IApplication[];
  spaceMemberships!: ISpace[];
}
