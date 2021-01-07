import { GraphQLError } from 'graphql';
import validator from 'validator';

const uuid = (value: string) => {
  if (validator.isUUID(value)) return true;

  throw new GraphQLError('Must be in UUID format');
};

export default uuid;
