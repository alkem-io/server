import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { EcoverseService } from './ecoverse.service';
import { ChallengeAuthorizationService } from '@domain/challenge/challenge/challenge.service.authorization';
import {
  AuthorizationRuleCredential,
  IAuthorizationDefinition,
  UpdateAuthorizationDefinitionInput,
} from '@domain/common/authorization-definition';
import { BaseChallengeAuthorizationService } from '../base-challenge/base.challenge.service.authorization';
import { EntityNotInitializedException } from '@common/exceptions';
import { AuthorizationDefinitionService } from '@domain/common/authorization-definition/authorization.definition.service';
import { IEcoverse } from './ecoverse.interface';
import { Ecoverse } from './ecoverse.entity';

@Injectable()
export class EcoverseAuthorizationService {
  constructor(
    private baseChallengeAuthorizationService: BaseChallengeAuthorizationService,
    private authorizationDefinitionService: AuthorizationDefinitionService,
    private authorizationEngine: AuthorizationEngineService,
    private challengeAuthorizationService: ChallengeAuthorizationService,
    private ecoverseService: EcoverseService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>
  ) {}

  async applyAuthorizationRules(ecoverse: IEcoverse): Promise<IEcoverse> {
    ecoverse.authorization = this.extendAuthorizationDefinition(
      ecoverse.authorization,
      ecoverse.id
    );
    await this.baseChallengeAuthorizationService.applyAuthorizationRules(
      ecoverse,
      this.ecoverseRepository
    );

    // propagate authorization rules for child entities
    const challenges = await this.ecoverseService.getChallenges(ecoverse);
    for (const challenge of challenges) {
      await this.challengeAuthorizationService.applyAuthorizationRules(
        challenge,
        ecoverse.authorization
      );
      challenge.authorization = await this.authorizationDefinitionService.appendCredentialAuthorizationRule(
        challenge.authorization,
        {
          type: AuthorizationCredential.EcoverseAdmin,
          resourceID: ecoverse.id,
        },
        [AuthorizationPrivilege.DELETE]
      );
    }

    return await this.ecoverseRepository.save(ecoverse);
  }

  async updateAuthorizationDefinition(
    ecoverse: IEcoverse,
    authorizationUpdateData: UpdateAuthorizationDefinitionInput
  ): Promise<IEcoverse> {
    await this.baseChallengeAuthorizationService.updateAuthorization(
      ecoverse,
      this.ecoverseRepository,
      authorizationUpdateData
    );

    // propagate authorization rules for child entities
    const challenges = await this.ecoverseService.getChallenges(ecoverse);
    for (const challenge of challenges) {
      await this.challengeAuthorizationService.updateAuthorization(
        challenge,
        authorizationUpdateData
      );
      challenge.authorization = this.authorizationDefinitionService.updateAuthorization(
        challenge.authorization,
        authorizationUpdateData
      );
    }

    return await this.ecoverseRepository.save(ecoverse);
  }

  private extendAuthorizationDefinition(
    authorization: IAuthorizationDefinition | undefined,
    ecoverseID: string
  ): IAuthorizationDefinition {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${ecoverseID}`,
        LogContext.CHALLENGES
      );
    const newRules: AuthorizationRuleCredential[] = [];
    // By default it is world visible
    authorization.anonymousReadAccess = true;

    const globalAdmin = {
      type: AuthorizationCredential.GlobalAdmin,
      resourceID: '',
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.GRANT,
      ],
    };
    newRules.push(globalAdmin);

    const communityAdmin = {
      type: AuthorizationCredential.GlobalAdminCommunity,
      resourceID: '',
      grantedPrivileges: [AuthorizationPrivilege.READ],
    };
    newRules.push(communityAdmin);

    const ecoverseAdmin = {
      type: AuthorizationCredential.EcoverseAdmin,
      resourceID: ecoverseID,
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
        AuthorizationPrivilege.GRANT,
      ],
    };
    newRules.push(ecoverseAdmin);

    const ecoverseMember = {
      type: AuthorizationCredential.EcoverseMember,
      resourceID: ecoverseID,
      grantedPrivileges: [AuthorizationPrivilege.READ],
    };
    newRules.push(ecoverseMember);

    this.authorizationDefinitionService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }
}
