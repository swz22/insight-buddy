import { format } from "date-fns";

export interface TemplateVariables {
  date?: Date;
  participant?: string;
  project?: string;
  topic?: string;
  [key: string]: string | Date | undefined;
}

export function interpolateTemplate(template: string, variables: TemplateVariables): string {
  let result = template;

  // Handle date variable
  if (variables.date) {
    result = result.replace(/{date}/g, format(variables.date, "MMM d, yyyy"));
  }

  // Handle other variables
  Object.entries(variables).forEach(([key, value]) => {
    if (key !== "date" && value) {
      const regex = new RegExp(`{${key}}`, "g");
      result = result.replace(regex, String(value));
    }
  });

  // Remove any remaining placeholders
  result = result.replace(/{[^}]+}/g, "");

  return result.trim();
}

export function extractTemplateVariables(template: string): string[] {
  const matches = template.match(/{([^}]+)}/g);
  if (!matches) return [];

  return matches.map((match) => match.slice(1, -1)).filter((variable, index, self) => self.indexOf(variable) === index);
}

export function validateTemplate(template: string): { valid: boolean; error?: string } {
  if (!template.trim()) {
    return { valid: false, error: "Template cannot be empty" };
  }

  const variables = extractTemplateVariables(template);
  const allowedVariables = ["date", "participant", "project", "topic"];

  const invalidVariables = variables.filter((v) => !allowedVariables.includes(v));
  if (invalidVariables.length > 0) {
    return {
      valid: false,
      error: `Invalid variables: ${invalidVariables.join(", ")}. Allowed: ${allowedVariables.join(", ")}`,
    };
  }

  return { valid: true };
}
