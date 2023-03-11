import { Injectable } from '@nestjs/common';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ProjectService } from './project.service';
import { IProject } from './project.interface';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';

@Injectable()
export class ProjectAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private projectService: ProjectService,
    private profileAuthorizationService: ProfileAuthorizationService
  ) {}

  async applyAuthorizationPolicy(
    project: IProject,
    parentAuthorization: IAuthorizationPolicy | undefined
  ): Promise<IProject> {
    project.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        project.authorization,
        parentAuthorization
      );

    project.profile = await this.projectService.getProfile(project);
    project.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        project.profile,
        project.authorization
      );

    return await this.projectService.save(project);
  }
}
