import { Injectable } from '@nestjs/common';
import { Counter, register } from 'prom-client';
import {
  IdentityResolutionFailureReason,
  IdentityResolutionMetrics,
  IdentityResolutionResult,
} from './identity-resolution.service';

@Injectable()
export class PrometheusIdentityResolutionMetrics
  implements IdentityResolutionMetrics
{
  private readonly lookupCounter: Counter<string>;
  private readonly provisionCounter: Counter<string>;
  private readonly failureCounter: Counter<'reason'>;

  constructor() {
    this.lookupCounter = this.getOrCreateCounter(
      'alkemio_identity_resolution_lookup_total',
      'Total number of identity resolution requests that matched an existing user'
    );

    this.provisionCounter = this.getOrCreateCounter(
      'alkemio_identity_resolution_provision_total',
      'Total number of identity resolution requests that provisioned a new user'
    );

    this.failureCounter = this.getOrCreateCounter(
      'alkemio_identity_resolution_failures_total',
      'Total number of identity resolution requests that failed',
      ['reason']
    );
  }

  recordLookupHit(_result: IdentityResolutionResult): void {
    this.lookupCounter.inc();
  }

  recordProvision(_result: IdentityResolutionResult): void {
    this.provisionCounter.inc();
  }

  recordFailure(reason: IdentityResolutionFailureReason): void {
    this.failureCounter.inc({ reason });
  }

  private getOrCreateCounter<T extends string>(
    name: string,
    help: string,
    labelNames: T[] = []
  ): Counter<T> {
    const existing = register.getSingleMetric(name) as Counter<T> | undefined;
    if (existing) {
      return existing;
    }

    return new Counter<T>({
      name,
      help,
      labelNames,
      registers: [register],
    });
  }
}
