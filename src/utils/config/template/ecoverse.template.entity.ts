import { Field, ObjectType } from '@nestjs/graphql';
import { ApplicationTemplate } from '@utils/config/template/application.template.entity';

@ObjectType()
export class EcoverseTemplate {
  @Field(() => String, {
    nullable: false,
    description: 'Ecoverse template name.',
  })
  name: string;

  @Field(() => [ApplicationTemplate], {
    nullable: true,
    description: 'Application templates.',
  })
  applications?: ApplicationTemplate[];

  constructor();
  constructor(name: string);
  constructor(name?: string) {
    this.name = name || 'default';
  }
}
