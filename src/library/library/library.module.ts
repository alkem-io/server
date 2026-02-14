import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { InnovationPackModule } from '@library/innovation-pack/innovation.pack.module';
import { Module } from '@nestjs/common';
import { LibraryResolverFields } from './library.resolver.fields';
import { LibraryService } from './library.service';
import { LibraryAuthorizationService } from './library.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    InnovationPackModule,
  ],
  providers: [
    LibraryResolverFields,
    LibraryService,
    LibraryAuthorizationService,
  ],
  exports: [LibraryService, LibraryAuthorizationService],
})
export class LibraryModule {}
