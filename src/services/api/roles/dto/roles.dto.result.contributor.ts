import { ICredential } from '@domain/agent/credential/credential.interface';
import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { SpaceFilterInput } from '@services/infrastructure/space-filter/dto/space.filter.dto.input';

@ObjectType()
export class ContributorRoles {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  filter?: SpaceFilterInput;

  credentials!: ICredential[];
}
