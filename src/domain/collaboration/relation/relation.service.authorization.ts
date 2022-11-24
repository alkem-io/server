import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IRelation } from './relation.interface';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions';
import { Relation } from './relation.entity';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';

@Injectable()
export class RelationAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    @InjectRepository(Relation)
    private relationRepository: Repository<Relation>
  ) {}

  public async applyAuthorizationPolicy(
    relation: IRelation,
    collaborationAuthorizationPolicy: IAuthorizationPolicy | undefined,
    userID: string
  ): Promise<IRelation> {
    relation.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        relation.authorization,
        collaborationAuthorizationPolicy
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow users to update their own created relation
    const selfCreatedRelation =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ],
        [
          {
            type: AuthorizationCredential.USER_SELF_MANAGEMENT,
            resourceID: userID,
          },
        ]
      );
    newRules.push(selfCreatedRelation);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      relation.authorization,
      newRules
    );
    return await this.relationRepository.save(relation);
  }

  public localExtendAuthorizationPolicy(
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found',
        LogContext.COLLABORATION
      );
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow global registered users to create
    const globalRegisteredCreateRelation =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.CREATE],
        [AuthorizationCredential.GLOBAL_REGISTERED]
      );

    newRules.push(globalRegisteredCreateRelation);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
    return authorization;
  }
}
