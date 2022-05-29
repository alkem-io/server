import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateBaseModule } from '../template-base/template.base.module';
import { AspectTemplate } from './aspect.template.entity';
import { AspectTemplateService } from './aspect.template.service';

@Module({
  imports: [
    AuthorizationModule,
    TemplateBaseModule,
    TypeOrmModule.forFeature([AspectTemplate]),
  ],
  providers: [AspectTemplateService],
  exports: [AspectTemplateService],
})
export class AspectTemplateModule {}
