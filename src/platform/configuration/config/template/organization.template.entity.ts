import { Field, ObjectType } from '@nestjs/graphql';
import { TagsetTemplate } from './user.template.entity';
import { ITagsetTemplate } from './user.template.interface';
import { IOrganizationTemplate } from './organization.template.interface';

@ObjectType()
export class OrganizationTemplate implements IOrganizationTemplate {
  @Field(() => String, {
    nullable: false,
    description: 'Organization template name.',
  })
  name: string;

  @Field(() => [TagsetTemplate], {
    nullable: true,
    description: 'Tagset templates.',
  })
  tagsets?: ITagsetTemplate[];

  constructor(name: string) {
    this.name = name;
  }
}
