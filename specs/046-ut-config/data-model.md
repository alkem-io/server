# Data Model: src/config Classes and Dependencies

**Created**: 2026-03-12

## Class/Entity Mapping

### ConfigUtils (config.utils.ts)
- **Type**: Static utility class
- **Dependencies**: None
- **Methods**: `parseHMSString(hms: string): number | undefined`

### Configuration Factory (configuration.ts)
- **Type**: Factory function (default export)
- **Dependencies**: `fs` (readFileSync, existsSync), `path` (join), `yaml` (parseDocument, visit), `process.env`
- **Internal functions**:
  - `resolveConfigFilePath()`: Finds YAML config file
  - `buildYamlNodeValue(nodeValue, envConfig)`: Substitutes env vars in YAML values

### fixUUIDColumnType (fix.uuid.column.type.ts)
- **Type**: Function
- **Dependencies**: TypeORM `Driver` interface
- **Input**: `Driver` instance
- **Output**: `DriverWithUUIDFixed` (Driver with patched `normalizeType`)
- **Custom type**: `DriverWithUUIDFixed = Driver & { oldNormalizeType: Driver['normalizeType'] }`

### WinstonConfigService (winston.config.ts)
- **Type**: NestJS Injectable service
- **Dependencies**: `ConfigService<AlkemioConfig, true>`
- **Methods**: `createWinstonModuleOptions(): Promise<{ transports: any[] }>`
- **Config paths read**:
  - `monitoring.logging.console_logging_enabled`
  - `monitoring.logging.json`
  - `monitoring.logging.level`
  - `monitoring.logging.context_to_file` (enabled, filename, context)
