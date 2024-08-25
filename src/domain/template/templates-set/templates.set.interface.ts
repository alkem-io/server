import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { ObjectType } from '@nestjs/graphql';
import { ITemplate } from '../template/template.interface';
import { IWhiteboardTemplate } from '../whiteboard-template/whiteboard.template.interface';
import { ICalloutTemplate } from '../callout-template/callout.template.interface';
import { ICommunityGuidelinesTemplate } from '../community-guidelines-template/community.guidelines.template.interface';

@ObjectType('TemplatesSet')
export abstract class ITemplatesSet extends IAuthorizable {
  calloutTemplates!: ICalloutTemplate[];

  templates!: ITemplate[];

  whiteboardTemplates!: IWhiteboardTemplate[];

  communityGuidelinesTemplates!: ICommunityGuidelinesTemplate[];
}
