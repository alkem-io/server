import moduleAlias from 'module-alias';
import path from 'path';

const rootPath = path.resolve(__dirname, '..', '..', 'dist');
const rootServicesPath = path.join(rootPath, 'services');
const rootCorePath = path.join(rootPath, 'core');
const rootCommonPath = path.join(rootPath, 'common');
moduleAlias.addAliases({
  '@interfaces': path.join(rootCommonPath, 'interfaces'),
  '@constants': path.join(rootCommonPath, 'constants'),
  '@domain': path.join(rootPath, 'domain'),
  '@common': path.join(rootCommonPath),
  '@core': path.join(rootCorePath),
  '@config': path.join(rootCorePath, 'config'),
  '@platform': path.join(rootCorePath, 'platform'),
  '@library': path.join(rootCorePath, 'library'),
  '@templates': path.join(rootServicesPath, 'configuration', 'templates'),
  '@src': rootPath,
});
