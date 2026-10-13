// ESLint (flat config). Regras "recommended" do ESLint listadas explicitamente,
// para não depender de pacotes extras.
const recommended = Object.fromEntries(
  [
    'constructor-super', 'for-direction', 'getter-return', 'no-async-promise-executor', 'no-case-declarations',
    'no-class-assign', 'no-compare-neg-zero', 'no-cond-assign', 'no-const-assign', 'no-constant-binary-expression',
    'no-constant-condition', 'no-control-regex', 'no-debugger', 'no-delete-var', 'no-dupe-args', 'no-dupe-class-members',
    'no-dupe-else-if', 'no-dupe-keys', 'no-duplicate-case', 'no-empty-character-class', 'no-empty-pattern',
    'no-empty-static-block', 'no-ex-assign', 'no-extra-boolean-cast', 'no-fallthrough', 'no-func-assign',
    'no-global-assign', 'no-import-assign', 'no-invalid-regexp', 'no-irregular-whitespace', 'no-loss-of-precision',
    'no-misleading-character-class', 'no-new-native-nonconstructor', 'no-nonoctal-decimal-escape', 'no-obj-calls',
    'no-octal', 'no-prototype-builtins', 'no-redeclare', 'no-regex-spaces', 'no-self-assign', 'no-setter-return',
    'no-shadow-restricted-names', 'no-sparse-arrays', 'no-this-before-super', 'no-undef', 'no-unexpected-multiline',
    'no-unreachable', 'no-unsafe-finally', 'no-unsafe-negation', 'no-unsafe-optional-chaining', 'no-unused-labels',
    'no-unused-private-class-members', 'no-useless-backreference', 'no-useless-catch', 'no-useless-escape', 'no-with',
    'require-yield', 'use-isnan', 'valid-typeof',
  ].map((r) => [r, 'error']),
);

const browser = Object.fromEntries(
  [
    'window', 'document', 'navigator', 'location', 'performance', 'console', 'fetch', 'URL', 'Image', 'Promise',
    'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
    'addEventListener', 'removeEventListener', 'matchMedia', 'innerWidth', 'innerHeight', 'scrollY', 'scrollTo',
    'devicePixelRatio', 'IntersectionObserver', 'getComputedStyle', 'HTMLElement', 'HTMLVideoElement', 'Element',
    'PointerEvent', 'Event',
  ].map((g) => [g, 'readonly']),
);
const node = Object.fromEntries(
  ['process', 'Buffer', 'console', 'URL', 'setTimeout', 'clearTimeout', 'globalThis'].map((g) => [g, 'readonly']),
);

export default [
  { ignores: ['dist/**', 'node_modules/**', 'graphify-out/**', 'test-results/**'] },
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      ...recommended,
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
    },
  },
  {
    files: ['src/**/*.js'],
    languageOptions: { globals: { ...browser, THREE: 'readonly' } },
  },
  {
    files: ['scripts/**', 'tests/**', '*.config.js'],
    languageOptions: { globals: node },
  },
  {
    files: ['tests/e2e/**'],
    languageOptions: { globals: { ...node, ...browser, SN: 'readonly', PN: 'readonly' } },
  },
];
