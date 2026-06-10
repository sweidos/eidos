// Minimal OpenAPI 3.x type definitions — only what eidos-gen needs.

export interface OpenAPISpec {
  openapi: string;
  info?: { title?: string; version?: string };
  paths?: Record<string, PathItem>;
  components?: { schemas?: Record<string, SchemaObject> };
}

export interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  patch?: Operation;
  delete?: Operation;
  parameters?: ParameterObject[];
}

export interface Operation {
  operationId?: string;
  summary?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses?: Record<string, ResponseObject>;
}

export interface ParameterObject {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  schema?: SchemaObject;
}

export interface RequestBodyObject {
  required?: boolean;
  content?: Record<string, MediaTypeObject>;
}

export interface ResponseObject {
  description?: string;
  content?: Record<string, MediaTypeObject>;
}

export interface MediaTypeObject {
  schema?: SchemaObject;
}

export interface SchemaObject {
  type?: string;
  format?: string;
  $ref?: string;
  items?: SchemaObject;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  description?: string;
  enum?: unknown[];
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  additionalProperties?: boolean | SchemaObject;
  nullable?: boolean;
}
