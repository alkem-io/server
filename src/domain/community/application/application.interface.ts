import { IQuestion, Question } from '@domain/community/application';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { ICommunity } from '../community';
import { IUser } from '@domain/community/user';
import { IBaseCherrytwist } from '@domain/common/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Application')
export abstract class IApplication extends IBaseCherrytwist {
  @Field(() => IUser)
  user?: IUser;

  community?: ICommunity;

  @Field(() => ILifecycle, { nullable: false })
  life44cycle?: ILifecycle;

  @Field(() => [IQuestion])
  questions?: Question[];
}
