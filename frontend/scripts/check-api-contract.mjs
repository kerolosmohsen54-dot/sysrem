import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(frontendRoot, 'src');
const contractPath = path.resolve(frontendRoot, '..', 'backend', 'docs', 'openapi.yaml');
const contractText = await readFile(contractPath, 'utf8');
const contractPaths = readContractOperations(contractText);
const sourceFiles = await findSourceFiles(sourceRoot);
const calls = new Map();

for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8');
  const callPattern = /(apiRequest|listResource)(?:<[\s\S]*?>)?\s*\(\s*(['"`])([^'"`]+)\2/g;
  for (const match of source.matchAll(callPattern)) {
    const helper = match[1];
    const endpoint = match[3]
      .replace(/\$\{[^}]*$/g, '')
      .replace(/\$\{[^}]+\}/g, '{}')
      .split('?')[0]
      .replace(/\/+$/, '') || '/';
    if (endpoint === '{}') continue;
    const afterPath = source.slice(
      match.index + match[0].length,
      match.index + match[0].length + 500,
    );
    const method =
      helper === 'listResource'
        ? 'get'
        : (afterPath.match(/^\s*,\s*\{\s*method:\s*['"]([A-Z]+)['"]/)?.[1] ?? 'GET').toLowerCase();
    const normalized = endpoint.replace(/\/+/g, '/');
    addCall(method.toUpperCase(), normalized, file);
  }
  const variablePathCall =
    /apiRequest<unknown>\s*\(\s*([a-zA-Z_$][\w$]*)\s*,\s*\{\s*method:\s*['"]([A-Z]+)['"]/g;
  for (const match of source.matchAll(variablePathCall)) {
    const prefix = source.slice(Math.max(0, match.index - 500), match.index);
    const variableDefinition = new RegExp(`const\\s+${match[1]}\\s*=([\\s\\S]*?);`).exec(prefix);
    if (!variableDefinition) continue;
    for (const pathMatch of variableDefinition[1].matchAll(/['"](\/[^'"]+)['"]/g)) {
      let endpoint = pathMatch[1];
      const suffix = variableDefinition[1].slice(pathMatch.index + pathMatch[0].length);
      if (endpoint.endsWith('/') && /^\s*\+\s*(?:encodeURIComponent\s*\()?\s*[\w$.]+/.test(suffix)) {
        endpoint += '{}';
      }
      addCall(match[2], endpoint.replace(/\/+$/, '') || '/', file);
    }
  }

  // Also inspect calls with conditional or locally assembled paths/methods.
  // The regular expression above intentionally stays as a quick path for the
  // common literal form; the compiler AST handles cases such as a POST/PUT
  // selected from the same conditional as the endpoint.
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const constants = new Map();
  visit(sourceFile, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      constants.set(node.name.text, node.initializer);
    }
  });
  visit(sourceFile, (node) => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression)) return;
    const helper = node.expression.text;
    if (helper !== 'apiRequest' && helper !== 'listResource') return;
    const shadowed = new Set();
    const parameterAlternatives = new Map();
    for (let parent = node.parent; parent && !ts.isSourceFile(parent); parent = parent.parent) {
      if (ts.isFunctionLike(parent)) {
        for (const parameter of parent.parameters) {
          if (ts.isIdentifier(parameter.name)) {
            shadowed.add(parameter.name.text);
            const literals = parameter.type && ts.isUnionTypeNode(parameter.type)
              ? parameter.type.types.filter(ts.isLiteralTypeNode).map((type) => type.literal).filter(ts.isStringLiteral).map((type) => type.text)
              : [];
            if (literals.length) parameterAlternatives.set(parameter.name.text, literals);
          }
        }
      }
    }
    const paths = valueVariants(node.arguments[0], constants, 'path', new Set(), shadowed, parameterAlternatives);
    const methods = helper === 'listResource'
      ? [{ value: 'GET' }]
      : methodVariants(node.arguments[1], constants);
    for (const pathVariant of paths) {
      let aligned = methods.filter((method) =>
        pathVariant.condition && method.condition
          ? pathVariant.condition === method.condition && pathVariant.branch === method.branch
          : false,
      );
      if (!aligned.length) aligned = methods;
      for (const method of aligned) {
        const endpoint = pathVariant.value
          .replace(/\$\{[^}]*\}/g, '{}')
          .split('?')[0]
          .replace(/\/+$/, '') || '/';
        if (endpoint !== '/' && endpoint !== '{}') {
          addCall(method.value, endpoint.replace(/\/+/g, '/'), file);
        }
      }
    }
  });
}

let missing = 0;
for (const [key, files] of calls) {
  const separator = key.indexOf(' ');
  const method = key.slice(0, separator).toLowerCase();
  const endpoint = key.slice(separator + 1);
  const exists = [...contractPaths.entries()].some(([candidate, methods]) => {
    const pattern = new RegExp(
      `^${candidate
        .split('/')
        .map((segment) =>
          segment.startsWith('{') && segment.endsWith('}') ? '[^/]+' : escapeRegex(segment),
        )
        .join('/')}$`,
    );
    return pattern.test(endpoint) && methods.has(method);
  });
  if (!exists) missing += 1;
  console.log(`${exists ? 'OK' : 'MISSING'} ${key} (${[...new Set(files)].join(', ')})`);
}
console.log(
  `Checked ${calls.size} unique API method/path calls from ${sourceFiles.length} frontend source files; ${missing} missing from ../backend/docs/openapi.yaml.`,
);
if (missing) process.exitCode = 1;

async function findSourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findSourceFiles(entryPath)));
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      const relativePath = path.relative(sourceRoot, entryPath).split(path.sep).join('/');
      if (relativePath !== 'shared/api/http.ts') files.push(entryPath);
    }
  }
  return files;
}

