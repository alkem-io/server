import { MATRIX_ADAPTER_SERVICE } from '@common/constants';
import { ValueProvider } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PublicPart } from '../utils/public-part';

export const MockMatrixAdapterService: ValueProvider<PublicPart<ClientProxy>> =
  {
    provide: MATRIX_ADAPTER_SERVICE,
    useValue: {
      send: jest.fn(),
      emit: jest.fn(),
    },
  };
