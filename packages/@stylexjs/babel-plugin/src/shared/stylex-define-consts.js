/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type { InjectableConstStyle, StyleXOptions } from './common-types';
import type { ConstsConfig, ConstsConfigValue } from './stylex-consts-utils';

import { defaultOptions } from './utils/default-options';
import * as messages from './messages';

import createHash from './hash';

// Output type mirrors the input structure but is mutable
type ConstsOutput = string | number | { [string]: ConstsOutput };

export default function styleXDefineConsts<Vars: ConstsConfig>(
  constants: Vars,
  options: $ReadOnly<{ ...Partial<StyleXOptions>, exportId: string, ... }>,
): [
  { [string]: ConstsOutput }, // jsOutput JS output
  { [string]: InjectableConstStyle }, // metadata for registerinjectableStyles
] {
  const { classNamePrefix, exportId, debug, enableDebugClassNames } = {
    ...defaultOptions,
    ...options,
  };

  const jsOutput: { [string]: ConstsOutput } = {};
  const injectableStyles: { [string]: InjectableConstStyle } = {};

  // Recursively process constants, including nested objects
  const processEntry = (
    key: string,
    value: ConstsConfigValue,
    path: Array<string>,
  ): ConstsOutput => {
    if (typeof value === 'string' || typeof value === 'number') {
      const fullPath = path.join('.');
      const varSafeKey = path
        .map((segment) =>
          segment[0] >= '0' && segment[0] <= '9' ? `_${segment}` : segment,
        )
        .join('_')
        .replace(/[^a-zA-Z0-9_]/g, '_');

      const constKey =
        debug && enableDebugClassNames
          ? `${varSafeKey}-${classNamePrefix}${createHash(`${exportId}.${fullPath}`)}`
          : `${classNamePrefix}${createHash(`${exportId}.${fullPath}`)}`;

      injectableStyles[constKey] = {
        constKey,
        constVal: value,
        priority: 0,
        ltr: '',
        rtl: null,
      };
      return value;
    }

    // Handle nested objects
    if (typeof value === 'object' && value !== null) {
      const nested: { [string]: ConstsOutput } = {};
      for (const [k, v] of Object.entries(value)) {
        nested[k] = processEntry(k, v, [...path, k]);
      }
      return nested;
    }

    return value;
  };

  for (const [key, value] of Object.entries(constants)) {
    if (key.startsWith('--')) {
      throw new Error(messages.INVALID_CONST_KEY);
    }
    jsOutput[key] = processEntry(key, value, [key]);
  }

  return [jsOutput, injectableStyles];
}
