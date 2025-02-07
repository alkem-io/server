const NAMEID_MAX_LENGTH = 25;
const NAMEID_MIN_LENGTH = 5;

// NOTE: the library that replaces diacritics, replaces ß with a single S, instead of double S
export const generateTestData: (
  charSeed: string
) => { input: string; output: string }[] = (charSeed: string) => [
  { input: 'ExampleName', output: 'examplename' },
  {
    input: 'a'.repeat(NAMEID_MAX_LENGTH + 10),
    output: 'a'.repeat(NAMEID_MAX_LENGTH),
  },
  { input: 'naïve', output: 'naive' },
  { input: 'name@123!', output: 'name123' },
  { input: 'NameWithUpperCase', output: 'namewithuppercase' },
  // min length
  { input: '', output: charSeed.repeat(NAMEID_MIN_LENGTH) },
  { input: '1', output: '1' + charSeed.repeat(NAMEID_MIN_LENGTH - 1) },
  { input: '12', output: '12' + charSeed.repeat(NAMEID_MIN_LENGTH - 2) },
  { input: '123', output: '123' + charSeed.repeat(NAMEID_MIN_LENGTH - 3) },
  { input: '1234', output: '1234' + charSeed.repeat(NAMEID_MIN_LENGTH - 4) },
  // special chars
  {
    input: '!@#$%^&*()_+`}{[]\\|\'"/.,?><',
    output: charSeed.repeat(NAMEID_MIN_LENGTH),
  },
  //
  {
    input: '  leading and trailing spaces  ',
    output: 'leadingandtrailingspaces',
  },
  { input: 'multiple   spaces', output: 'multiplespaces' },
  { input: '1234567890', output: '1234567890' },
  { input: 'UPPERCASE', output: 'uppercase' },
  { input: 'MiXeDcAsE', output: 'mixedcase' },
  { input: 'name_with_underscores', output: 'namewithunderscores' },
  { input: 'name.with.dots', output: 'namewithdots' },
  { input: 'name/with/slashes', output: 'namewithslashes' },
  { input: 'name\\with\\backslashes', output: 'namewithbackslashes' },
  { input: 'name:with:colons', output: 'namewithcolons' },
  { input: 'name;with;semicolons', output: 'namewithsemicolons' },
  { input: 'name,with,commas', output: 'namewithcommas' },
  { input: 'name?with?questionmarks', output: 'namewithquestionmarks' },
  { input: 'name!with!exclamations', output: 'namewithexclamations' },
  { input: 'name@with@atsymbols', output: 'namewithatsymbols' },
  { input: 'name#with#hashes', output: 'namewithhashes' },
  { input: 'name$with$dollars', output: 'namewithdollars' },
  { input: 'name%with%percents', output: 'namewithpercents' },
  { input: 'name^with^carets', output: 'namewithcarets' },
  { input: 'name&with&amps', output: 'namewithamps' },
  { input: 'name*with*asterisks', output: 'namewithasterisks' },
  { input: 'name(with(parentheses)', output: 'namewithparentheses' },
  { input: 'name)with)parentheses', output: 'namewithparentheses' },
  { input: 'name+with+pluses', output: 'namewithpluses' },
  { input: 'name=with=equals', output: 'namewithequals' },
  { input: 'name{with{braces', output: 'namewithbraces' },
  { input: 'name}with}braces', output: 'namewithbraces' },
  { input: 'name[with[brackets', output: 'namewithbrackets' },
  { input: 'name]with]brackets', output: 'namewithbrackets' },
  { input: 'name|with|pipes', output: 'namewithpipes' },
  { input: 'name~with~tildes', output: 'namewithtildes' },
  { input: 'name`with`backticks', output: 'namewithbackticks' },
  { input: 'name"with"quotes', output: 'namewithquotes' },
  { input: '"name\'with\'singlequotes"', output: 'namewithsinglequotes' },
  { input: 'äöüß-', output: 'aous-' },
  { input: 'ÄÖÜd-', output: 'aoud-' },
  { input: 'façade', output: 'facade' },
  { input: 'crème brûlée', output: 'cremebrulee' },
  { input: 'niño-', output: 'nino-' },
  { input: 'jalapeño', output: 'jalapeno' },
  { input: 'français', output: 'francais' },
  { input: 'smörgåsbord', output: 'smorgasbord' },
  { input: 'über-', output: 'uber-' },
  { input: 'mañana', output: 'manana' },
  { input: 'élève', output: 'eleve' },
  { input: 'coöperate', output: 'cooperate' },
  { input: 'naïve', output: 'naive' },
  { input: 'doppelgänger', output: 'doppelganger' },
  { input: 'straße', output: 'strase' },
  { input: 'Тест', output: charSeed.repeat(NAMEID_MIN_LENGTH) },
  { input: 'Тест и малък тест', output: charSeed.repeat(NAMEID_MIN_LENGTH) },
  { input: 'Тест и test-', output: 'test-' },
];