function readContractOperations(source) {
  const paths = new Map();
  let currentPath;
  for (const line of source.split(/\r?\n/)) {
    const pathMatch = /^ {2}(\/[^:\s]+):\s*$/.exec(line);
    if (pathMatch) {
      currentPath = pathMatch[1];
      paths.set(currentPath, new Set());
      continue;
    }
    if (/^\S/.test(line)) {
      currentPath = undefined;
      continue;
    }
    const methodMatch = /^ {4}(get|post|put|patch|delete|options|head|trace):\s*$/i.exec(line);
    if (currentPath && methodMatch) paths.get(currentPath).add(methodMatch[1].toLowerCase());
  }
  return paths;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addCall(method, endpoint, file) {
  // A root path can be a prefix used to build a request path dynamically; it is
  // not an endpoint by itself and must not be compared to the OpenAPI surface.
  if (endpoint === '/') return;
  const key = `${method} ${endpoint}`;
  const entries = calls.get(key) ?? [];
  entries.push(path.relative(frontendRoot, file).split(path.sep).join('/'));
  calls.set(key, entries);
}

function visit(node, callback) {
  callback(node);
  ts.forEachChild(node, (child) => visit(child, callback));
}

function methodVariants(options, constants) {
  if (!options) return [{ value: 'GET' }];
  const target = ts.isIdentifier(options) ? constants.get(options.text) : options;
  if (!target || !ts.isObjectLiteralExpression(target)) return [{ value: 'GET' }];
  const property = target.properties.find((item) => {
    if (!ts.isPropertyAssignment(item)) return false;
    return item.name.getText().replace(/['"`]/g, '') === 'method';
  });
  if (!property || !ts.isPropertyAssignment(property)) return [{ value: 'GET' }];
  return valueVariants(property.initializer, constants, 'method')
    .filter((item) => /^(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/i.test(item.value))
    .map((item) => ({ ...item, value: item.value.toUpperCase() }));
}

function valueVariants(expression, constants, mode, seen = new Set(), shadowed = new Set(), parameterAlternatives = new Map()) {
  if (!expression) return [];
  if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) || ts.isNonNullExpression(expression)) {
    return valueVariants(expression.expression, constants, mode, seen, shadowed, parameterAlternatives);
  }
  if (ts.isConditionalExpression(expression)) {
    const condition = expression.condition.getText();
    return [
      ...valueVariants(expression.whenTrue, constants, mode, seen, shadowed, parameterAlternatives).map((item) => ({ ...item, condition, branch: true })),
      ...valueVariants(expression.whenFalse, constants, mode, seen, shadowed, parameterAlternatives).map((item) => ({ ...item, condition, branch: false })),
    ];
  }
  if (ts.isIdentifier(expression) && parameterAlternatives.has(expression.text)) {
    return parameterAlternatives.get(expression.text).map((value) => ({ value }));
  }
  if (ts.isIdentifier(expression) && !shadowed.has(expression.text) && constants.has(expression.text) && !seen.has(expression.text)) {
    const nextSeen = new Set(seen).add(expression.text);
    return valueVariants(constants.get(expression.text), constants, mode, nextSeen, shadowed, parameterAlternatives);
  }
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return [{ value: expression.text }];
  }
  if (ts.isTemplateExpression(expression)) {
    const value = expression.head.text + expression.templateSpans.map((span) => {
      const isQueryExpression = expression.head.text.includes('?') || span.expression.getText().includes('?') || span.literal.text.startsWith('?');
      return `${isQueryExpression ? '' : '{}'}${span.literal.text}`;
    }).join('');
    return [{ value }];
  }
  if (ts.isBinaryExpression(expression) && expression.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = valueVariants(expression.left, constants, mode, seen, shadowed, parameterAlternatives);
    const right = valueVariants(expression.right, constants, mode, seen, shadowed, parameterAlternatives);
    if (!left.length) return right;
    if (!right.length) {
      return left.map((item) => ({
        ...item,
        value: mode === 'path' && !item.value.includes('?') ? `${item.value}{}` : item.value,
      }));
    }
    return left.flatMap((a) => right.map((b) => ({
      value: `${a.value}${b.value}`,
      ...(a.condition ? { condition: a.condition, branch: a.branch } : b.condition ? { condition: b.condition, branch: b.branch } : {}),
    })));
  }
  return [];
}
