import ResourceBuilder from './ResourceBuilder';
import { ResourceOperation, ResourceOptions } from '../type/IResource';
import ModuleLoadUtils from '../utils/ModuleLoadUtils';

class ResourceFactory {
	static build(basedir: string): ResourceBuilder {
		const resourceBuilder = new ResourceBuilder();
		const resources: ResourceOptions[] = ModuleLoadUtils.loadModules(basedir, 'resource/*.js');
		resources.sort((a, b) => {
			if (!a.order) a.order = 0;
			if (!b.order) b.order = 0;
			return a.order - b.order;
		});
		resources.forEach((resource: ResourceOptions) => {
			resourceBuilder.addResource(resource);
			const operations: ResourceOperation[] = ModuleLoadUtils.loadModules(
				basedir,
				`resource/${resource.value}/*.js`,
			);
			operations.sort((a, b) => {
				if (!a.order) a.order = 0;
				if (!b.order) b.order = 0;
				return a.order - b.order;
			});
			operations.forEach((operation: ResourceOperation) => {
				resourceBuilder.addOperation(resource.value as string, operation);
			});
		});
		return resourceBuilder;
	}
}

export default ResourceFactory;
