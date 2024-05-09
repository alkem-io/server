import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateBaseModule } from '../template-base/template.base.module';
import { MemberGuidelinesTemplate } from './member.guidelines.template.entity';
import { MemberGuidelinesTemplateService } from './member.guidelines.template.service';
import { MemberGuidelinesTemplateAuthorizationService } from './member.guidelines.template.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TemplateBaseModule,
    ProfileModule,
    TypeOrmModule.forFeature([MemberGuidelinesTemplate]),
  ],
  providers: [
    MemberGuidelinesTemplateService,
    MemberGuidelinesTemplateAuthorizationService,
  ],
  exports: [
    MemberGuidelinesTemplateService,
    MemberGuidelinesTemplateAuthorizationService,
  ],
})
export class MemberGuidelinesTemplateModule {}
