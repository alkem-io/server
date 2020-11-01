import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { Template } from './template.entity';
import { TemplateResolver } from './template.resolver';
import { TemplateService } from './template.service';

@Module({
  imports: [UserModule, TypeOrmModule.forFeature([Template])],
  providers: [TemplateResolver, TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}
