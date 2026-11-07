const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, 'dist');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

esbuild.buildSync({
  entryPoints: [path.resolve(__dirname, 'src/main.tsx')],
  bundle: true,
  outfile: path.resolve(outDir, 'bundle.js'),
  minify: true,
  conditions: ['style'],
  loader: { '.tsx': 'tsx', '.ts': 'ts', '.css': 'css' },
  alias: {
    '@': path.resolve(__dirname, 'src'),
    '@heroui/react': path.resolve(__dirname, '../web/lib/heroui-adapter.tsx'),
    '@heroui/styles/css': path.resolve(__dirname, '../web/node_modules/@heroui/styles/dist/index.css'),
    '@heroui/styles': path.resolve(__dirname, '../web/node_modules/@heroui/styles/dist/index.js'),
    'tailwindcss': path.resolve(__dirname, 'node_modules/tailwindcss/index.css'),
    '@printmart/shared': path.resolve(__dirname, '../../packages/shared/dist/index.js'),
    'react': path.resolve(__dirname, '../web/node_modules/react'),
    'react-dom': path.resolve(__dirname, '../web/node_modules/react-dom'),
    'lucide-react': path.resolve(__dirname, '../web/node_modules/lucide-react'),
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

let html = fs.readFileSync(path.resolve(__dirname, 'src/index.html'), 'utf8');
html = html.replace('/src/main.tsx', './bundle.js');
if (fs.existsSync(path.resolve(outDir, 'bundle.css'))) {
  html = html.replace('</head>', '  <link rel="stylesheet" href="./bundle.css" />\n  </head>');
}
fs.writeFileSync(path.resolve(outDir, 'index.html'), html);
console.log('Kiosk UI built successfully to dist/index.html');
