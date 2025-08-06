export interface TemplateValidation {
  valid: boolean;
  error?: string;
}

export function validateTemplate(template: string): TemplateValidation {
  if (!template || template.trim().length === 0) {
    return { valid: false, error: "Template cannot be empty" };
  }

  if (template.length > 500) {
    return { valid: false, error: "Template is too long (max 500 characters)" };
  }

  const placeholderPattern = /\{\{([^}]+)\}\}/g;
  const matches = template.match(placeholderPattern);

  if (matches) {
    const validPlaceholders = ["date", "time", "participant", "project", "topic"];

    for (const match of matches) {
      const placeholder = match.replace(/[{}]/g, "").trim();

      if (!validPlaceholders.includes(placeholder)) {
        return {
          valid: false,
          error: `Invalid placeholder: ${placeholder}. Valid placeholders are: ${validPlaceholders.join(", ")}`,
        };
      }
    }
  }

  return { valid: true };
}

export function applyTemplate(template: string, values: Record<string, string>): string {
  let result = template;

  Object.entries(values).forEach(([key, value]) => {
    const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    result = result.replace(placeholder, value);
  });

  return result;
}

export function extractPlaceholders(template: string): string[] {
  const placeholderPattern = /\{\{([^}]+)\}\}/g;
  const placeholders: string[] = [];
  let match;

  while ((match = placeholderPattern.exec(template)) !== null) {
    const placeholder = match[1].trim();
    if (!placeholders.includes(placeholder)) {
      placeholders.push(placeholder);
    }
  }

  return placeholders;
}
