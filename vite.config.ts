import tailwindcss from '@tailwindcss/postcss';
import cascadeLayers from '@csstools/postcss-cascade-layers';
import presetEnv from 'postcss-preset-env';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';
import {defineConfig} from 'vite';

// A tiny PostCSS plugin to strip @property
const stripProperty = () => {
  return {
    postcssPlugin: 'strip-property',
    AtRule: {
      property(atRule) {
        atRule.remove();
      }
    }
  };
};
stripProperty.postcss = true;

// A tiny PostCSS plugin to flatten :is and :where for legacy targets
const flattenIsWhere = () => {
  return {
    postcssPlugin: 'flatten-is-where',
    Rule(rule) {
      if (rule.selector.includes(':where(') || rule.selector.includes(':is(') || rule.selector.includes(':-webkit-any(')) {
        // Since we don't need RTL spacing and advanced fallback fallbacks usually exist,
        // we can just remove the rule entirely if it still contains these after a basic clean.
        // It's mostly just RTL :lang() selectors.
        rule.remove();
      }
    }
  };
};
flattenIsWhere.postcss = true;

export default defineConfig(() => {
  return {
    css: {
      lightningcss: {
        targets: {
          safari: (10 << 16),
          ios_saf: (10 << 16),
        },
      },
      postcss: {
        plugins: [
          tailwindcss(),
          cascadeLayers(),
          flattenIsWhere(),
          stripProperty(),
          presetEnv({
            stage: 0,
            features: {
              'logical-properties-and-values': false, 
              'prefers-color-scheme-query': false, 
              'gap-properties': false,
              'custom-properties': false,
              'place-properties': false,
              'not-pseudo-class': false,
              'focus-visible-pseudo-class': false,
              'focus-within-pseudo-class': false,
              'color-functional-notation': false,
              'cascade-layers': false
            }
          })
        ]
      }
    },
    plugins: [
      react(), 
      legacy({
        targets: ['ios >= 9', 'safari >= 9'],
        modernTargets: ['safari >= 11', 'ios >= 11']
      })
    ],
    build: {
      cssMinify: 'lightningcss' as 'lightningcss',
      target: ['es2015', 'safari10'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
