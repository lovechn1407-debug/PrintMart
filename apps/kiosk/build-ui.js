const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outDir = path.resolve(__dirname, 'dist');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Compile Tailwind CSS v4 to dist/bundle.css
console.log('Compiling Tailwind CSS v4 for Kiosk UI...');
try {
  execSync(`npx @tailwindcss/cli -i "${path.resolve(__dirname, 'src/index.css')}" -o "${path.resolve(outDir, 'bundle.css')}"`, {
    stdio: 'inherit',
    cwd: __dirname,
  });
} catch (cssErr) {
  console.warn('Tailwind CLI build warning:', cssErr);
}

// Bundle TypeScript/React UI
esbuild.buildSync({
  entryPoints: [path.resolve(__dirname, 'src/main.tsx')],
  bundle: true,
  outfile: path.resolve(outDir, 'bundle.js'),
  minify: true,
  loader: { '.tsx': 'tsx', '.ts': 'ts', '.css': 'empty' },
  alias: {
    '@': path.resolve(__dirname, 'src'),
    '@heroui/react': path.resolve(__dirname, 'src/heroui-adapter.tsx'),
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
