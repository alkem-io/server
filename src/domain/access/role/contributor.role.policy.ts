import { IContributorRolePolicy } from './contributor.role.policy.interface';

export class ContributorRolePolicy implements IContributorRolePolicy {
  minimum: number;
  maximum: number;
  enabled: boolean;

  constructor() {
    this.minimum = -1;
    this.maximum = -1;
    this.enabled = false;
  }
}
