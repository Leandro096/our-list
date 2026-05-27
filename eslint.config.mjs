import globals from 'globals';
import eslintJs from '@eslint/js';
import eslintTs from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import importPlugin from 'eslint-plugin-import';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import perfectionistPlugin from 'eslint-plugin-perfectionist';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';

// ----------------------------------------------------------------------

/**
 * @rules common
 * from 'react', 'eslint-plugin-react-hooks'...
 */
const commonRules = () => ({
  ...reactHooksPlugin.configs.recommended.rules,
  'func-names': 1,
  'no-bitwise': 2,
  'no-empty': [2, { allowEmptyCatch: true }],
  'no-unused-vars': 0,
  'object-shorthand': 1,
  'no-useless-rename': 1,
  'default-case-last': 2,
  'consistent-return': 2,
  'no-constant-condition': 1,
  'default-case': [2, { commentPattern: '^no default$' }],
  'lines-around-directive': [2, { before: 'always', after: 'always' }],
  'arrow-body-style': [2, 'as-needed', { requireReturnForObjectLiteral: false }],
  // react
  'react/jsx-key': 0,
  'react/prop-types': 0,
  'react/display-name': 0,
  'react/no-children-prop': 0,
  'react/jsx-boolean-value': 2,
  'react/self-closing-comp': 2,
  'react/react-in-jsx-scope': 0,
  'react/jsx-no-useless-fragment': [1, { allowExpressions: true }],
  'react/jsx-curly-brace-presence': [2, { props: 'never', children: 'never' }],
  // react-hooks: reglas nuevas de v7 que no existían antes — deshabilitadas
  'react-hooks/set-state-in-effect': 0,
  'react-hooks/static-components': 0,
  'react-hooks/use-memo': 0,
  // typescript
  '@typescript-eslint/no-shadow': 1,
  '@typescript-eslint/no-explicit-any': 0,
  '@typescript-eslint/no-empty-object-type': 0,
  '@typescript-eslint/consistent-type-imports': 1,
  '@typescript-eslint/no-unused-vars': [1, { args: 'none' }],
  '@typescript-eslint/no-unused-expressions': 1,
});

/**
 * @rules import
 * from 'eslint-plugin-import'.
 */
const importRules = () => ({
  ...importPlugin.configs.recommended.rules,
  'import/named': 0,
  'import/export': 0,
  'import/default': 0,
  'import/namespace': 0,
  'import/no-named-as-default': 0,
  'import/newline-after-import': 2,
  'import/no-named-as-default-member': 0,
  'import/no-cycle': [
    0, // disabled if slow
    { ignoreExternal: true, disableScc: true },
  ],
});

/**
 * @rules unused imports
 * from 'eslint-plugin-unused-imports'.
 */
const unusedImportsRules = () => ({
  'unused-imports/no-unused-imports': 1,
  'unused-imports/no-unused-vars': [
    0,
    { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
  ],
});

/**
 * @rules sort imports/exports
 * from 'eslint-plugin-perfectionist'.
 * Grupos adaptados a la estructura del proyecto (@/* alias → app, components, hooks, lib, services, locales).
 */
const sortImportsRules = () => {
  const customGroups = {
    supabase: 'custom-supabase',
    hooks: 'custom-hooks',
    lib: 'custom-lib',
    services: 'custom-services',
    components: 'custom-components',
    locales: 'custom-locales',
    types: 'custom-types',
  };

  return {
    'perfectionist/sort-named-imports': [1, { type: 'line-length', order: 'asc' }],
    'perfectionist/sort-named-exports': [1, { type: 'line-length', order: 'asc' }],
    'perfectionist/sort-exports': [
      1,
      {
        order: 'asc',
        type: 'line-length',
      },
    ],
    'perfectionist/sort-imports': [
      1,
      {
        order: 'asc',
        ignoreCase: true,
        type: 'line-length',
        environment: 'node',
        maxLineLength: undefined,
        // Coincide con el alias @/* definido en tsconfig.json
        internalPattern: ['^@/.+'],
        groups: [
          'style',
          'side-effect',
          ['builtin', 'external'],
          customGroups.supabase,
          customGroups.hooks,
          customGroups.lib,
          customGroups.services,
          'internal',
          customGroups.components,
          customGroups.locales,
          customGroups.types,
          ['parent', 'sibling', 'index'],
          'unknown',
        ],
        customGroups: [
          { groupName: customGroups.supabase, elementNamePattern: '^@supabase/.+' },
          { groupName: customGroups.hooks, elementNamePattern: '^@/hooks/.+' },
          { groupName: customGroups.lib, elementNamePattern: '^@/lib/.+' },
          { groupName: customGroups.services, elementNamePattern: '^@/services/.+' },
          { groupName: customGroups.components, elementNamePattern: '^@/components/.+' },
          { groupName: customGroups.locales, elementNamePattern: '^@/locales/.+' },
          { groupName: customGroups.types, elementNamePattern: '^@/lib/types.+' },
        ],
      },
    ],
  };
};

/**
 * Custom ESLint configuration.
 */
export const customConfig = {
  plugins: {
    react: reactPlugin,
    'react-hooks': reactHooksPlugin,
    'unused-imports': unusedImportsPlugin,
    perfectionist: perfectionistPlugin,
    import: importPlugin,
  },
  settings: {
    ...importPlugin.configs.typescript.settings,
    'import/resolver': {
      ...importPlugin.configs.typescript.settings['import/resolver'],
      typescript: {
        project: './tsconfig.json',
      },
    },
  },
  rules: {
    ...commonRules(),
    ...importRules(),
    ...unusedImportsRules(),
    ...sortImportsRules(),
  },
};

// ----------------------------------------------------------------------

export default [
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
  },
  {
    // Lint únicamente los directorios fuente del proyecto
    ignores: [
      '*',
      '!app/',
      '!components/',
      'components/ui/**',  // shadcn/ui — componentes auto-generados
      '!hooks/',
      'hooks/use-toast.ts', // shadcn/ui — hook auto-generado
      '!lib/',
      '!services/',
      '!locales/',
      '!eslint.config.*',
    ],
  },
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    settings: { react: { version: 'detect' } },
  },
  eslintJs.configs.recommended,
  ...eslintTs.configs.recommended,
  customConfig,
];
