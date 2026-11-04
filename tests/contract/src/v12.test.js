/**
 * Consumer-visible v12 behavior that only shows up in the published packages.
 * Component behavior is covered by upstream's own tests; these checks confirm
 * that the v12 defaults, exports, and compiled styles reach consumers.
 *
 * Checks tied to a section of docs/migration/v12.md only run when that section
 * exists at the release's git tag, so work merged after a release is not
 * expected from it.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as sass from 'sass';
import { describe, expect, test } from 'vitest';
import { config, release, repoRoot } from './release.js';

const react = await import('@carbon/react');
const docRef = release.gitRef;
const sections = docRef ? await documentedSections(docRef) : null;

async function documentedSections(ref) {
  const response = await fetch(
    `https://raw.githubusercontent.com/${config.repository}/${ref}/docs/migration/v12.md`
  );
  if (!response.ok) {
    throw new Error(`Could not read docs/migration/v12.md at ${ref}`);
  }
  const text = await response.text();
  return new Set(
    [...text.matchAll(/^###\s+(.+)$/gm)].map(([, heading]) => heading.trim())
  );
}

function documented(heading) {
  return sections === null || sections.has(heading);
}

function compile(source) {
  const deprecations = [];
  const { css } = sass.compileString(source, {
    loadPaths: [path.join(repoRoot, 'node_modules')],
    logger: {
      warn(message, options) {
        if (options.deprecation) {
          deprecations.push(message.split('\n')[0]);
        }
      },
    },
  });
  return { root: postcss.parse(css), deprecations };
}

/** The value a property ends up with for an exact selector (last one wins). */
function finalValue(root, selector, property) {
  let value;
  root.walkRules((rule) => {
    if (rule.selectors.includes(selector)) {
      rule.walkDecls(property, (decl) => {
        value = decl.value;
      });
    }
  });
  return value;
}

function webComponentsManifest() {
  return JSON.parse(
    fs.readFileSync(
      path.join(
        repoRoot,
        'node_modules/@carbon/web-components/custom-elements.json'
      ),
      'utf8'
    )
  );
}

function manifestTags(manifest) {
  if (Array.isArray(manifest.modules)) {
    return manifest.modules
      .flatMap((mod) => mod.declarations ?? [])
      .map((declaration) => declaration.tagName)
      .filter(Boolean);
  }
  return (manifest.tags ?? []).map((tag) => tag.name);
}

describe('@carbon/feature-flags', () => {
  test('enables enable-v12-release and every enable-v12-* flag by default', async () => {
    const { FeatureFlags, enabled } = await import('@carbon/feature-flags');
    const v12Flags = [...FeatureFlags.flags.keys()].filter((flag) =>
      flag.startsWith('enable-v12-')
    );
    expect(v12Flags).toContain('enable-v12-release');
    expect(v12Flags.filter((flag) => !enabled(flag))).toEqual([]);
  });
});

describe('@carbon/react', () => {
  test('useFeatureFlag reports v12 as enabled without a FeatureFlags wrapper', () => {
    function Probe() {
      return String(react.useFeatureFlag('enable-v12-release'));
    }
    expect(renderToString(createElement(Probe))).toBe('true');
  });

  describe.runIf(documented('Components migrated from `@carbon/ibm-products`'))(
    'components migrated from @carbon/ibm-products',
    () => {
      // ADR 0009 components that have landed. Names move from `preview__` to
      // stable here as they are promoted.
      test.each([
        'AddSelect',
        'AddSelectData',
        'Coachmark',
        'ConditionBuilder',
        'EditInPlace',
        'FullPageError',
        'InterstitialScreen',
        'NotificationsPanel',
        'OptionsTile',
        'PageHeader',
        'ScrollGradient',
        'SidePanel',
        'Tearsheet',
        'TruncatedText',
        'UserAvatar',
        'preview__BigNumber',
        'preview__Card',
        'preview__Guidebanner',
      ])('exports %s', (name) => {
        expect(react[name]).toBeDefined();
      });
      test.todo('exports Card as stable (ADR 0009)');
      test.todo('exports GuideBanner as stable (ADR 0009)');
      test.todo('exports TagOverflow (ADR 0009)');
    }
  );
});

