export interface CallbackParam {
  name: string;
  type: string;
  optional: boolean;
}

export interface CallbackSignature {
  params: CallbackParam[];
  returnType: string;
}

export interface MethodParam {
  name: string;
  type: string;
  optional: boolean;
  callback?: CallbackSignature;
}

export interface MethodSignature {
  name: string;
  params: MethodParam[];
  returnType: string;
  isAsync: boolean;
  promiseReturnType?: string;
}

export interface TypeDeclaration {
  name: string;
  declaration: string;
}

export interface ModelFieldDefinition {
  name: string;
  type: string;
  optional: boolean;
}

export interface ModelDefinition {
  name: string;
  fields: ModelFieldDefinition[];
}

export interface ParsedNavigationSpec {
  methods: MethodSignature[];
  referencedTypeDeclarations: TypeDeclaration[];
  modelDefinitions: ModelDefinition[];
}

export interface GeneratedNavigationArtifacts {
  turboModuleSpec: string;
  indexTs: string;
  indexJs: string;
  indexDts: string;
  swiftDelegate: string;
  objcImplementation: string;
  kotlinDelegate: string;
  kotlinModule: string;
  swiftModels?: string;
  kotlinModels?: string;
}
