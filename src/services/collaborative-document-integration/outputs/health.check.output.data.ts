import { BaseOutputData } from './base.output.data';

export class HealthCheckOutputData extends BaseOutputData {
  constructor(public healthy: boolean) {
    super('health-check-output');
  }
}
