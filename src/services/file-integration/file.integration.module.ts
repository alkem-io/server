import { Module } from '@nestjs/common';
import { FileIntegrationController } from '@services/file-integration/file.integration.controller';
import { FileIntegrationService } from '@services/file-integration/file.integration.service';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { StorageServiceProvider } from '@services/adapters/storage/storage.service.provider';
import { DocumentModule } from '@domain/storage/document/document.module';

@Module({
  imports: [AuthenticationModule, AuthorizationModule, DocumentModule],
  providers: [FileIntegrationService, StorageServiceProvider],
  exports: [FileIntegrationService],
  controllers: [FileIntegrationController],
})
export class FileIntegrationModule {}
