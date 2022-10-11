import { Field, ObjectType } from '@nestjs/graphql';
import { ApplicationTemplate } from '@src/platform/configuration/config/template/application.template.entity';
import { HubAspectTemplate } from './hub.aspect.template.entity';

@ObjectType()
export class PlatformHubTemplate {
  @Field(() => String, {
    nullable: false,
    description: 'Hub template name.',
  })
  name: string;

  @Field(() => [ApplicationTemplate], {
    nullable: true,
    description: 'Application templates.',
  })
  applications?: ApplicationTemplate[];

  @Field(() => [HubAspectTemplate], {
    nullable: true,
    description: 'Hub aspect templates.',
  })
  aspects?: HubAspectTemplate[];

  constructor();
  constructor(name: string);
  constructor(name?: string) {
    this.name = name || 'default';
  }
}
