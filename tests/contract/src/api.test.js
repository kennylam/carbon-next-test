import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  API_KINDS,
  diffApi,
  installPublished,
  previousVersion,
  readApi,
} from './api.js';
import { config, packages, repoRoot } from './release.js';

const acknowledged = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'api-changes.json'), 'utf8')
);
const reportPath = path.join(repoRoot, 'reports', 'api-diff.md');
const report = [];

async function baseline(name, installed) {
  const fromTag = packages.find((pkg) => pkg.name === name).version;
  if (fromTag.startsWith('file:')) {
    const response = await fetch(
      `https://registry.npmjs.org/-/package/${name.replace('/', '%2f')}/dist-tags`
    );
    return (await response.json())[config.defaultTag] ?? null;
  }
  return previousVersion(name, installed);
}

const targets = packages.filter(({ name }) => API_KINDS[name]);

describe.each(targets)('$name public API', ({ name, dir, manifest }) => {
  test.each(API_KINDS[name])(
    '%s removals since the previous release are acknowledged',
    async (kind) => {
      const previous = await baseline(name, manifest.version);
      if (!previous || previous === manifest.version) {
        report.push(`- \`${name}\` ${kind}: no earlier release to compare`);
        return;
      }
      const before = readApi(installPublished(name, previous), kind);
      const after = readApi(dir, kind);
      const { added, removed } = diffApi(before, after);
      const allowed = new Set(acknowledged[name]?.[manifest.version] ?? []);

      report.push(
        `- \`${name}\` ${kind} ${previous} → ${manifest.version}: ` +
          `${added.length} added, ${removed.length} removed`
      );
      for (const entry of removed) {
        report.push(
          `  - removed \`${entry}\`${allowed.has(entry) ? ' (acknowledged)' : ''}`
        );
      }
      for (const entry of added) {
        report.push(`  - added \`${entry}\``);
      }
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(
        reportPath,
        `## Public API changes\n\n${report.join('\n')}\n`
      );

      expect(removed.filter((entry) => !allowed.has(entry))).toEqual([]);
    },
    180_000
  );
});
