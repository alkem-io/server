import { AuthorizationModule } from '@core/authorization/authorization.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { ImageCompressionService } from './image.compression.service';
import { ImageConversionService } from './image.conversion.service';
import { Visual } from './visual.entity';
import { VisualResolverMutations } from './visual.resolver.mutations';
import { VisualService } from './visual.service';
import { VisualAuthorizationService } from './visual.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    DocumentModule,
    StorageBucketModule,
    TypeOrmModule.forFeature([Visual]),
  ],
  providers: [
    VisualResolverMutations,
    VisualService,
    VisualAuthorizationService,
    ImageConversionService,
    ImageCompressionService,
  ],
  exports: [
    VisualService,
    VisualAuthorizationService,
    ImageConversionService,
    ImageCompressionService,
  ],
})
export class VisualModule {}
