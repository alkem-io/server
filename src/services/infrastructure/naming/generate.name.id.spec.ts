import { generateNameId } from './generate.name.id';
import { generateTestData } from './generate.name.id.test.data';

const timestamp = new Date().getTime().toString();

describe.only('Generate name ID', () => {
  beforeAll(() => {
    jest.spyOn(Date.prototype, 'getTime').mockReturnValue(Number(timestamp));
  });
  const testData = generateTestData(timestamp);

  it.each(testData)('$input', ({ input, output }) => {
    const result = generateNameId(input);
    expect(result).toEqual(output);
  });
});
