export interface OpenAPISpec {
    openapi: string;
    info: {
        title: string;
        description?: string;
        version: string;
    };
    servers?: Array<{
        url: string;
        description?: string;
    }>;
    paths: Record<string, any>;
    components: {
        schemas: Record<string, any>;
    };
}
export declare const openApiSpec: OpenAPISpec;
export default openApiSpec;
