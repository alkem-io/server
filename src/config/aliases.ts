import moduleAlias from 'module-alias';
import path from 'path';

const rootPath = path.resolve(__dirname, '..', '..', 'dist');
moduleAlias.addAliases({
  '@interfaces': path.join(rootPath, 'interfaces'),
  '@domain': path.join(rootPath, 'domain'),
  '@config': path.join(rootPath, 'config'),
  '@utils': path.join(rootPath, 'utils'),
  '@src': rootPath,
});
