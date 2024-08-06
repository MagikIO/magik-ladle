import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'umd',
    name: 'magikLadle',
    sourcemap: true,
    globals: {
      consola: 'consola',
      'sql-template-tag': 'sql-template-tag',
      sqlite: 'sqlite',
      sqlite3: 'sqlite3',
    },
  },
  plugins: [
    nodeResolve({
      extensions: ['.js', '.ts'],
    }),
    commonjs(),
    json(),
    typescript({
      tsconfig: './tsconfig.json',
    }),
  ],
  external: [
    'consola',
    'sql-template-tag',
    'sqlite',
    'sqlite3',
  ],
};
