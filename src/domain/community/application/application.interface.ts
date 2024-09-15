import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { IUser } from '@domain/community/user/user.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IQuestion } from '@domain/common/question/question.interface';
import { IRoleManager } from '@domain/access/role-manager';

@ObjectType('Application')
export abstract class IApplication extends IAuthorizable {
  user?: IUser;

  roleManager?: IRoleManager;

  @Field(() => ILifecycle, { nullable: false })
  lifecycle?: ILifecycle;

  questions?: IQuestion[];

  @Field(() => Date)
  createdDate!: Date;

  @Field(() => Date)
  updatedDate!: Date;
}
