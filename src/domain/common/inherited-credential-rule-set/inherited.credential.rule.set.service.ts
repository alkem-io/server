import { LogContext } from '@common/enums';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { InheritedCredentialRuleSet } from './inherited.credential.rule.set.entity';

@Injectable()
export class InheritedCredentialRuleSetService {
  constructor(
    @InjectRepository(InheritedCredentialRuleSet)
    private inheritedCredentialRuleSetRepository: Repository<InheritedCredentialRuleSet>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async resolveForParent(
    parentAuthorization: IAuthorizationPolicy
  ): Promise<InheritedCredentialRuleSet> {
    const cascadingRules = this.computeCascadingRules(parentAuthorization);

    let ruleSet = await this.inheritedCredentialRuleSetRepository.findOne({
      where: { parentAuthorizationPolicyId: parentAuthorization.id },
    });

    if (ruleSet) {
      ruleSet.credentialRules = cascadingRules;
      ruleSet = await this.inheritedCredentialRuleSetRepository.save(ruleSet);
    } else {
      ruleSet = this.inheritedCredentialRuleSetRepository.create({
        parentAuthorizationPolicyId: parentAuthorization.id,
        credentialRules: cascadingRules,
      });
      ruleSet = await this.inheritedCredentialRuleSetRepository.save(ruleSet);
      this.logger.verbose?.(
        `Created InheritedCredentialRuleSet for parent policy ${parentAuthorization.id}`,
        LogContext.AUTH
      );
    }

    parentAuthorization._childInheritedCredentialRuleSet = ruleSet;

    return ruleSet;
  }

  private computeCascadingRules(
    parentAuthorization: IAuthorizationPolicy
  ): IAuthorizationPolicyRuleCredential[] {
    const localCascading = parentAuthorization.credentialRules.filter(
      r => r.cascade
    );
    const inheritedRules =
      parentAuthorization.inheritedCredentialRuleSet?.credentialRules ?? [];
    return [...inheritedRules, ...localCascading];
  }
}
