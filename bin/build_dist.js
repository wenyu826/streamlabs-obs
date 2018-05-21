const packager = require('electron-packager');
const path = require('path');

const sourceDir = path.resolve(__dirname, '..');
const distDir = path.resolve(__dirname, '..', 'dist');
const mediaDir = path.resolve(__dirname, '..', 'media');

const options = {
	asar: {
		unpackDir: 'node_modules/obs-studio-node'
	},
	platform: 'win32',
	arch: 'x64',
	dir: sourceDir,
	out: distDir,
	executableName: 'Streamlabs OBS',
	icon: path.resolve(mediaDir, 'images', 'icon.ico'),
	ignore: (filepath) => {
		const whitelist = [
			'bundles',
			'node_modules',
			'vendor',
			'updater/index.html',
			'updater/Updater.js',
			'index.html',
			'main.js',
			'obs-api'
		];

		/* For whatever reason, the root directory
		 * is passed as an empty string */
		if (filepath === '') return false;

		/* A typical string looks like this:
		 * /bin/myfile.js
		 * It always starts with a forward slash
		 * regardless of platform. */
		const segments = filepath.split('/');

		if (whitelist.includes(segments[1]))
			return false;

		return true;
	}
};

packager(options);
