import { Field, ObjectType } from '@nestjs/graphql';
import { AspectTemplate } from './hub.dto.template.aspect';

@ObjectType('HubTemplate')
export class HubTemplate {
  @Field(() => [AspectTemplate])
  aspectTemplates!: AspectTemplate[];

  constructor() {
    this.aspectTemplates = [];
  }
}
