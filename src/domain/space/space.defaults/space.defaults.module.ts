import { Module } from '@nestjs/common';
import { SpaceDefaultsService } from './space.defaults.service';
import { TemplateModule } from '@domain/template/template/template.module';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { PlatformModule } from '@platform/platform/platform.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';
import { CollaborationModule } from '@domain/collaboration/collaboration/collaboration.module';

@Module({
  imports: [
    TemplateModule,
    TemplatesManagerModule,
    InputCreatorModule,
    CollaborationModule,
    PlatformModule,
  ],
  providers: [SpaceDefaultsService],
  exports: [SpaceDefaultsService],
})
export class SpaceDefaultsModule {}
