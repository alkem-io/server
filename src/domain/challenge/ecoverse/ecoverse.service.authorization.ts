import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthorizationCredential } from '@common/enums';
import { Repository } from 'typeorm';
import { AuthorizationRule } from '@src/services/authorization-engine/authorizationRule';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { EcoverseService } from './ecoverse.service';
import { IEcoverse, Ecoverse } from '@domain/challenge/ecoverse';

@Injectable()
export class EcoverseAuthorizationService {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private ecoverseService: EcoverseService,
    @InjectRepository(Ecoverse)
    private ecoverseRepository: Repository<Ecoverse>
  ) {}

  async applyAuthorizationRules(ecoverse: IEcoverse): Promise<IEcoverse> {
    ecoverse.authorizationRules = this.createAuthorizationRules(ecoverse.id);

    // propagate authorization rules for child entities
    const containedChallenge = await this.ecoverseService.getContainedChallenge(
      ecoverse
    );
    containedChallenge.authorizationRules = await this.authorizationEngine.appendAuthorizationRule(
      ecoverse.authorizationRules,
      {
        type: AuthorizationCredential.EcoverseAdmin,
        resourceID: ecoverse.id,
      },
      [AuthorizationPrivilege.DELETE]
    );

    return await this.ecoverseRepository.save(ecoverse);
  }

  createAuthorizationRules(ecoverseID: string): string {
    const rules: AuthorizationRule[] = [];

    const globalAdmin = {
      type: AuthorizationCredential.GlobalAdmin,
      resourceID: '',
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
        AuthorizationPrivilege.DELETE,
      ],
    };
    rules.push(globalAdmin);

    const communityAdmin = {
      type: AuthorizationCredential.GlobalAdminCommunity,
      resourceID: '',
      grantedPrivileges: [AuthorizationPrivilege.READ],
    };
    rules.push(communityAdmin);

    const ecoverseAdmin = {
      type: AuthorizationCredential.EcoverseAdmin,
      resourceID: ecoverseID,
      grantedPrivileges: [
        AuthorizationPrivilege.CREATE,
        AuthorizationPrivilege.READ,
        AuthorizationPrivilege.UPDATE,
      ],
    };
    rules.push(ecoverseAdmin);

    const ecoverseMember = {
      type: AuthorizationCredential.EcoverseMember,
      resourceID: ecoverseID,
      grantedPrivileges: [AuthorizationPrivilege.READ],
    };
    rules.push(ecoverseMember);

    return JSON.stringify(rules);
  }
}
