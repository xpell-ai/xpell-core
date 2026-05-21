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

export type XpellSkillModule = {
  _name: string;
  _scope?: "server" | "client" | "shared";
  _description?: string;
  _ops?: XpellSkillCommand[];
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
  _exports?: {
    _xui_objects?: string[];
    _xui_fields?: string[];
    _nano_commands?: XpellSkillCommand[];
    _modules?: XpellSkillModule[];
    _client_ops?: XpellSkillCommand[];
    _server_ops?: XpellSkillCommand[];
  };
  _core_rules?: string[];
  _priority_rules?: string[];
  _canonical_examples?: Record<string, any>[];
  _anti_patterns?: Array<string | { _bad: any; _reason: string }>;
  _notes?: string[];
};