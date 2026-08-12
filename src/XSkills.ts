export type XpellSkillType =
  | "view-skill"
  | "flow-skill"
  | "entity-skill"
  | "runtime-api-skill"
  | "nano-command-pack"
  | "server-module-api"
  | "client-module-api"
  | "wormholes-protocol"
  | "xdata-skill"
  | "general";

export type XpellSkillCommand = {
  _name: string;
  _scope?: string;
  _description?: string;
  _params?: Record<string, any>;
  _example?: Record<string, any>;
};

export type XpellSkillInspectorField = {
  _key: string;
  _label?: string;
  _input?: "text" | "textarea" | "number" | "checkbox" | "select" | "json";
  _options?: string[];
  _placeholder?: string;
  _description?: string;
  _advanced?: boolean;
  _readonly?: boolean;
  _required?: boolean;
};

export type XpellSkillDesignAction = {
  _name: string;
  _title?: string;
  _description?: string;
  _danger?: boolean;
  _params?: Record<string, any>;
};

export type XpellSkillDesign = {
  _inspector?: {
    _fields?: XpellSkillInspectorField[];
    _sections?: Array<"properties" | "interactions" | "raw-json" | "danger">;
    sections?: Array<"properties" | "interactions" | "raw-json" | "danger">;
  };
  inspector?: {
    sections?: Array<"properties" | "interactions" | "raw-json" | "danger">;
  };
  _children?: {
    _allowed?: boolean;
    _accepted_types?: string[];
    _insert_modes?: Array<"inside" | "before" | "after">;
  };
  _palette?: {
    _title?: string;
    _category?: string;
    _icon?: string;
    _default_object?: Record<string, any>;
  };
  _actions?: XpellSkillDesignAction[];
};

export type XpellSkillModule = {
  _name: string;
  _scope?: "server" | "client" | "shared";
  _description?: string;
  _ops?: XpellSkillCommand[];
  _config?: XpellSkillInspectorField[];
};

export type XpellRuntimeTestScope =
  | "unit"
  | "runtime"
  | "integration"
  | "package"
  | "release"
  | "browser"
  | "performance"
  | (string & {});

export type XpellRuntimeTestTarget =
  | "shared"
  | "node"
  | "browser"
  | "server"
  | "client"
  | (string & {});

export type XpellRuntimeTestMetadata = {
  _id: string;
  _title: string;
  _owner: string;
  _suite: string;
  _scope: XpellRuntimeTestScope;
  _runtime: XpellRuntimeTestTarget;
  _description?: string;
  _profiles?: string[];
  _tags?: string[];
  _depends_on?: string[];
  _entry?: string;
};

export type XpellRuntimeTestProfileMetadata = {
  _id: string;
  _title: string;
  _description?: string;
  _includes?: string[];
  _depends_on?: string[];
  _tags?: string[];
};

export type XpellSkill = {
  _id: string;
  _title: string;
  _version: string;
  _active?: boolean;
  _type?: XpellSkillType;
  _description?: string;
  _requires?: string[];
  _match?: {
    _keywords?: string[];
    _requires_any?: string[];
    _requires_all?: string[];
    _exclude_keywords?: string[];
    _priority?: number;
  };
  _fields?: Record<string, any>;
  _design?: XpellSkillDesign;
  _exports?: {
    _xui_objects?: string[];
    _xui_fields?: string[];
    _nano_commands?: XpellSkillCommand[];
    _modules?: XpellSkillModule[];
    _client_ops?: XpellSkillCommand[];
    _server_ops?: XpellSkillCommand[];
    _tests?: XpellRuntimeTestMetadata[];
    _test_profiles?: XpellRuntimeTestProfileMetadata[];
  };
  _core_rules?: string[];
  _priority_rules?: string[];
  _canonical_examples?: Record<string, any>[];
  _anti_patterns?: Array<string | { _bad: any; _reason: string }>;
  _notes?: string[];
};
