import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ICalloutTemplate } from '@domain/template/callout-template/callout.template.interface';
import { TemplateBase } from '@domain/template/template-base/template.base.entity';
import { CalloutFraming } from '@domain/collaboration/callout-framing/callout.framing.entity';
import { CalloutContributionDefaults } from '@domain/collaboration/callout-contribution-defaults/callout.contribution.defaults.entity';
import { CalloutContributionPolicy } from '@domain/collaboration/callout-contribution-policy/callout.contribution.policy.entity';
import { TemplatesSet } from '../templates-set/templates.set.entity';
import { CalloutType } from '@common/enums/callout.type';

@Entity()
export class CalloutTemplate extends TemplateBase implements ICalloutTemplate {
  @Column('varchar', { length: 255, nullable: false })
  type!: CalloutType;

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
  contributionDefaults!: CalloutContributionDefaults;

  @OneToOne(() => CalloutContributionPolicy, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  contributionPolicy!: CalloutContributionPolicy;

  constructor() {
    super();
    this.framing = new CalloutFraming();
    this.contributionDefaults = new CalloutContributionDefaults();
    this.contributionPolicy = new CalloutContributionPolicy();
  }
}
