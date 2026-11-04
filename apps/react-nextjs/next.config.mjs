import path from 'node:path';

/** @type {import('next').NextConfig} */
export default {
  turbopack: {
    root: path.resolve(import.meta.dirname, '../..'),
  },
};
