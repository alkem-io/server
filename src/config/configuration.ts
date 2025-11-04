import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';

const YAML_CONFIG_FILENAME = 'alkemio.yml';

export default () => {
  const configFilePath = resolveConfigFilePath();
  const rawYaml = readFileSync(configFilePath, 'utf8');

  const doc = YAML.parseDocument(rawYaml);
  const envConfig = process.env;

  YAML.visit(doc, {
    Scalar(_key, node) {
      if (node.type === 'PLAIN') {
        node.value = buildYamlNodeValue(node.value, envConfig);
      }
    },
  });

  const config = doc.toJSON() as Record<string, any>;
  return config;
};

function resolveConfigFilePath() {
  const candidatePaths = [
    process.env.ALKEMIO_CONFIG_PATH,
    join(process.cwd(), YAML_CONFIG_FILENAME),
    join(__dirname, '../../', YAML_CONFIG_FILENAME),
  ].filter(Boolean) as string[];

  const matchedPath = candidatePaths.find(path => existsSync(path));

  if (!matchedPath) {
    throw new Error(
      `Unable to locate ${YAML_CONFIG_FILENAME}. Checked: ${candidatePaths.join(', ')}`
    );
  }

  return matchedPath;
}

function buildYamlNodeValue(nodeValue: any, envConfig: any) {
  let updatedNodeValue = nodeValue;
  const key = `${nodeValue}`;
  const regex = '\\${(.*)}:?(.*)';
  const found = key.match(regex);
  if (found) {
    const envVariableKey = found[1];
    const envVariableDefaultValue = found[2];

    updatedNodeValue = envConfig[envVariableKey] ?? envVariableDefaultValue;

    if (updatedNodeValue.toLowerCase() === 'true') return true;
    if (updatedNodeValue.toLowerCase() === 'false') return false;
    if (!isNaN(updatedNodeValue)) return Number(updatedNodeValue);
  }

  return updatedNodeValue;
}
