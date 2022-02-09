import { Field, ObjectType } from '@nestjs/graphql';
import { AspectTemplate } from './ecoverse.dto.template.aspect';

@ObjectType('HubTemplate')
export class HubTemplate {
  @Field(() => [AspectTemplate])
  aspectTemplates!: AspectTemplate[];

  constructor() {
    this.aspectTemplates = [];
  }
}
