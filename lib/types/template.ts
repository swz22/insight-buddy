export type TemplateFieldType = "text" | "date" | "person" | "project";

export interface TemplateField {
  id: string;
  type: TemplateFieldType;
  value: string;
  label?: string;
  placeholder?: string;
}

export interface VisualTemplate {
  id: string;
  name: string;
  fields: TemplateField[];
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateFieldConfig {
  type: TemplateFieldType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  defaultValue: () => string;
  placeholder: string;
}
