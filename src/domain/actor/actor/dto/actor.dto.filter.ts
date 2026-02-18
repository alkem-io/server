import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { CreateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ActorFilterInput {
  @Field(() => [AuthorizationCredential], {
    nullable: true,
    description: 'Return actors with credentials in the provided list',
  })
  credentials?: AuthorizationCredential[];
}

@InputType()
export class CreateContributorInput extends CreateNameableInput {}

@InputType()
export class UpdateContributorInput extends UpdateNameableInput {}
