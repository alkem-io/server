import { readFileSync } from 'fs';
import path, { join } from 'path';
import * as dotenv from 'dotenv';
import YAML from 'yaml';

const YAML_CONFIG_FILENAME = 'cherrytwist.yml';

export default () => {
  const rawYaml = readFileSync(
    join(__dirname, '../../', YAML_CONFIG_FILENAME),
    'utf8'
  );

  const doc = YAML.parseDocument(rawYaml);
  const envConfig = getEnvConfig();

  YAML.visit(doc, {
    Scalar(key, node) {
      if (node.type === 'PLAIN') {
        node.value = buildYamlNodeValue(node.value, envConfig);
      }
    },
  });

  const config = doc.toJSON() as Record<string, any>;
  return config;
};

function getEnvConfig() {
  const filePath = '.env';
  const envFile = path.resolve(__dirname, '../../', filePath);
  const envConfig = dotenv.parse(readFileSync(envFile));

  return envConfig;
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
  }

  return updatedNodeValue;
}
