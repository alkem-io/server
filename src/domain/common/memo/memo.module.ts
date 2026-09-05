import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CollaborationMetadataModule } from '@domain/common/collaboration-metadata';
import { ContentSigningModule } from '@domain/common/content-signing/content.signing.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { UserModule } from '@domain/community/user/user.module';
import { ProfileDocumentsModule } from '@domain/profile-documents/profile.documents.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
import { TrustGatewayClient } from '@services/adapters/trust-gateway/trust.gateway.client';
import { CollaborationClientModule } from '@services/collaboration-client/collaboration-client.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { LicenseModule } from '../license/license.module';
import { ProfileModule } from '../profile/profile.module';
import { Memo } from './memo.entity';
import { MemoPdfRenderer } from './memo.pdf.renderer';
import { MemoResolverFields } from './memo.resolver.fields';
import { MemoResolverMutations } from './memo.resolver.mutations';
import { MemoService } from './memo.service';
import { MemoAuthorizationService } from './memo.service.authorization';
import { MemoSignatureResolverFields } from './memo.signature.resolver.fields';
import { MemoSigningService } from './memo.signing.service';
import { MemoSigningSweepService } from './memo.signing.sweep.service';

@Module({
  imports: [
    EntityResolverModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    LicenseModule,
    VisualModule,
    ProfileModule,
    UserModule,
    StorageBucketModule,
    TypeOrmModule.forFeature([Memo]),
    ProfileDocumentsModule,
    CollaborationMetadataModule,
    ContentSigningModule,
    FileServiceAdapterModule,
    HttpModule,
    CollaborationClientModule,
    DocumentModule,
    KratosModule,
    UrlGeneratorModule,
  ],
  providers: [
    MemoService,
    MemoAuthorizationService,
    MemoResolverMutations,
    MemoResolverFields,
    MemoPdfRenderer,
    MemoSigningService,
    MemoSignatureResolverFields,
    MemoSigningSweepService,
    TrustGatewayClient,
  ],
  exports: [
    MemoService,
    MemoAuthorizationService,
    MemoResolverMutations,
    MemoResolverFields,
    MemoSigningService,
  ],
})
export class MemoModule {}
