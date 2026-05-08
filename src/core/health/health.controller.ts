import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';

// FR-036a — k8s liveness/readiness probe surface.
//
// /health/live — handler responsive only, no dep calls. A liveness failure
//   triggers pod restart, so it MUST stay green during transient dep blips.
// /health/ready — gates Service endpoint inclusion. Returns 503 when any
//   required dep is unreachable. Each dep-check is uniform ≤500 ms with a
//   ≤2 s TTL cache so probe storms can't saturate the dep.
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  async live(): Promise<{ status: 'ok' }> {
    return this.healthService.live();
  }

  @Get('ready')
  async ready(@Res() res: Response): Promise<void> {
    const result = await this.healthService.ready();
    const code =
      result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    res.status(code).json(result);
  }
}
