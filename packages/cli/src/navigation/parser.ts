import fs from 'node:fs';

import type { MethodParam, MethodSignature } from './types.js';

export function parseNavigationSpec(specPath: string): MethodSignature[] {
  const content = fs.readFileSync(specPath, 'utf-8');

  const interfaceMatch = content.match(
    /export interface (?:BrownfieldNavigationSpec|Spec)\s*\{([^}]+)\}/s
  );

  if (!interfaceMatch?.[1]) {
    throw new Error(
      'Could not find BrownfieldNavigationSpec or Spec interface in spec file'
    );
  }

  const methods: MethodSignature[] = [];
  const methodRegex = /(\w+)\s*\(([^)]*)\)\s*:\s*(Promise<[^>]+>|[^;]+)\s*;/g;

  let match: RegExpExecArray | null;
  while ((match = methodRegex.exec(interfaceMatch[1])) !== null) {
    const name = match[1];
    const paramsStr = match[2];
    const returnType = match[3];

    if (!name || !returnType) {
      continue;
    }

    const params: MethodParam[] = [];
    if (paramsStr?.trim()) {
      const paramParts = paramsStr.split(',');
      for (const param of paramParts) {
        const paramMatch = param.trim().match(/(\w+)(\?)?:\s*(.+)/);
        if (paramMatch?.[1] && paramMatch[3]) {
          params.push({
            name: paramMatch[1],
            type: paramMatch[3].trim(),
            optional: Boolean(paramMatch[2]),
          });
        }
      }
    }

    methods.push({
      name,
      params,
      returnType: returnType.trim(),
      isAsync: returnType.trim().startsWith('Promise<'),
    });
  }

  return methods;
}
