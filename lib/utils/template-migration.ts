import { TemplateField } from "@/lib/types/template";

export function migrateTemplateToVisual(titleTemplate: string, descriptionTemplate?: string | null): TemplateField[] {
  const fields: TemplateField[] = [];
  let fieldIdCounter = 1;

  const regex = /(\{[^}]+\})|([^{]+)/g;
  let match;

  while ((match = regex.exec(titleTemplate)) !== null) {
    const segment = match[0];

    if (segment.startsWith("{") && segment.endsWith("}")) {
      const variable = segment.slice(1, -1).toLowerCase();

      switch (variable) {
        case "date":
          fields.push({
            id: `field-${fieldIdCounter++}`,
            type: "date",
            value: new Date().toISOString().split("T")[0],
            label: "Date",
          });
          break;
        case "participant":
        case "person":
          fields.push({
            id: `field-${fieldIdCounter++}`,
            type: "person",
            value: "",
            label: "Person",
            placeholder: "Enter person name...",
          });
          break;
        case "project":
          fields.push({
            id: `field-${fieldIdCounter++}`,
            type: "project",
            value: "",
            label: "Project",
            placeholder: "Enter project name...",
          });
          break;
        case "topic":
        default:
          fields.push({
            id: `field-${fieldIdCounter++}`,
            type: "text",
            value: "",
            label: "Text",
            placeholder: `Enter ${variable}...`,
          });
          break;
      }
    } else {
      const trimmedText = segment.trim();
      if (trimmedText) {
        fields.push({
          id: `field-${fieldIdCounter++}`,
          type: "text",
          value: trimmedText,
          label: "Text",
        });
      }
    }
  }

  return fields;
}
