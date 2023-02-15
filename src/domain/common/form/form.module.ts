import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Form } from './form.entity';
import { FormResolverFields } from './form.resolver.fields';
import { FormService } from './form.service';

@Module({
  imports: [TypeOrmModule.forFeature([Form])],
  providers: [FormService, FormResolverFields],
  exports: [FormService],
})
export class FormModule {}
