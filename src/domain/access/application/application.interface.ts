import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { IQuestion } from '@domain/common/question/question.interface';
import { IUser } from '@domain/community/user/user.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Application')
export abstract class IApplication extends IAuthorizable {
  user?: IUser;

  roleSet?: IRoleSet;

  @Field(() => ILifecycle, { nullable: false })
  lifecycle!: ILifecycle;

  questions?: IQuestion[];
}
