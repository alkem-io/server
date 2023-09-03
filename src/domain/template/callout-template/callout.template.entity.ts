import { Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ICalloutTemplate } from '@domain/template/callout-template/callout.template.interface';
import { TemplateBase } from '@domain/template/template-base/template.base.entity';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { CalloutResponseDefaults } from '@domain/collaboration/callout-response-defaults/callout.response.defaults.entity';
import { CalloutResponsePolicy } from '@domain/collaboration/callout-response-policy/callout.response.policy.entity';
import { TemplatesSet } from '../templates-set/templates.set.entity';

@Entity()
export class CalloutTemplate extends TemplateBase implements ICalloutTemplate {
  @ManyToOne(
    () => TemplatesSet,
    templatesSet => templatesSet.calloutTemplates,
    {
      eager: false,
      cascade: false,
      onDelete: 'NO ACTION',
    }
  )
  templatesSet?: TemplatesSet;

  @OneToOne(() => CalloutFraming, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  framing!: CalloutFraming;

  @OneToOne(() => CalloutResponseDefaults, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  responseDefaults!: CalloutResponseDefaults;

  @OneToOne(() => CalloutResponsePolicy, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  responsePolicy!: CalloutResponsePolicy;

  constructor() {
    super();
    this.framing = new CalloutFraming();
    this.responseDefaults = new CalloutResponseDefaults();
    this.responsePolicy = new CalloutResponsePolicy();
  }
}
