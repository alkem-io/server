import { Inject, LoggerService } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CanvasTemplateService } from './canvas.template.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Resolver()
export class CanvasTemplateResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private aspectTemplateService: CanvasTemplateService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}
}