describe('@carbon/web-components', () => {
  test('custom-elements.json declares each tag once', () => {
    const tags = manifestTags(webComponentsManifest());
    const repeated = [
      ...new Set(tags.filter((tag, index) => tags.indexOf(tag) !== index)),
    ];
    expect(repeated).toEqual([]);
  });

  test('custom-elements.json only declares public elements', () => {
    const publicUnprefixed = new Set(['feature-flags']);
    expect(
      manifestTags(webComponentsManifest()).filter(
        (tag) => !tag.startsWith('cds-') && !publicUnprefixed.has(tag)
      )
    ).toEqual([]);
  });

  test.runIf(documented('Web Components `custom-elements.json` format'))(
    'custom-elements.json is a Custom Elements Manifest',
    () => {
      const manifest = webComponentsManifest();
      expect(manifest.schemaVersion).toBeTypeOf('string');
      expect(Array.isArray(manifest.modules)).toBe(true);
      expect(manifest.tags).toBeUndefined();
    }
  );

  describe.runIf(
    documented('Web Components migrated from `@carbon/ibm-products`')
  )('components migrated from @carbon/ibm-products', () => {
    const tags = new Set(manifestTags(webComponentsManifest()));
    test.each([
      'cds-add-select',
      'cds-big-number',
      'cds-card',
      'cds-coachmark',
      'cds-edit-in-place',
      'cds-full-page-error',
      'cds-guide-banner',
      'cds-interstitial-screen',
      'cds-notification-panel',
      'cds-options-tile',
      'cds-page-header',
      'cds-side-panel',
      'cds-tearsheet',
      'cds-truncated-text',
      'cds-user-avatar',
    ])('declares <%s>', (tag) => {
      expect(tags.has(tag)).toBe(true);
    });
  });
});

describe('@carbon/utilities', () => {
  test.runIf(documented('Utilities Temporal polyfill'))(
    'date-picker installs Temporal only when the engine lacks it',
    () => {
      const run = (script) =>
        execFileSync(process.execPath, ['--input-type=module', '-e', script], {
          cwd: path.join(repoRoot, 'tests/contract'),
          encoding: 'utf8',
        }).trim();

      expect(
        run(`delete globalThis.Temporal;
             await import('@carbon/utilities/date-picker');
             console.log(typeof globalThis.Temporal?.PlainDate);`)
      ).toBe('function');

      expect(
        run(`const native = { PlainDate: function PlainDate() {} };
             globalThis.Temporal = native;
             await import('@carbon/utilities/date-picker');
             console.log(globalThis.Temporal === native);`)
      ).toBe('true');
    }
  );
});

describe('@carbon/styles', () => {
  test.runIf(documented('Sass Button radius'))(
    'buttons read radius from --cds-button-radius, fully rounded by default',
    () => {
      const { root } = compile(`@use '@carbon/styles/scss/components/button';`);
      expect(
        finalValue(root, '.cds--btn', 'border-start-start-radius')
      ).toMatch(
        /var\(--cds-button-radius-ss, var\(--cds-button-radius, 999999px\)\)/
      );
    }
  );

  test.runIf(documented('Sass Tag border radius'))(
    'tags are no longer pill shaped',
    () => {
      const { root } = compile(`@use '@carbon/styles/scss/components/tag';`);
      expect(finalValue(root, '.cds--tag', 'border-radius')).toBe('0.25rem');
      expect(finalValue(root, '.cds--tag--sm', 'border-radius')).toBe(
        '0.125rem'
      );
    }
  );

  test.runIf(documented('Sass Toggle label spacing'))(
    'toggle label spacing is $spacing-03',
    () => {
      const { root } = compile(`@use '@carbon/styles/scss/components/toggle';`);
      expect(
        finalValue(root, '.cds--toggle__label-text', 'margin-block-end')
      ).toBe('0.5rem');
    }
  );
});
