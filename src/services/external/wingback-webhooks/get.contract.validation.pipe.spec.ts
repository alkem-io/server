import { BadRequestHttpException } from '@common/exceptions/http';
import { getContractValidationPipe } from './get.contract.validation.pipe';
import { WingbackContractPayload } from './types';

describe('Contract ValidationPipe', () => {
  const pipe = getContractValidationPipe();

  it('should validate and pass valid data', async () => {
    const dto: WingbackContractPayload = {
      id: 'Cont_a8032d52-0288-4ab0-95f5-fdcc03120f03',
    };
    const result = await pipe.transform(dto, {
      type: 'body',
      metatype: WingbackContractPayload,
    });
    expect(result).toEqual(dto);
  });

  it('should throw an error for invalid data', async () => {
    const dto: WingbackContractPayload = { id: 'Cont_xx' };
    await expect(
      pipe.transform(dto, {
        type: 'body',
        metatype: WingbackContractPayload,
      })
    ).rejects.toThrow(BadRequestHttpException);
  });
});
