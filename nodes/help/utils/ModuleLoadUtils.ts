import fs from 'fs';
import path from 'path';

class ModuleLoadUtils {
	static loadModules(dirPath: string, expression: string) {
		const parts = expression.split('/');
		const filenamePattern = parts.pop() || '*';
		const searchDir = path.join(dirPath, ...parts);

		if (!fs.existsSync(searchDir) || !fs.statSync(searchDir).isDirectory()) {
			return [];
		}

		const suffix = filenamePattern.startsWith('*') ? filenamePattern.slice(1) : filenamePattern;
		const files = fs
			.readdirSync(searchDir)
			.filter((file) => file.endsWith(suffix) && !file.endsWith('.d.ts'))
			.sort();

		const modules = [];
		for (const file of files) {
			const fullpath = path.resolve(searchDir, file);
			const loaded = require(fullpath);
			modules.push({
				...loaded.default,
			});
		}

		return modules;
	}
}

export default ModuleLoadUtils;
