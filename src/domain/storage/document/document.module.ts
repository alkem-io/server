import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Document } from './document.entity';
import { DocumentResolverMutations } from './document.resolver.mutations';
import { DocumentService } from './document.service';
import { DocumentResolverFields } from './document.resolver.fields';
import { DocumentAuthorizationService } from './document.service.authorization';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { UserModule } from '@domain/community/user/user.module';
import { IpfsModule } from '@services/adapters/ipfs/ipfs.module';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    TagsetModule,
    UserModule,
    IpfsModule,
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
