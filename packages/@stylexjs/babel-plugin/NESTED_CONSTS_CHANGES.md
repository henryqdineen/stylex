# Nested `defineConsts` Support - Change Summary

## Overview
Adds support for nested objects in `stylex.defineConsts()`:
```js
const tokens = stylex.defineConsts({
  button: { primary: { color: 'blue' } }
});
// Usage: tokens.button.primary.color
```

## Files Changed (3 files, ~75 net lines)

### 1. `stylex-consts-utils.js` - Type Definition (3 lines)
**Only change:** Made `ConstsConfigValue` recursive
```diff
-export type ConstsConfigValue = string | number;
+export type ConstsConfigValue =
+  | string
+  | number
+  | $ReadOnly<{ [string]: ConstsConfigValue }>;
```
✅ No new exports added - minimal diff

---

### 2. `stylex-define-consts.js` - Core Logic (~40 lines)
**Changes:**
- Added local type: `type ConstsOutput = string | number | { [string]: ConstsOutput }`
- Extracted existing logic into `processEntry()` helper for recursion
- Main loop preserved:
```diff
 for (const [key, value] of Object.entries(constants)) {
   if (key.startsWith('--')) {
     throw new Error(messages.INVALID_CONST_KEY);
   }
-  jsOutput[key] = value;
+  jsOutput[key] = processEntry(key, value, [key]);
 }
```

**What `processEntry()` does:**
- For primitives: Generate hash from full path (e.g., `button.primary.color`)
- For objects: Recursively process children

---

### 3. `evaluate-path.js` - Proxy Support (~35 lines)
**Changes:**
- Added `pathPrefix` parameter to track nested paths
- Modified proxy to support both:
  - String coercion: `toString()`, `valueOf()`  
  - Property access: `tokens.button.primary`
- Added `valueOf()` check in member expression handler

```diff
 function evaluateThemeRef(
   fileName: string,
   exportName: string,
   state: State,
+  pathPrefix: Array<string> = [],
 )
```

---

## Testing
✅ All 725 existing tests pass
✅ Added 5 new tests for nested functionality
✅ Fully backward compatible

## Type Safety
✅ `ConstsOutput` type is local to the module that uses it
✅ Recursive types properly model nested structure
✅ No use of `mixed` or `any`
