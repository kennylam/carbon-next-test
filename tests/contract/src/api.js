import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import semver from 'semver';
import { globSync } from 'tinyglobby';
import { repoRoot } from './release.js';

const cacheDir = path.join(repoRoot, '.cache', 'api');

/**
 * Public API surfaces to compare between releases.
 *  js               names exported from the package entry point
 *  custom-elements  tag names and attributes from custom-elements.json
 *  scss             Sass modules a consumer can `@use`
 */
export const API_KINDS = {
  '@carbon/react': ['js', 'scss'],
  '@carbon/web-components': ['custom-elements'],
  '@carbon/styles': ['scss'],
  '@carbon/icons-react': ['js'],
  '@carbon/themes': ['js'],
  '@carbon/utilities': ['js'],
  '@carbon/utilities-react': ['js'],
  '@carbon/feature-flags': ['js'],
};

export async function previousVersion(name, current) {
  const response = await fetch(
    `https://registry.npmjs.org/${name.replace('/', '%2f')}`,
    { headers: { accept: 'application/vnd.npm.install-v1+json' } }
  );
  const { versions } = await response.json();
  const preid = semver.prerelease(current)?.[0];
  const candidates = Object.keys(versions).filter(
    (version) =>
      semver.lt(version, current) &&
      semver.major(version) === semver.major(current) &&
      semver.prerelease(version)?.[0] === preid
  );
  return candidates.sort(semver.rcompare)[0] ?? null;
}

/** Installs a published version in isolation and returns its directory. */
export function installPublished(name, version) {
  const prefix = path.join(cacheDir, `${name.replace('/', '__')}@${version}`);
  const dir = path.join(prefix, 'node_modules', name);
  if (!fs.existsSync(path.join(dir, 'package.json'))) {
    fs.mkdirSync(prefix, { recursive: true });
    fs.writeFileSync(path.join(prefix, 'package.json'), '{"private":true}');
    execFileSync(
      'npm',
      [
        'install',
        `${name}@${version}`,
        '--no-save',
        '--no-package-lock',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '--loglevel=error',
      ],
      { cwd: prefix, stdio: 'pipe' }
    );
  }
  return dir;
}

function jsExports(dir) {
  const output = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `const mod = await import(${JSON.stringify(dir + '/')} + process.argv[1]);
       console.log(JSON.stringify(Object.keys(mod).filter((key) => key !== 'default')));`,
      JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).main,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  return JSON.parse(output.toString());
}

function customElements(dir) {
  const file = path.join(dir, 'custom-elements.json');
  if (!fs.existsSync(file)) {
    return [];
  }
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const entries = [];
  if (Array.isArray(manifest.modules)) {
    for (const mod of manifest.modules) {
      for (const declaration of mod.declarations ?? []) {
        if (!declaration.tagName) {
          continue;
        }
        entries.push(`<${declaration.tagName}>`);
        for (const attribute of declaration.attributes ?? []) {
          entries.push(`<${declaration.tagName} ${attribute.name}>`);
        }
      }
    }
  } else if (Array.isArray(manifest.tags)) {
    for (const tag of manifest.tags) {
      entries.push(`<${tag.name}>`);
      for (const attribute of tag.attributes ?? []) {
        entries.push(`<${tag.name} ${attribute.name.toLowerCase()}>`);
      }
    }
  }
  return entries;
}

function scssModules(dir) {
  return globSync('scss/**/*.scss', { cwd: dir }).map((file) =>
    file
      .replace(/(^|\/)_/, '$1')
      .replace(/\.scss$/, '')
      .replace(/\/index$/, '')
  );
}

export function readApi(dir, kind) {
  switch (kind) {
    case 'js':
      return jsExports(dir);
    case 'custom-elements':
      return customElements(dir);
    case 'scss':
      return scssModules(dir);
    default:
      throw new Error(`Unknown API kind ${kind}`);
  }
}

export function diffApi(before, after) {
  const previous = new Set(before);
  const next = new Set(after);
  return {
    removed: [...previous].filter((entry) => !next.has(entry)).sort(),
    added: [...next].filter((entry) => !previous.has(entry)).sort(),
  };
}
