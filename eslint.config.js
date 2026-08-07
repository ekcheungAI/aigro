import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.worktrees/**', 'supabase/.temp/**', 'supabase/.branches/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'react-refresh/only-export-components': ['error', {
        allowConstantExport: true,
        allowExportNames: [
          'useAdminToast',
          'usePortalExpert',
          'useToast',
          'EASE_OUT_STRONG',
          'EASE_IN_OUT_STRONG',
          'REVEAL_EASE',
          'EXPERT_EDITORIAL_PANEL',
        ],
      }],
    },
  },
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      // shadcn primitives intentionally co-locate variants/helpers with components.
      'react-refresh/only-export-components': 'off',
    },
  },
])
