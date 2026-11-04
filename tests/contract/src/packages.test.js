import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { publint } from 'publint';
import { formatMessage } from 'publint/utils';
import semver from 'semver';
import { globSync } from 'tinyglobby';
import { describe, expect, test } from 'vitest';
import {
  expectedVersion,
  installedCopies,
  packages,
  release,
} from './release.js';

const LOCAL_PROTOCOL = /^(workspace|file|link|portal):/;

function releaseVersionOf(name) {
  if (!(name in release.packages)) {
    return null;
  }
  return (
    expectedVersion(name) ??
    packages.find((pkg) => pkg.name === name).manifest.version
  );
}

function exportTargets(value) {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(exportTargets);
  }
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(exportTargets);
  }
  return [];
}

function entryPoints(manifest) {
  const entries = [];
  for (const field of ['main', 'module', 'types', 'typings']) {
    if (typeof manifest[field] === 'string') {
      entries.push([field, manifest[field]]);
    }
  }
  if (typeof manifest.bin === 'string') {
    entries.push(['bin', manifest.bin]);
  } else if (manifest.bin) {
    for (const [name, target] of Object.entries(manifest.bin)) {
      entries.push([`bin.${name}`, target]);
    }
  }
  if (manifest.exports) {
    const exportsMap =
      typeof manifest.exports === 'string' ||
      Object.keys(manifest.exports).every((key) => !key.startsWith('.'))
        ? { '.': manifest.exports }
        : manifest.exports;
    for (const [subpath, value] of Object.entries(exportsMap)) {
      for (const target of exportTargets(value)) {
        entries.push([`exports["${subpath}"]`, target]);
      }
    }
  }
  return entries;
}

function targetExists(dir, target) {
  if (target.includes('*')) {
    return globSync(target.replaceAll('*', '**'), { cwd: dir }).length > 0;
  }
  return fs.existsSync(path.join(dir, target));
}

function hasRootEntry(manifest) {
  if (manifest.exports) {
    return (
      typeof manifest.exports === 'string' ||
      '.' in manifest.exports ||
      Object.keys(manifest.exports).every((key) => !key.startsWith('.'))
    );
  }
  return Boolean(manifest.main || manifest.module);
}

function runNode(args) {
  try {
    execFileSync(process.execPath, args, {
      cwd: path.dirname(new URL(import.meta.url).pathname),
      stdio: 'pipe',
      env: { ...process.env, NODE_OPTIONS: '' },
    });
    return null;
  } catch (error) {
    return error.stderr.toString().trim().split('\n').slice(0, 6).join('\n');
  }
}

describe.each(packages)('$name', ({ name, dir, config, manifest }) => {
  test('installs the version in the release set', () => {
    const expected = expectedVersion(name);
    if (expected) {
      expect(manifest.version).toBe(expected);
    }
  });

  test('does not publish local dependency protocols', () => {
    const local = [];
    for (const field of [
      'dependencies',
      'peerDependencies',
      'optionalDependencies',
    ]) {
      for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
        if (LOCAL_PROTOCOL.test(range)) {
          local.push(`${field}.${dep}: ${range}`);
        }
      }
    }
    expect(local).toEqual([]);
  });

  test('declares @carbon/* ranges that accept the rest of the release', () => {
    const mismatches = [];
    for (const field of ['dependencies', 'peerDependencies']) {
      for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
        const releaseVersion = releaseVersionOf(dep);
        if (
          releaseVersion &&
          !semver.satisfies(releaseVersion, range, { includePrerelease: true })
        ) {
          mismatches.push(
            `${field}.${dep} is "${range}" but the release has ${releaseVersion}`
          );
        }
      }
    }
    expect(mismatches).toEqual([]);
  });

  test('ships every file its manifest points to', () => {
    const missing = entryPoints(manifest)
      .filter(([, target]) => !targetExists(dir, target))
      .map(([field, target]) => `${field} -> ${target}`);
    expect(missing).toEqual([]);
  });

  test('has no publint errors', async () => {
    const { messages } = await publint({
      pkgDir: dir,
      level: 'error',
      pack: false,
    });
    expect(messages.map((message) => formatMessage(message, manifest))).toEqual(
      []
    );
  });

  test.runIf(
    Boolean(manifest.main || manifest.module) || hasRootEntry(manifest)
  )('resolves its root entry point in Node', () => {
    expect(
      runNode([
        '--input-type=module',
        '-e',
        `import.meta.resolve(${JSON.stringify(name)})`,
      ])
    ).toBeNull();
  });

  test.runIf(hasRootEntry(manifest) && config.nodeLoad !== false)(
    'loads in Node with import and require',
    () => {
      expect(
        runNode([
          '--input-type=module',
          '-e',
          `await import(${JSON.stringify(name)})`,
        ])
      ).toBeNull();
      if (manifest.type !== 'module') {
        expect(runNode(['-e', `require(${JSON.stringify(name)})`])).toBeNull();
      }
    }
  );
});

test('installs a single copy of each @carbon/* package', () => {
  const duplicates = [];
  for (const [name, copies] of installedCopies()) {
    const versions = new Set(copies.map((copy) => copy.version));
    if (versions.size > 1) {
      duplicates.push(
        `${name}: ${copies.map((c) => `${c.version} (${c.dir})`).join(', ')}`
      );
    }
  }
  expect(duplicates).toEqual([]);
});
