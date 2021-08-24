import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuthorizationRuleCredential,
  IAuthorizationPolicy,
} from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IRelation } from './relation.interface';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions';
import { Relation } from './relation.entity';

@Injectable()
export class RelationAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Relation)
    private relationRepository: Repository<Relation>
  ) {}

  async applyAuthorizationPolicy(
    relation: IRelation,
    opportunityAuthorization: IAuthorizationPolicy | undefined,
    userID: string
  ): Promise<IRelation> {
    relation.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        relation.authorization,
        opportunityAuthorization
      );

    const newRules: AuthorizationRuleCredential[] = [];

    // Allow users to update their own created relation
    const selfCreatedRelation = {
      type: AuthorizationCredential.UserSelfManagement,
      resourceID: userID,
      grantedPrivileges: [
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
    };
    newRules.push(selfCreatedRelation);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      relation.authorization,
      newRules
    );
    return await this.relationRepository.save(relation);
  }

  localExtendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found',
        LogContext.OPPORTUNITY
      );
    const newRules: AuthorizationRuleCredential[] = [];

    // Allow global registered users to create
    const globalRegisteredCreateRelation = {
      type: AuthorizationCredential.GlobalRegistered,
      resourceID: '',
      grantedPrivileges: [AuthorizationPrivilege.CREATE],
    };
    newRules.push(globalRegisteredCreateRelation);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
    return authorization;
  }
}
