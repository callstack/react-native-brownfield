import path from 'node:path';
import fs from 'node:fs';

/**
 * Renders a template file for the specified platform with given parameters
 * @param platform The platform name (specifies the subdirectory of template/)
 * @param name The template file name (with extension)
 * @param params The params to be replaced in the template
 * @returns The rendered template content
 */
export function renderTemplate(
  platform: 'ios' | 'android',
  name: string,
  params?: Record<`{{${string}}}`, unknown>
): string {
  const templatePath = path.join(__dirname, platform, name);

  let templateContent = fs.readFileSync(templatePath, 'utf8');

  for (const [key, value] of Object.entries(params ?? {})) {
    const regex = new RegExp(key, 'g');
    templateContent = templateContent.replace(regex, String(value));
  }

  return templateContent;
}
