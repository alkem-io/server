import { Project, ts } from 'ts-morph';
import * as fs from 'fs-extra';
import * as path from 'path';

const project = new Project({
  tsConfigFilePath: './tsconfig.build.json', // adjust to your tsconfig location
});

const entityFiles = project
  .getSourceFiles()
  .filter(file => file.getFilePath().endsWith('.entity.ts'));

const outputDir = 'output';

fs.ensureDirSync(outputDir);

entityFiles.forEach(file => {
  const classDeclarations = file.getClasses();

  classDeclarations.forEach(classDeclaration => {
    const className = classDeclaration.getName();
    const filePath = path.join(outputDir, `${className}.ts`);
    const props = classDeclaration.getInstanceProperties();
    props.forEach(prop => {
      prop.getDecorators().forEach(decorator => decorator.remove());
    });
    // Remove decorators on the class itself
    classDeclaration.getDecorators().forEach(decorator => decorator.remove());

    const newSourceFile = project.createSourceFile(filePath, file.getText());

    fs.writeFileSync(filePath, newSourceFile.getText());
  });
});
