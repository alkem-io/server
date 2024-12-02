export const compareEnums = (enum1: any, enum2: any): boolean => {
  const keys1 = Object.keys(enum1);
  const keys2 = Object.keys(enum2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (enum1[key] !== enum2[key]) {
      return false;
    }
  }

  return true;
};
