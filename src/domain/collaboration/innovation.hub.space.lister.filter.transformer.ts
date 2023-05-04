import { ValueTransformer } from 'typeorm';

const VALUE_SEPARATOR = ',';

export class InnovationHubSpaceListerFilterTransformer
  implements ValueTransformer
{
  from(value: string): string[] {
    return value.split(VALUE_SEPARATOR);
  }

  to(value: string[]): string {
    return value.join(VALUE_SEPARATOR);
  }
}