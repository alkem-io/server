import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Document } from './document.entity';
import { DocumentResolverMutations } from './document.resolver.mutations';
import { DocumentService } from './document.service';
import { DocumentResolverFields } from './document.resolver.fields';
import { DocumentAuthorizationService } from './document.service.authorization';
import { UserModule } from '@domain/community/user/user.module';
import { ProfileModule } from '@domain/common/profile/profile.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    UserModule,
    ProfileModule,
    TypeOrmModule.forFeature([Document]),
  ],
  providers: [
    DocumentResolverMutations,
    DocumentService,
    DocumentAuthorizationService,
    DocumentResolverFields,
  ],
  exports: [DocumentService, DocumentAuthorizationService],
})
export class DocumentModule {}
