import { Field, ObjectType } from '@nestjs/graphql';
import { IUserTemplate } from './user.template.interface';

@ObjectType()
export class UserTemplate implements IUserTemplate {
  @Field(() => String, {
    nullable: false,
    description: 'Template user name.',
  })
  name: string;

  @Field(() => [String], {
    nullable: true,
    description: 'Template tagsets.',
  })
  tagsets?: string[];

  constructor(name: string) {
    this.name = name;
  }
}
