const shell = require('shelljs');
const path = require('path');
const slobs_env = require(path.resolve(__dirname, '..', 'package.json'));

const slobsInstallerObjName = 'slobs.wixobj';
const slobsInstallerName = 'slobs-installer.msi';

const sourceDir = path.resolve(__dirname, '..');
const distDir = path.resolve(__dirname, '..', 'dist');
const mediaDir = path.resolve(__dirname, '..', 'media');
const packagedDir = path.resolve(distDir, 'slobs-client-win32-x64');
const installerDir = path.resolve(__dirname, '..', 'installer');
const wixLinkerOutput = path.resolve(distDir, slobsInstallerName);

let generateOnly = false;
let dryRun = false;

function custom_exec(command) {
	if (dryRun) {
		console.log(command);
		return;
	}

	const ret = shell.exec(command);

	if (ret.code != 0) {
		console.log(ret.stdout);
		process.exit(ret.code);
	}
}

function parseArguments() {
	for (let i = 2; i < process.argv.length; ++i) {
		switch (process.argv[i]) {
		case '--dry-run':
		case '-d':
			dryRun = true;
			break;
		case '--generate-only':
		case '-g':
			generateOnly = true;
			break;
		default:
			console.log(`Unknown option provided: ${process.argv[i]}`);
			process.exit(1);
		}
	}
}

function buildInstaller() {
	/*
	* This assumes that WiX binaries are in PATH.
	* I may provide a way to configure this later.
	*/

	/*
	* WiX is a lot like a C compiler.
	* It works really well with dependency
	* systems, of which we don't have available
	* to use. So this will act as a static list
	* of things to compile, link, and add to
	* the installer.
	*/
	wixHeatArgs = [
		'dir', packagedDir,
		'-nologo',
		'-cg', 'SlobsComponentGroup',
		'-gg',
		'-sreg',
		'-suid',
		'-srd',
		'-dr', 'APPLICATIONFOLDER',
		'-o', path.resolve(distDir, 'appfiles_generated.wxs'),
	];

	wixSrcFiles = [
		'app.wxs',
	];

	wixCandleArgs = [
		'-nologo',
		'-arch', 'x64',
		'-o', distDir.concat('\\'),
		/* This is a special argument since
		 * this is generated and placed in
		 * a different directory from the
		 * rest of the wxs source files */
		path.resolve(distDir, 'appfiles_generated.wxs')
	];

	wixObjFiles = [
		'app.wixobj',
		'appfiles_generated.wixobj'
	];

	wixLightArgs = [
		'-nologo',
		'-ext', 'WixUIExtension',
		'-b', packagedDir,
		'-b', installerDir,
		'-b', mediaDir,
		'-o', wixLinkerOutput
	];

	const addPrefixInstallDir = (elem, idx, array) => {
		array[idx] = path.join(installerDir, elem);
	};

	const addPrefixDistDir = (elem, idx, array) => {
		array[idx] = path.join(distDir, elem);
	};

	wixSrcFiles.forEach(addPrefixInstallDir);
	wixObjFiles.forEach(addPrefixDistDir);

	/* Generate distribution file list */
	const heatExecString = `heat ${wixHeatArgs.join(' ')}`
	const candleExecString = `candle ${wixCandleArgs.join(' ')} ${wixSrcFiles.join(' ')}`;
	const lightExecString = `light ${wixLightArgs.join(' ')} ${wixObjFiles.join(' ')}`;

	custom_exec(heatExecString);

	if (generateOnly) return;

	custom_exec(candleExecString);
	custom_exec(lightExecString);
}

parseArguments();
buildInstaller();