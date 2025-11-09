/**
 * Frontend API + Types exporter
 * --------------------------------
 * Generates service wrappers and consolidated type definitions for FE consumption.
 * Usage: npm run export:fe
 * Output: ./fe-export/api/services/*.ts and ./fe-export/types/index.ts
 *
 * Strategy (initial version):
 *  - Parse enums in src/enums/*.enum.ts
 *  - Parse entities & DTOs (Create|Update) for categories, products, orders.
 *  - Generate BaseEntity interface.
 *  - Generate REST service wrappers (getAll, getById, create, update, remove) for modules following conventional CRUD.
 *
 * Notes:
 *  - This is a heuristic export; if controllers diverge from standard REST it may omit endpoints.
 *  - Extend MODULES array or enhance parsing logic as new modules mature.
 *  - Assumes apiClient exists in FE at path "@/api/coffeeApiClient" and types consumed via alias "#/coffee"; adjust if needed via TEMPLATE CONFIG.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

// Configuration
const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const EXPORT_ROOT = path.join(ROOT, 'fe-export');
const SERVICES_DIR = path.join(EXPORT_ROOT, 'api', 'services');
const TYPES_DIR = path.join(EXPORT_ROOT, 'types');

// Module configuration (extend as needed)
// name: logical name used in CLI selection
// basePath: REST base path
// entities: all entity class names inside the folder to export as interfaces
// extraEntities: entity classes in same folder that belong logically to the module (e.g. OrderDetail)
interface ModuleConfig { name: string; basePath: string; entities: string[]; extraEntities?: string[]; dtoPrefix?: string }
const MODULES: ModuleConfig[] = [
  { name: 'category', basePath: '/categories', entities: ['Category'], dtoPrefix: 'Category' },
  { name: 'product', basePath: '/products', entities: ['Product'], dtoPrefix: 'Product' },
  { name: 'order', basePath: '/orders', entities: ['Order'], extraEntities: ['OrderDetail'], dtoPrefix: 'Order' },
];

// CLI selection: npm run export:fe -- product,category
const ARGV = process.argv.slice(2).join(' ').split(/[\s,]+/).map(a => a.trim()).filter(Boolean);
const AVAILABLE = new Map(MODULES.map(m => [m.name, m] as const));
const SELECTED: ModuleConfig[] = (ARGV.length > 0 ? ARGV : []).map(n => AVAILABLE.get(n)!).filter(Boolean);

interface ParsedEnum { name: string; members: string[]; }
interface ParsedProperty { name: string; type: string; optional: boolean; }
interface ParsedInterface { name: string; properties: ParsedProperty[]; }

const ensureDir = (dir: string) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

function parseSourceFile(filePath: string): ts.SourceFile | null {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
}

function collectEnums(): ParsedEnum[] {
  const enumDir = path.join(SRC, 'enums');
  if (!fs.existsSync(enumDir)) return [];
  const files = fs.readdirSync(enumDir).filter(f => f.endsWith('.ts'));
  const enums: ParsedEnum[] = [];
  for (const file of files) {
    const sf = parseSourceFile(path.join(enumDir, file));
    if (!sf) continue;
    sf.forEachChild(node => {
      if (ts.isEnumDeclaration(node) && node.name) {
        const name = node.name.text;
        const members = node.members.map(m => m.name.getText(sf));
        enums.push({ name, members });
      }
    });
  }
  return enums;
}

function extractClassAsInterface(sf: ts.SourceFile, className: string, interfaceName: string): ParsedInterface | null {
  let found: ts.ClassDeclaration | undefined;
  sf.forEachChild(node => { if (ts.isClassDeclaration(node) && node.name?.text === className) found = node; });
  if (!found) return null;
  const properties: ParsedProperty[] = [];
  for (const member of found.members) {
    if (ts.isPropertyDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
      const name = member.name.text;
      const type = member.type ? member.type.getText(sf) : 'any';
  const optional = !!member.questionToken; // decorator-based optional detection skipped for simplicity
      properties.push({ name, type, optional });
    }
  }
  return { name: interfaceName, properties };
}

function parseAllEntities(moduleFolder: string): ParsedInterface[] {
  const entityPath = path.join(SRC, moduleFolder, 'entities');
  if (!fs.existsSync(entityPath)) return [];
  const files = fs.readdirSync(entityPath).filter(f => f.endsWith('.ts'));
  const out: ParsedInterface[] = [];
  for (const file of files) {
    const sf = parseSourceFile(path.join(entityPath, file));
    if (!sf) continue;
    // Nếu file chỉ có một class, parse luôn
    let foundClass = false;
    sf.forEachChild(node => {
      if (ts.isClassDeclaration(node) && node.name?.text) {
        foundClass = true;
        const n = node.name.text;
        const parsed = extractClassAsInterface(sf, n, n);
        if (parsed) out.push(parsed);
      }
    });
    // Nếu không tìm thấy class qua AST, thử parse thủ công bằng regex (phòng trường hợp AST lỗi)
    if (!foundClass) {
      const content = fs.readFileSync(path.join(entityPath, file), 'utf8');
      const match = content.match(/export class (\w+)/);
      if (match) {
        const n = match[1];
        const parsed = extractClassAsInterface(sf, n, n);
        if (parsed) out.push(parsed);
      }
    }
  }
  return out;
}

function parseDtos(module: string, dtoPrefix: string): ParsedInterface[] {
  const dtoPath = path.join(SRC, module, 'dto');
  if (!fs.existsSync(dtoPath)) return [];
  const files = fs.readdirSync(dtoPath).filter(f => f.endsWith('.ts'));
  const out: ParsedInterface[] = [];
  for (const file of files) {
    const sf = parseSourceFile(path.join(dtoPath, file));
    if (!sf) continue;
    if (file.startsWith('create-')) {
      const className = `Create${dtoPrefix}Dto`;
      const ifaceName = `Create${dtoPrefix}Dto`;
      const parsed = extractClassAsInterface(sf, className, ifaceName);
      if (parsed) out.push(parsed);
    } else if (file.startsWith('update-')) {
      const className = `Update${dtoPrefix}Dto`;
      const ifaceName = `Update${dtoPrefix}Dto`;
      const parsed = extractClassAsInterface(sf, className, ifaceName);
      if (parsed) out.push(parsed);
    }
  }
  return out;
}

function tsTypeToInterfaceField(p: ParsedProperty): string {
  // map TypeORM/enum references simplistically; keep as-is if already primitive or known
  let t = p.type;
  if (t === 'Date') t = 'string | Date';
  // Remove readonly modifiers or decorators
  t = t.replace(/Readonly</g, '');
  return `  ${p.name}${p.optional ? '?' : ''}: ${t};`;
}

function buildInterfaceCode(iface: ParsedInterface): string {
  const props = iface.properties.length > 0 ? iface.properties.map(tsTypeToInterfaceField).join('\n') : '';
  return `export interface ${iface.name} extends BaseEntity {\n${props}\n}`;
}

function buildDtoCode(iface: ParsedInterface): string {
  // DTOs do not extend BaseEntity
  const props = iface.properties.length > 0 ? iface.properties.map(tsTypeToInterfaceField).join('\n') : '';
  return `export interface ${iface.name} {\n${props}\n}`;
}

function writeBaseTypes() {
  ensureDir(TYPES_DIR);
  const enumDefs = collectEnums();
  const lines: string[] = [];
  lines.push('// AUTO-GENERATED BASE TYPES (do not edit manually)');
  lines.push('// Regenerate: npm run export:fe -- <modules>');
  lines.push('');
  lines.push('export interface BaseEntity {');
  lines.push('  id: number;');
  lines.push('  createdAt: string | Date;');
  lines.push('  updatedAt: string | Date;');
  lines.push('  createdBy?: number | null;');
  lines.push('  updatedBy?: number | null;');
  lines.push('  deletedAt?: string | Date | null;');
  lines.push('}');
  lines.push('');
  for (const e of enumDefs) {
    lines.push(`export enum ${e.name} {`);
    for (const m of e.members) {
      lines.push(`  ${m} = "${m.toLowerCase()}",`);
    }
    lines.push('}');
    lines.push('');
  }
  fs.writeFileSync(path.join(TYPES_DIR, 'base.ts'), lines.join('\n'), 'utf8');
}

function writeModuleTypes(mod: ModuleConfig) {
  const folder = mod.name + 's';
  const allEntities = parseAllEntities(folder);
  const targetEntities = allEntities;
  const dtos = parseDtos(folder, mod.dtoPrefix ?? mod.entities[0]);
  const lines: string[] = [];
  lines.push(`// AUTO-GENERATED TYPES FOR MODULE: ${mod.name}`);
  lines.push(`import type { BaseEntity${''} } from './base';`);
  lines.push('');
  for (const ent of targetEntities) {
    lines.push(buildInterfaceCode(ent), '');
  }
  for (const d of dtos) {
    lines.push(buildDtoCode(d), '');
  }
  const outPath = path.join(TYPES_DIR, `${mod.name}.ts`);
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  return outPath;
}

function generateService(mod: ModuleConfig) {
  ensureDir(SERVICES_DIR);
  const primary = mod.entities[0];
  const dtoPrefix = mod.dtoPrefix ?? primary;
  const fileName = `${mod.name}Service.ts`;
  const code = `import apiClient from "@/api/coffeeApiClient";\nimport type { ${primary}, Create${dtoPrefix}Dto, Update${dtoPrefix}Dto } from "#/coffee";\n\nconst base = "${mod.basePath}";\n\nexport const ${mod.name}Service = {\n  getAll(): Promise<${primary}[]> {\n    return apiClient.get({ url: base });\n  },\n  getById(id: number): Promise<${primary}> {\n    return apiClient.get({ url: base + '/' + id });\n  },\n  create(data: Create${dtoPrefix}Dto): Promise<${primary}> {\n    return apiClient.post({ url: base, data });\n  },\n  update(id: number, data: Update${dtoPrefix}Dto): Promise<${primary}> {\n    return apiClient.patch({ url: base + '/' + id, data });\n  },\n  remove(id: number): Promise<${primary}> {\n    return apiClient.delete({ url: base + '/' + id });\n  },\n};\n\nexport default ${mod.name}Service;\n`;
  const target = path.join(SERVICES_DIR, fileName);
  fs.writeFileSync(target, code, 'utf8');
  return target;
}

function main() {
  if (SELECTED.length === 0) {
    console.error('[EXPORT-FE] No modules selected. Raw argv:', JSON.stringify(process.argv));
    console.error('[EXPORT-FE] Parsed args:', JSON.stringify(ARGV));
    console.error('[EXPORT-FE] Usage: npm run export:fe -- category,product,order');
    console.error('[EXPORT-FE] Available modules:', MODULES.map(m => m.name).join(', '));
    process.exit(1);
  }
  ensureDir(EXPORT_ROOT);
  writeBaseTypes();
  const typeFiles = SELECTED.map(writeModuleTypes);
  const serviceFiles = SELECTED.map(generateService);
  console.log('[EXPORT-FE] Generated base types: base.ts');
  typeFiles.forEach(f => console.log('[EXPORT-FE] Generated module types:', f));
  serviceFiles.forEach(f => console.log('[EXPORT-FE] Generated service:', f));
  console.log('[EXPORT-FE] Done.');
}

main();
