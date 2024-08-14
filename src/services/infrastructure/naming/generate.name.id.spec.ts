import { generateNameId } from './generate.name.id';
import { generateTestData } from './generate.name.id.test.data';

describe('Generate name ID', () => {
  beforeAll(() => {
    // unrandomize the characters when extending the nameID when min length is not met
    jest.spyOn(Math, 'random').mockReturnValue(0.1); // 0.1 * 36 = 3.6 -> 3 -> d
  });
  afterAll(() => {
    jest.clearAllMocks();
  });
  const testData = generateTestData('d');

  it.each(testData)('$input', ({ input, output: expected }) => {
    const received = generateNameId(input);
    expect(received).toEqual(expected);
  });
});
