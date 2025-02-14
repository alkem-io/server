import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Library } from './library.entity';
import { LibraryResolverFields } from './library.resolver.fields';
import { LibraryService } from './library.service';
import { LibraryAuthorizationService } from './library.service.authorization';
import { InnovationPackModule } from '@library/innovation-pack/innovation.pack.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    InnovationPackModule,
    TypeOrmModule.forFeature([Library]),
  ],
  providers: [
    LibraryResolverFields,
    LibraryService,
    LibraryAuthorizationService,
  ],
  exports: [LibraryService, LibraryAuthorizationService],
})
export class LibraryModule {}
