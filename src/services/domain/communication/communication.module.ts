import { UserModule } from '@domain/community/user/user.module';
import { forwardRef, Module } from '@nestjs/common';
import { MatrixCommunicationModule } from '@src/services/platform/matrix/communication/communication.matrix.module';
import { CommunicationService } from './communication.service';

@Module({
  imports: [MatrixCommunicationModule, forwardRef(() => UserModule)],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}
