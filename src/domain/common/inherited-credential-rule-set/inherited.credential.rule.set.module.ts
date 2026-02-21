import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InheritedCredentialRuleSet } from './inherited.credential.rule.set.entity';
import { InheritedCredentialRuleSetService } from './inherited.credential.rule.set.service';

@Module({
  imports: [TypeOrmModule.forFeature([InheritedCredentialRuleSet])],
  providers: [InheritedCredentialRuleSetService],
  exports: [InheritedCredentialRuleSetService],
})
export class InheritedCredentialRuleSetModule {}
