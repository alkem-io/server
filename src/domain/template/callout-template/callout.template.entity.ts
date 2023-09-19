import { Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ICalloutTemplate } from '@domain/template/callout-template/callout.template.interface';
import { TemplateBase } from '@domain/template/template-base/template.base.entity';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { CalloutContributionDefaults } from '@domain/collaboration/callout-contribution-defaults/callout.contribution.defaults.entity';
import { CalloutContributionPolicy } from '@domain/collaboration/callout-contribution-policy/callout.contribution.policy.entity';
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

  @OneToOne(() => CalloutContributionDefaults, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  responseDefaults!: CalloutContributionDefaults;

  @OneToOne(() => CalloutContributionPolicy, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  responsePolicy!: CalloutContributionPolicy;

  constructor() {
    super();
    this.framing = new CalloutFraming();
    this.responseDefaults = new CalloutContributionDefaults();
    this.responsePolicy = new CalloutContributionPolicy();
  }
}
