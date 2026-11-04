/**
 * Compiles the Sass entry points consumers use most, the way a Sass-only
 * project would, and checks the output for problems a compile alone misses.
 * Deprecation warnings are reported, not failed, until Dart Sass makes them
 * errors.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as sass from 'sass';

const here = import.meta.dirname;
const nodeModules = path.resolve(here, '../../node_modules');
const dist = path.join(here, 'dist');
const reportPath = path.resolve(here, '../../reports/sass.md');

const entries = {
  'styles-default': `@use '@carbon/styles';`,
  'styles-custom-prefix': `@use '@carbon/styles' with ($prefix: 'acme');`,
  'styles-flexbox-grid': `@use '@carbon/styles' with ($use-flexbox-grid: true);`,
  'react-default': `@use '@carbon/react';`,
  elements: `@use '@carbon/elements';`,
  grid: `@use '@carbon/grid'; @include grid.flex-grid();`,
  type: `@use '@carbon/type'; @include type.default-type(); @include type.type-classes();`,
  ...Object.fromEntries(
    ['white', 'g10', 'g90', 'g100'].map((theme) => [
      `theme-${theme}`,
      `@use '@carbon/styles/scss/themes';
       @use '@carbon/styles/scss/theme' with ($theme: themes.$${theme});
       :root { @include theme.theme(); }`,
    ])
  ),
};

// Names that ignore $prefix in v11 as well; only new ones fail.
const KNOWN_PREFIX_LEAKS =
  /^--cds-(grid-[\w-]+|layer|ai-border-start|ai-border-end)$/;

const checks = {
  'styles-custom-prefix': (css) => {
    const leaked = [
      ...new Set(css.match(/\.cds--[\w-]+|--cds-[\w-]+/g) ?? []),
    ].filter((name) => !KNOWN_PREFIX_LEAKS.test(name));
    if (leaked.length) {
      return `${leaked.length} selectors or custom properties ignore $prefix: ${leaked.slice(0, 10).join(', ')}`;
    }
    if (!css.includes('.acme--btn')) {
      return 'expected .acme--btn in the output';
    }
  },
  'styles-flexbox-grid': (css) =>
    css.includes('.cds--row') ? undefined : 'expected flexbox grid .cds--row',
};

fs.mkdirSync(dist, { recursive: true });
const failures = [];
const report = ['## Sass', ''];

for (const [name, source] of Object.entries(entries)) {
  const deprecations = new Map();
  try {
    const { css } = sass.compileString(source, {
      loadPaths: [nodeModules],
      style: 'compressed',
      logger: {
        warn(message, { deprecation, deprecationType }) {
          if (deprecation) {
            const key = deprecationType?.id ?? message.split('\n')[0];
            deprecations.set(key, (deprecations.get(key) ?? 0) + 1);
          }
        },
      },
    });
    fs.writeFileSync(path.join(dist, `${name}.css`), css);
    const problem = checks[name]?.(css);
    if (problem) {
      failures.push(`${name}: ${problem}`);
    }
    const summary = [...deprecations]
      .map(([id, count]) => `${id} ×${count}`)
      .join(', ');
    report.push(
      `- \`${name}\`: ${(css.length / 1024).toFixed(0)} KiB` +
        (problem ? `, **${problem}**` : '') +
        (summary ? `, deprecations: ${summary}` : '')
    );
  } catch (error) {
    failures.push(`${name}: ${error.message.split('\n')[0]}`);
    report.push(
      `- \`${name}\`: **failed to compile**: ${error.message.split('\n')[0]}`
    );
  }
}

for (const file of [
  '@carbon/styles/css/styles.css',
  '@carbon/styles/css/styles.min.css',
]) {
  if (!fs.existsSync(path.join(nodeModules, file))) {
    failures.push(`missing precompiled ${file}`);
  }
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, report.join('\n') + '\n');
console.log(report.join('\n'));

if (failures.length) {
  console.error(
    `\n${failures.length} Sass problem(s):\n  ${failures.join('\n  ')}`
  );
  process.exit(1);
}
