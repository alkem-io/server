import { SyntaxKind, Project, SourceFile, Node } from 'ts-morph';
import * as path from 'path';
import * as esbuild from 'esbuild'; // Import esbuild for building the library
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const originalTsConfigPath = path.resolve(__dirname, 'tsconfig.json'); // Path to YOUR project's tsconfig (needed for alias resolution)
const outputDir = path.resolve(__dirname, './temp'); // Temporary/staging dir for transformed files before final build

const cleanFiles = () => {
  console.time('cleanFiles');
  try {
    fs.rmdirSync(outputDir, { recursive: true });
  } catch (e) {}

  fs.mkdirSync(outputDir);

  const project = new Project({
    tsConfigFilePath: originalTsConfigPath,
    skipAddingFilesFromTsConfig: true, // we are adding them manually
  });

  const sourceFiles = project.addSourceFilesAtPaths('../src/**/*.entity.ts');

  let counter = 0;
  for (const sourceFile of sourceFiles) {
    counter++;
    console.log(
      `Processing [${counter}/${sourceFiles.length}] ${sourceFile.getFilePath()}...`
    );
    // remove Decorators
    sourceFile.getDescendantsOfKind(SyntaxKind.Decorator).forEach(decorator => {
      decorator.remove();
    });
    // remove implemented interfaces - we trust the class is implemented correctly
    sourceFile
      .getClasses()
      .forEach(c =>
        c.getImplements().forEach(impl => c.removeImplements(impl))
      );
    // remove unused declarations and imports
    sourceFile.fixUnusedIdentifiers();
    sourceFile.fixMissingImports();
    // fix imports
    // ...
    // save file
    const newFilePath = path.join(
      outputDir,
      `${sourceFile.getBaseNameWithoutExtension()}.temp.ts`
    );
    const newSourceFile = project.createSourceFile(
      newFilePath,
      sourceFile.getText()
    );
    fs.writeFileSync(newFilePath, newSourceFile.getText());
  }
  console.timeEnd('cleanFiles');
};

const build = async () => {
  console.log('Building with esmbuild');
  await esbuild
    .build({
      entryPoints: ['../src/**/*.entity.temp.ts'], // Entry point for the library
      entryNames: '[name]', // Name of the output file
      // bundle: true, // Bundle all dependencies
      outdir: './dist',
      platform: 'node', // Or 'browser', depending on your library's target
      format: 'esm', // Or 'esm', or 'iife'
      sourcemap: false,
    })
    .catch(() => process.exit(1));
  console.log('Build complete!');
};

const emitDeclarations = () => {
  // Generate declaration files with tsc
  console.log('Generating declaration files...');

  // We run tsc only to emit declarations into the outDir specified in tsconfig
  execSync(
    'tsc --declaration --emitDeclarationOnly --declarationDir ./dist/types ../src/domain/space/account/account.entity.temp.ts',
    {
      stdio: 'inherit',
    }
  );

  console.log('Declaration files generated!');
};
const emitDeclarations2 = async () => {
  const project = new Project({
    tsConfigFilePath: originalTsConfigPath,
    skipAddingFilesFromTsConfig: true, // we are adding them manually
  });
  project.addSourceFilesAtPaths('./temp/*.ts');

  console.log('Emitting declaration files...');
  const emitResult = await project.emit({
    // You can optionally specify emitOnlyDtsFiles to only emit declarations
    emitOnlyDtsFiles: true,
  });
  emitResult.getEmitSkipped();

  // Check for and log any diagnostics (errors or warnings) during emission
  const diagnostics = emitResult.getDiagnostics();
  if (diagnostics.length > 0) {
    console.error(
      'Emit diagnostics:',
      project.formatDiagnosticsWithColorAndContext(diagnostics)
    );
  } else {
    console.log('Declaration files emitted successfully.');
  }
};

// Data structure to store export information: Exported Name -> List of locations/types
const projectExports = new Map<
  string,
  Array<{ sourceFilePath: string; className: string }>
>();

async function processProject() {
  const project = new Project({
    tsConfigFilePath: originalTsConfigPath,
    skipAddingFilesFromTsConfig: true, // we are adding them manually
  });
  project.addSourceFilesAtPaths('./temp/*.ts');

  const sourceFiles = project.getSourceFiles();

  console.log('Step 1: Removing all imports...');
  removeAllImports(sourceFiles);
  console.log('Finished removing imports.');

  console.log('Step 2: Gathering all exports...');
  gatherAllNamedExportedClasses(sourceFiles);
  console.log(
    `Finished gathering ${projectExports.size} unique exported names.`
  );

  console.log('Step 3: Fixing missing imports...');
  await fixMissingImports(sourceFiles, project);
  console.log('Finished fixing missing imports.');

  console.log('Step 4: Saving changes...');
  await project.save();
  console.log('Changes saved.');
}

function removeAllImports(sourceFiles: SourceFile[]) {
  for (const sourceFile of sourceFiles) {
    const importDeclarations = sourceFile.getImportDeclarations();
    for (const importDeclaration of importDeclarations) {
      importDeclaration.remove();
    }
  }
}

