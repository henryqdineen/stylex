/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

'use strict';

import type { Identifier, ImportDeclaration, VariableDeclarator } from 'estree';
import type { ScopeVariable } from 'eslint/eslint-rule';
/*:: import { Rule } from 'eslint'; */
import getSourceCode from './getSourceCode';
import resolveVariable from './resolveVariable';

export type ValidImportSource =
  | string
  | {
      from: string,
      as: string,
    };

type ImportTracker = {
  ImportDeclaration: (node: ImportDeclaration) => void,
  VariableDeclarator: (node: VariableDeclarator) => void,
  isStylexDefaultImport: (identifier: Identifier) => boolean,
  isStylexNamedImport: (importName: string, identifier: Identifier) => boolean,
  clear: () => void,
};

export default function createImportTracker(
  importsToLookFor: Array<ValidImportSource>,
  context: Rule.RuleContext,
): ImportTracker {
  const sourceCode = getSourceCode(context);
  const styleXDefaultImports = new Map<string, ScopeVariable>();
  const styleXNamedImports = new Map<string, Map<string, ScopeVariable>>();

  function handleImportDeclaration(node: ImportDeclaration) {
    if (
      node.source.type !== 'Literal' ||
      typeof node.source.value !== 'string'
    ) {
      return;
    }

    const foundImportSource = importsToLookFor.find((importSource) => {
      if (typeof importSource === 'string') {
        return importSource === node.source?.value;
      }
      return importSource.from === node.source?.value;
    });

    if (!foundImportSource) {
      return;
    }

    if (typeof foundImportSource === 'string') {
      node.specifiers.forEach((specifier) => {
        if (
          specifier.type === 'ImportDefaultSpecifier' ||
          specifier.type === 'ImportNamespaceSpecifier'
        ) {
          sourceCode
            .getDeclaredVariables(specifier)
            .forEach((variable) =>
              styleXDefaultImports.set(variable.name, variable),
            );
        }

        if (specifier.type === 'ImportSpecifier') {
          const importName = specifier.imported.name;
          if (!styleXNamedImports.has(importName)) {
            styleXNamedImports.set(importName, new Map());
          }
          sourceCode
            .getDeclaredVariables(specifier)
            .forEach((variable) =>
              styleXNamedImports.get(importName)?.set(variable.name, variable),
            );
        }
      });
    }

    if (typeof foundImportSource === 'object') {
      node.specifiers.forEach((specifier) => {
        if (specifier.type === 'ImportSpecifier') {
          if (specifier.imported.name === foundImportSource.as) {
            sourceCode
              .getDeclaredVariables(specifier)
              .forEach((variable) =>
                styleXDefaultImports.set(variable.name, variable),
              );
          }
        }
      });
    }
  }

  function handleVariableDeclarator(node: VariableDeclarator) {
    const init = node.init;
    if (
      init == null ||
      init.type !== 'CallExpression' ||
      init.callee.type !== 'Identifier' ||
      init.callee.name !== 'require' ||
      init.arguments.length !== 1 ||
      init.arguments[0].type !== 'Literal' ||
      !importsToLookFor.includes(init.arguments[0].value as $FlowFixMe)
    ) {
      return;
    }

    const variables = sourceCode.getDeclaredVariables(node);

    if (node.id.type === 'Identifier') {
      variables.forEach((variable) =>
        styleXDefaultImports.set(variable.name, variable),
      );
    }

    if (node.id.type === 'ObjectPattern') {
      node.id.properties.forEach((prop) => {
        if (
          prop.type === 'Property' &&
          prop.key.type === 'Identifier' &&
          !prop.computed &&
          prop.value.type === 'Identifier'
        ) {
          const importName = prop.key.name;
          const localName = prop.value.name;
          if (!styleXNamedImports.has(importName)) {
            styleXNamedImports.set(importName, new Map());
          }
          variables
            .filter((variable) => variable.name === localName)
            .forEach((variable) =>
              styleXNamedImports.get(importName)?.set(localName, variable),
            );
        }
      });
    }
  }

  function isStylexDefaultImport(identifier: Identifier): boolean {
    const variable = styleXDefaultImports.get(identifier.name);
    return (
      variable != null && resolveVariable(sourceCode, identifier) === variable
    );
  }

  function isStylexNamedImport(
    importName: string,
    identifier: Identifier,
  ): boolean {
    const variable = styleXNamedImports.get(importName)?.get(identifier.name);
    return (
      variable != null && resolveVariable(sourceCode, identifier) === variable
    );
  }

  function clear() {
    styleXDefaultImports.clear();
    styleXNamedImports.clear();
  }

  return {
    ImportDeclaration: handleImportDeclaration,
    VariableDeclarator: handleVariableDeclarator,
    isStylexDefaultImport,
    isStylexNamedImport,
    clear,
  };
}
