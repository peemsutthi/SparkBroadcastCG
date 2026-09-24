// npm run ship → release/SparkCG/ : SparkCG.exe + style/ + assets/ + app/.
// The exe is the official Windows node.exe with the bundled relay injected
// (Node single executable application), so it builds on any OS.
// ponytail: Windows x64 only; macOS needs darwin node + --macho-segment-name NODE_SEA + codesign.
import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { build } from 'vite'

const OUT = 'release/SparkCG'
const EXE = `${OUT}/SparkCG.exe`
const run = (cmd) => execSync(cmd, { stdio: 'inherit' })

rmSync('release', { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

run('npm run build')
// The relay, ws and sirv as one CommonJS file — the only shape a Node 22
// single executable accepts.
await build({
  configFile: false,
  root: 'server',
  logLevel: 'warn',
  build: {
    ssr: 'src/index.js',
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // ws's optional native speedups; it try/catches their absence.
      external: ['bufferutil', 'utf-8-validate'],
      output: { format: 'cjs', entryFileNames: 'relay.cjs' },
    },
  },
  ssr: { noExternal: true, target: 'node' },
})

writeFileSync(
  'release/sea-config.json',
  JSON.stringify({
    main: 'server/dist/relay.cjs',
    output: 'release/sea-prep.blob',
    disableExperimentalSEAWarning: true,
  }),
)
run('node --experimental-sea-config release/sea-config.json')

// Must be the same Node version that built the blob, or the exe won't start.
const url = `https://nodejs.org/dist/${process.version}/win-x64/node.exe`
const res = await fetch(url)
if (!res.ok) throw new Error(`${url}: ${res.status}`)
writeFileSync(EXE, Buffer.from(await res.arrayBuffer()))

run(
  `npx --yes postject ${EXE} NODE_SEA_BLOB release/sea-prep.blob ` +
    '--sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
)

for (const dir of ['style', 'assets', 'app']) cpSync(dir, `${OUT}/${dir}`, { recursive: true })
rmSync('release/sea-prep.blob')
rmSync('release/sea-config.json')
console.log(`shipped → ${OUT}`)