function gatherAllNamedExportedClasses(sourceFiles: SourceFile[]) {
  for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();

    // Get all class declarations in the file
    const classes = sourceFile.getClasses();

    for (const classDeclaration of classes) {
      // Check if the class is exported and NOT a default export
      if (
        classDeclaration.isExported() &&
        !classDeclaration.isDefaultExport()
      ) {
        const className = classDeclaration.getName();

        if (className) {
          // Ensure the class has a name
          if (!projectExports.has(className)) {
            projectExports.set(className, []);
          }

          // Avoid adding duplicate entries for the exact same class export from the same file
          const existing = projectExports.get(className)!.find(
            // Comparing className and sourceFilePath for uniqueness
            exp =>
              exp.sourceFilePath === filePath && exp.className === className
          );

          if (!existing) {
            // CORRECTED: Pushing object with 'className' property and no 'isDefaultExport'
            projectExports.get(className)!.push({
              sourceFilePath: filePath,
              className, // Ensure className is included here
            });
          }
        }
      }
    }
  }
}

async function fixMissingImports(sourceFiles: SourceFile[], project: Project) {
  for (const sourceFile of sourceFiles) {
    const importingFilePath = sourceFile.getFilePath();
    const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
    // defaultImport will no longer be used in importsToAdd
    const importsToAdd = new Map<
      string,
      { moduleSpecifier: string; namedImports: Set<string> }
    >();

    for (const identifier of identifiers) {
      const identifierName = identifier.getText();

      // Get the symbol to determine if it's already declared or needs an import
      const symbol = identifier.getSymbol();

      let needsImportFromProject = false;
      if (!symbol) {
        // No symbol means it's likely undeclared, could be a missing import
        needsImportFromProject = true;
      } else {
        const declarations = symbol.getDeclarations();
        if (declarations.length > 0) {
          const declarationSourceFile = declarations[0].getSourceFile();
          // Check if the declaration is NOT in the current file and NOT in node_modules
          if (
            declarationSourceFile !== sourceFile &&
            !declarationSourceFile
              .getFilePath()
              .includes(`${path.sep}node_modules${path.sep}`)
          ) {
            // It's declared elsewhere and not in node_modules, likely needs a project import
            needsImportFromProject = true;
          }
        } else {
          // Symbol exists but no declarations? Could be a global or ambient declaration, likely doesn't need project import
        }
      }

      if (needsImportFromProject) {
        // Look for a matching named exported class in our store
        const potentialClasses = projectExports.get(identifierName);

        if (potentialClasses && potentialClasses.length > 0) {
          // Found potential sources for this class

          // Since all exports are named classes, we just need to pick one if multiple exist
          // For simplicity, take the first one found.
          const chosenClassExport = potentialClasses[0];

          if (potentialClasses.length > 1) {
            console.warn(
              `Multiple potential import sources for class '${identifierName}' in ${importingFilePath}. Picking the first found source: ${chosenClassExport.sourceFilePath}.`
            );
          }

          if (chosenClassExport) {
            const moduleSourceFile = project.getSourceFileOrThrow(
              chosenClassExport.sourceFilePath
            );
            const moduleSpecifier =
              sourceFile.getRelativePathAsModuleSpecifierTo(moduleSourceFile);

            if (!importsToAdd.has(moduleSpecifier)) {
              // defaultImport is removed here
              importsToAdd.set(moduleSpecifier, {
                moduleSpecifier,
                namedImports: new Set(),
              });
            }

            const importInfo = importsToAdd.get(moduleSpecifier)!;

            // Add as a named import, using the class name
            // Accessing className here is now correct
            importInfo.namedImports.add(chosenClassExport.className);
          } else {
            // Could not definitively choose an export for this identifier
            console.warn(
              `Could not determine best import for class '${identifierName}' in ${importingFilePath}. No suitable exported class found in gathered project exports.`
            );
          }
        } else {
          // Identifier not found in our gathered project exports
          // It might be a global, external, or genuinely undeclared variable
          const type = identifier.getType();
          // Check if the identifier's type is 'any' and it's not a known global (heuristic)
          if (type.isAny() && !isLikelyGlobal(identifierName)) {
            console.warn(
              `Identifier '${identifierName}' in ${importingFilePath} is of type 'any' and not found in project exports. Might need manual import or is a global/external not resolvable by symbol.`
            );
          }
        }
      }
    }

    // Add the gathered imports to the source file
    importsToAdd.forEach(importInfo => {
      // Only add if there are named imports
      if (importInfo.namedImports.size > 0) {
        sourceFile.addImportDeclaration({
          moduleSpecifier: importInfo.moduleSpecifier,
          namedImports: Array.from(importInfo.namedImports).map(name => ({
            name,
          })),
          // defaultImport is no longer added
        });
      }
    });
  }
}

// Basic heuristic to avoid warning about common globals
function isLikelyGlobal(identifierName: string): boolean {
  const commonGlobals = new Set([
    'console',
    'process',
    'global',
    'window',
    'document',
    'setTimeout',
    'setInterval',
    'clearTimeout',
    'clearInterval',
    '__dirname',
    '__filename',
    'module',
    'require',
    'Buffer',
    'setImmediate',
    'clearImmediate',
    'Promise',
    'Array',
    'Object',
    'String',
    'Number',
    'Boolean',
    'Date',
    'RegExp',
    'Map',
    'Set',
    'WeakMap',
    'WeakSet',
    'JSON',
    'Math',
    'Reflect',
    'Proxy',
    'Symbol',
    'Error',
    'TypeError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'URIError',
    'EvalError',
    'isNaN',
    'isFinite',
    'parseFloat',
    'parseInt',
    'decodeURI',
    'decodeURIComponent',
    'encodeURI',
    'encodeURIComponent',
    'escape',
    'unescape',
    'Infinity',
    'NaN',
    'undefined',
    // Add more common globals as needed
  ]);
  return commonGlobals.has(identifierName);
}

cleanFiles();
// build();
// emitDeclarations();
// emitDeclarations2();
processProject();
