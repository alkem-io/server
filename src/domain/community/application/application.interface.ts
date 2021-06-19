import {
  IQuestion,
  Question,
} from '@domain/community/application/application.dto.create';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { ICommunity } from '@domain/community/community/community.interface';
import { IUser } from '@domain/community/user/user.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/authorizable-entity';

@ObjectType('Application')
export abstract class IApplication extends IAuthorizable {
  @Field(() => IUser)
  user?: IUser;

  community?: ICommunity;

  @Field(() => ILifecycle, { nullable: false })
  lifecycle?: ILifecycle;

  @Field(() => [IQuestion])
  questions?: Question[];

  ecoverseID?: string;
}
