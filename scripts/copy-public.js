// Copie le site (public/) dans dist/public après la compilation,
// pour que l'application fonctionne même si seul le dossier dist est déployé.
const { cpSync, existsSync, rmSync } = require('fs');
const { join } = require('path');

const src = join(__dirname, '..', 'public');
const dest = join(__dirname, '..', 'dist', 'public');

if (!existsSync(src)) {
  console.error('Dossier public/ introuvable');
  process.exit(1);
}
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log('Site copié dans dist/public');

// Hostinger peut chercher le fichier d'entrée « dist/main.js » à l'intérieur
// du dossier de sortie « dist » (donc dist/dist/main.js). On crée ce relais
// pour que tous les réglages possibles démarrent la même application.
const { mkdirSync, writeFileSync } = require('fs');
const relayDir = join(__dirname, '..', 'dist', 'dist');
mkdirSync(relayDir, { recursive: true });
writeFileSync(join(relayDir, 'main.js'), "require('../main.js');\n");
console.log('Relais dist/dist/main.js créé');
