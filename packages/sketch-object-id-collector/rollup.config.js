import typescript from 'rollup-plugin-typescript2';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json'
import pkg from './package.json';
import { banner } from '../../config/banner';

const NODE_NATIVES = ['path', 'fs', 'os', 'buffer', 'crypto', 'util', 'child_process', 'perf_hooks'];
const DEPENDENCIES = pkg.dependencies ? Object.keys(pkg.dependencies) : [];


const plugins = [
  json(),
  typescript({ tsconfig: './tsconfig.json', useTsconfigDeclarationDir: true }),
  resolve(), // so Rollup can find `ms`
  commonjs(), // so Rollup can convert `ms` to an ES module
];

const external = [
  ...NODE_NATIVES,
  ...DEPENDENCIES,
];


export default [
  {
    input: 'src/index.ts',
    output: [
      {
        name: 'sketch-object-id-collector',
        file: pkg.main,
        format: 'cjs',
        sourcemap: true,
        banner: banner(pkg),
      },
    ],
    external,
    plugins,
  },
  {
    input: 'src/bin.ts',
    output: [
      {
        name: 'sketch-object-id-collector-executeable',
        file: 'lib/bin.js',
        format: 'cjs',
        sourcemap: true,
        banner: `#!/usr/bin/env node\n\n${banner(pkg)}`,
      },
    ],
    external,
    plugins,
  },
]
