import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { Module } from '@nestjs/common';
import { StorageServiceProvider } from '@services/adapters/storage/storage.service.provider';
import { FileIntegrationController } from '@services/file-integration/file.integration.controller';
import { FileIntegrationService } from '@services/file-integration/file.integration.service';

@Module({
  imports: [AuthenticationModule, AuthorizationModule, DocumentModule],
  providers: [FileIntegrationService, StorageServiceProvider],
  exports: [FileIntegrationService],
  controllers: [FileIntegrationController],
})
export class FileIntegrationModule {}
