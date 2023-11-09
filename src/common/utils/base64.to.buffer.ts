const base64Regex = /(?<header>data:image\/\w+;base64,)(?<value>.+)/;
type Groups = { header?: string; value?: string };

export const base64ToBuffer = (base64Str: string) => {
  const regex = base64Regex.exec(base64Str);

  if (!regex) {
    return undefined;
  }

  const base64Value = (regex.groups as Groups)?.value;

  if (!base64Value) {
    return undefined;
  }

  return Buffer.from(base64Value, 'base64');
};
