import { TemplateType } from '@common/enums/template.type';
import { Callout } from '@domain/collaboration/callout/callout.entity';
import { NameableEntity } from '@domain/common/entity/nameable-entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { CommunityGuidelines } from '@domain/community/community-guidelines/community.guidelines.entity';
import { TemplatesSet } from '@domain/template/templates-set/templates.set.entity';
import { TemplateContentSpace } from '../template-content-space/template.content.space.entity';
import { ITemplate } from './template.interface';

export class Template extends NameableEntity implements ITemplate {
  templatesSet?: TemplatesSet;

  declare profile: Profile;

  type!: TemplateType;

  postDefaultDescription?: string;

  communityGuidelines?: CommunityGuidelines;

  callout?: Callout;

  whiteboard?: Whiteboard;

  contentSpace?: TemplateContentSpace;
}
