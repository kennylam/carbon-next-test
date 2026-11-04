import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..'
);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export const config = readJson(path.join(repoRoot, 'carbon.config.json'));
export const release = readJson(path.join(repoRoot, 'carbon-release.json'));

/** Packages in the release set, with their config entry and installed manifest. */
export const packages = Object.entries(release.packages).map(
  ([name, version]) => {
    const dir = path.join(repoRoot, 'node_modules', name);
    return {
      name,
      version,
      dir,
      config: config.packages.find((pkg) => pkg.name === name) ?? {},
      manifest: readJson(path.join(dir, 'package.json')),
    };
  }
);

/** The version a release set expects, or null when the source is tarballs. */
export function expectedVersion(name) {
  const version = release.packages[name];
  return version?.startsWith('file:') ? null : version;
}

/** Every installed copy of a package under node_modules, keyed by version. */
export function installedCopies() {
  const copies = new Map();
  function visit(nodeModules) {
    if (!fs.existsSync(nodeModules)) {
      return;
    }
    for (const entry of fs.readdirSync(nodeModules)) {
      if (entry.startsWith('.')) {
        continue;
      }
      const scoped = entry.startsWith('@');
      const names = scoped
        ? fs
            .readdirSync(path.join(nodeModules, entry))
            .map((n) => `${entry}/${n}`)
        : [entry];
      for (const name of names) {
        const dir = path.join(nodeModules, name);
        const manifestPath = path.join(dir, 'package.json');
        if (!fs.existsSync(manifestPath)) {
          continue;
        }
        if (name.startsWith('@carbon/')) {
          const { version } = readJson(manifestPath);
          const list = copies.get(name) ?? [];
          list.push({ version, dir: path.relative(repoRoot, dir) });
          copies.set(name, list);
        }
        visit(path.join(dir, 'node_modules'));
      }
    }
  }
  visit(path.join(repoRoot, 'node_modules'));
  for (const workspaceDir of ['apps', 'tests']) {
    const parent = path.join(repoRoot, workspaceDir);
    for (const workspace of fs.readdirSync(parent)) {
      visit(path.join(parent, workspace, 'node_modules'));
    }
  }
  return copies;
}
