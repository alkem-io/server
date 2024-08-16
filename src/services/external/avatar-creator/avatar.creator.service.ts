import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class AvatarCreatorService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  generateRandomAvatarURL(firstName: string, lastName?: string): string {
    const randomColor = Math.floor(Math.random() * 16777215).toString(16);
    if (!lastName) {
      return `https://eu.ui-avatars.com/api/?name=${firstName}&background=${randomColor}&color=ffffff`;
    }
    return `https://eu.ui-avatars.com/api/?name=${firstName}+${lastName}&background=${randomColor}&color=ffffff`;
  }
}
