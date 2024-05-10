import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { IPostTemplate } from '../post-template/post.template.interface';
import { IWhiteboardTemplate } from '../whiteboard-template/whiteboard.template.interface';
import { IInnovationFlowTemplate } from '../innovation-flow-template/innovation.flow.template.interface';
import { ICalloutTemplate } from '../callout-template/callout.template.interface';
import { ITemplateBase } from '../template-base/template.base.interface';

@ObjectType('TemplatesSet')
export abstract class ITemplatesSet extends IAuthorizable {
  calloutTemplates!: ICalloutTemplate[];

  postTemplates!: IPostTemplate[];

  whiteboardTemplates!: IWhiteboardTemplate[];

  innovationFlowTemplates!: IInnovationFlowTemplate[];

  communityGuidelinesTemplates!: ITemplateBase[];
}
