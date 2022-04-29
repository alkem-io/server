import { InputType, Field } from '@nestjs/graphql';
import { IOrganization } from '@src/domain';

@InputType()
export class OrganizationFilterInput implements Partial<IOrganization> {
  @Field(() => String, { nullable: true })
  displayName!: string;

  @Field(() => String, { nullable: true })
  nameID!: string;

  @Field(() => String, { nullable: true })
  contactEmail!: string;

  @Field(() => String, { nullable: true })
  domain!: string;

  @Field(() => String, { nullable: true })
  website!: string;
}
