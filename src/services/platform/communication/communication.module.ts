import { UserModule } from '@domain/community/user/user.module';
import { forwardRef, Module } from '@nestjs/common';
import { MatrixWrapperModule } from '@src/services/platform/matrix/wrapper/matrix.wrapper.module';
import { CommunicationService } from './communication.service';

@Module({
  imports: [MatrixWrapperModule, forwardRef(() => UserModule)],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
