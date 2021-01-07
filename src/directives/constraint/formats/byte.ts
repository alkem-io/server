import { GraphQLError } from 'graphql';
import validator from 'validator';

const byte = (value: string) => {
  if (validator.isBase64(value)) return true;

  throw new GraphQLError('Must be in byte format');
};
export default byte;
