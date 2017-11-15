/**
 * This script downloads and exctracts the specified release of
 * the facemask plugin into the node-obs directory.
 */

const FACEMASK_VERSION = '0.3.0';

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const childProcess = require('child_process');

const archivePath = path.join(os.tmpdir(), `obs-facemask-${FACEMASK_VERSION}.zip`);
const archive = fs.createWriteStream(archivePath);

const zipExe = path.resolve(__dirname, '..', 'node_modules', '7zip-bin-win', 'x64', '7za.exe');
const slobsDir = path.resolve(__dirname, '..');
const nodeObsPath = path.join(slobsDir, 'node-obs');

if (!fs.existsSync(nodeObsPath)) {
  throw new Error('Node OBS must be installed! Try running "yarn install-node-obs" first.');
}

const releaseUrl = `https://github.com/stream-labs/obs-facemask-plugin/releases/download/` +
  `${FACEMASK_VERSION}/obs-facemask-plugin-${FACEMASK_VERSION}.zip`;

archive.on('finish', () => {
  childProcess.exec(`"${zipExe}" x "${archivePath}" -o"${slobsDir}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Extraction error: ${error}`);
      return;
    }

    console.log(stdout);
    console.log(stderr);
  });
});

https.get(releaseUrl, response => {
  // Follow redirect
  https.get(response.headers.location, response => response.pipe(archive));
});
