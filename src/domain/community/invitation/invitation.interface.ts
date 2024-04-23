import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { ICommunity } from '@domain/community/community/community.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';

@ObjectType('Invitation')
export class IInvitation extends IAuthorizable {
  invitedUser!: string;
  createdBy!: string;

  community?: ICommunity;

  @Field(() => ILifecycle, { nullable: false })
  lifecycle!: ILifecycle;

  @Field(() => Date)
  createdDate!: Date;

  @Field(() => Date)
  updatedDate!: Date;

  @Field(() => String, { nullable: true })
  welcomeMessage?: string;
}
