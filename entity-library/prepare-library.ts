// scripts/prepare-library.ts
import {
  Project,
  SyntaxKind,
  Decorator,
  ImportDeclaration,
  SourceFile,
} from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs-extra'; // Use fs-extra for easier file operations

// --- Configuration ---
const originalTsConfigPath = path.resolve(__dirname, '../tsconfig.build.json'); // Path to YOUR project's tsconfig (needed for alias resolution)
const sourceDir = path.resolve(__dirname, '../src'); // Your source code directory
const outputDir = path.resolve(__dirname, './temp'); // Temporary/staging dir for transformed files before final build
// --- End Configuration ---

async function transformSourceFiles() {
  console.log('Initializing TypeScript project...');
  const project = new Project({
    tsConfigFilePath: originalTsConfigPath,
    skipAddingFilesFromTsConfig: true, // Skip adding files from tsconfig; added later by addSourceFilesAtPaths
    // Optionally add compiler options here if needed, like skipping lib check
    // compilerOptions: { skipLibCheck: true }
  });

  // Ensure the output directory exists and is clean
  console.log(`Cleaning output directory: ${outputDir}`);
  await fs.emptyDir(outputDir);

  console.log('Finding source files...');
  const sourceFiles = project.addSourceFilesAtPaths('**/*.entity.ts'); // Add all .ts files in the project
  // .filter(file => file.getFilePath().endsWith('.entity.ts')); // Adjust if you only want specific files/patterns project.addSourceFilesAtPaths(...)

  console.log(`Found ${sourceFiles.length} source files. Processing...`);

  for (const sourceFile of sourceFiles) {
    const originalFilePath = path.normalize(sourceFile.getFilePath());
    // Skip processing files outside the intended source directory (like node_modules)
    if (!originalFilePath.startsWith(sourceDir)) {
      continue;
    }

    console.log(
      `Processing: ${path.relative(process.cwd(), originalFilePath)}`
    );

    let changed = false;

    // 1. Remove Decorators
    sourceFile.getDescendantsOfKind(SyntaxKind.Decorator).forEach(decorator => {
      decorator.remove();
      changed = true;
    });

    // 2. Fix Imports
    sourceFile.getImportDeclarations().forEach(importDecl => {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();

      // Handle Path Alias Imports ('@/...')
      if (moduleSpecifier.startsWith('@/')) {
        try {
          const resolvedSourceFile = importDecl.getModuleSpecifierSourceFile();
          if (resolvedSourceFile) {
            const resolvedPath = resolvedSourceFile.getFilePath();
            // Calculate relative path from the *current* file's directory to the *resolved* file
            const currentFileDir = path.dirname(originalFilePath);
            let relativePath = path.relative(currentFileDir, resolvedPath);

            // Normalize path: remove .ts/.tsx extension, ensure './' or '../', use forward slashes
            relativePath = relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
            if (!relativePath.startsWith('.')) {
              relativePath = './' + relativePath;
            }
            relativePath = relativePath.split(path.sep).join('/'); // Ensure forward slashes

            console.log(
              `Rewriting import alias: '${moduleSpecifier}' -> '${relativePath}'`
            );
            importDecl.setModuleSpecifier(relativePath);
            changed = true;
          } else {
            console.warn(
              `  ⚠️ Could not resolve aliased import '${moduleSpecifier}' in ${originalFilePath}. Leaving it unchanged.`
            );
            // Decide how to handle unresolved aliases: error, warn, leave as is?
          }
        } catch (error) {
          console.warn(
            `  ⚠️ Error resolving import alias '${moduleSpecifier}' in ${originalFilePath}:`,
            error
          );
        }
      }
      // Optional: Normalize existing relative paths (ensure forward slashes)
      else if (moduleSpecifier.startsWith('.')) {
        const normalizedPath = moduleSpecifier.split(path.sep).join('/');
        if (normalizedPath !== moduleSpecifier) {
          console.log(
            `  Normalizing relative import: '${moduleSpecifier}' -> '${normalizedPath}'`
          );
          importDecl.setModuleSpecifier(normalizedPath);
          changed = true;
        }
      }
    });

    // Save the transformed file to the output directory
    const relativePath = path.relative(sourceDir, originalFilePath);
    const outputPath = path.resolve(outputDir, relativePath);

    // Ensure the target directory exists
    await fs.ensureDir(path.dirname(outputPath));

    if (changed) {
      // Get the modified source text
      const newContent = sourceFile.getFullText();

      // Write the modified text to the new file path
      await fs.writeFile(outputPath, newContent, 'utf8'); // Use fs.writeFile

      console.log(
        `  Saved transformed file to: ${path.relative(process.cwd(), outputPath)}`
      );
    } else {
      // If no changes, just copy the original file
      await fs.copyFile(originalFilePath, outputPath);
      console.log(
        `  Copied unchanged file to: ${path.relative(process.cwd(), outputPath)}`
      );
    }
  }

  console.log('Transformation script finished.');
}

transformSourceFiles().catch(error => {
  console.error('Error during transformation:', error);
  process.exit(1);
});
