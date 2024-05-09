import { Entity, OneToMany } from 'typeorm';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { ITemplatesSet } from './templates.set.interface';
import { PostTemplate } from '../post-template/post.template.entity';
import { WhiteboardTemplate } from '../whiteboard-template/whiteboard.template.entity';
import { InnovationFlowTemplate } from '../innovation-flow-template/innovation.flow.template.entity';
import { CalloutTemplate } from '../callout-template/callout.template.entity';
import { MemberGuidelinesTemplate } from '../member-guidelines-template/member.guidelines.template.entity';

@Entity()
export class TemplatesSet extends AuthorizableEntity implements ITemplatesSet {
  @OneToMany(
    () => CalloutTemplate,
    calloutTemplate => calloutTemplate.templatesSet,
    {
      eager: false,
      cascade: true,
    }
  )
  calloutTemplates!: CalloutTemplate[];

  @OneToMany(() => PostTemplate, postTemplate => postTemplate.templatesSet, {
    eager: false,
    cascade: true,
  })
  postTemplates!: PostTemplate[];

  @OneToMany(
    () => WhiteboardTemplate,
    whiteboardTemplate => whiteboardTemplate.templatesSet,
    {
      eager: false,
      cascade: true,
    }
  )
  whiteboardTemplates!: WhiteboardTemplate[];

  @OneToMany(
    () => InnovationFlowTemplate,
    innovationFlowTemplate => innovationFlowTemplate.templatesSet,
    {
      eager: false,
      cascade: true,
    }
  )
  innovationFlowTemplates!: InnovationFlowTemplate[];

  @OneToMany(
    () => MemberGuidelinesTemplate,
    memberGuidelinesTemplate => memberGuidelinesTemplate.templatesSet,
    {
      eager: false,
      cascade: true,
    }
  )
  memberGuidelinesTemplates!: MemberGuidelinesTemplate[];
}
