/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

'use strict';

import type { Identifier } from 'estree';
import type { Scope, ScopeVariable, SourceCode } from 'eslint/eslint-rule';

export default function resolveVariable(
  sourceCode: SourceCode,
  identifier: Identifier,
): ScopeVariable | null {
  let scope: Scope | null = sourceCode.getScope(identifier);
  while (scope != null) {
    const variable = scope.set.get(identifier.name);
    if (variable != null) {
      return variable;
    }
    scope = scope.upper;
  }
  return null;
}
