import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AspectTemplate } from './aspect.template.entity';
import { AspectTemplateService } from './aspect.template.service';

@Module({
  imports: [AuthorizationModule, TypeOrmModule.forFeature([AspectTemplate])],
  providers: [AspectTemplateService],
  exports: [AspectTemplateService],
})
export class AspectTemplateModule {}
