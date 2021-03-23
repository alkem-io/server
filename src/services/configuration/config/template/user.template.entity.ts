import { Field, ObjectType } from '@nestjs/graphql';
import { IUserTemplate, ITagsetTemplate } from './user.template.interface';

@ObjectType()
export class UserTemplate implements IUserTemplate {
  @Field(() => String, {
    nullable: false,
    description: 'User template name.',
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

@ObjectType()
export class TagsetTemplate implements ITagsetTemplate {
  @Field(() => String, {
    nullable: false,
    description: 'Tagset template name.',
  })
  name: string;
  @Field(() => String, {
    nullable: true,
    description: 'Tagset placeholder',
  })
  placeholder?: string;

  constructor(name: string) {
    this.name = name;
  }
}
