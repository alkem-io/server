import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateBaseModule } from '../template-base/template.base.module';
import { CanvasTemplate } from './canvas.template.entity';
import { CanvasTemplateService } from './canvas.template.service';

@Module({
  imports: [
    AuthorizationModule,
    TemplateBaseModule,
    TypeOrmModule.forFeature([CanvasTemplate]),
  ],
  providers: [CanvasTemplateService],
  exports: [CanvasTemplateService],
})
export class CanvasTemplateModule {}
