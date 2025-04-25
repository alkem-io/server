import { Project } from 'ts-morph';
import * as fs from 'fs-extra';
import * as path from 'path';

const project = new Project({
  tsConfigFilePath: './tsconfig.build.json', // adjust to your tsconfig location
});

const entityFiles = project
  .getSourceFiles()
  .filter(file => file.getFilePath().endsWith('.entity.ts'));

// const outputDir = 'output';
// fs.ensureDirSync(outputDir);

entityFiles.forEach(file => {
  file.getClasses().forEach(classDeclaration => {
    // Remove decorators on the class itself
    classDeclaration.getDecorators().forEach(decorator => decorator.remove());
    const props = classDeclaration.getInstanceProperties();
    props.forEach(prop => {
      prop.getDecorators().forEach(decorator => decorator.remove());
    });

    const newFilePath = path.join(
      file.getDirectoryPath(),
      `${file.getBaseNameWithoutExtension()}.temp.ts`
    );
    const newSourceFile = project.createSourceFile(newFilePath, file.getText());
    fs.writeFileSync(newFilePath, newSourceFile.getText());
  });
});
