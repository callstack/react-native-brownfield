export interface MethodParam {
  name: string;
  type: string;
  optional: boolean;
}

export interface MethodSignature {
  name: string;
  params: MethodParam[];
  returnType: string;
  isAsync: boolean;
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
}
