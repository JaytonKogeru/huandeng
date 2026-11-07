export type IconStyle = 'fas' | 'far' | 'fab';
export interface ScientificIcon {
  name: string;
  prefix: IconStyle;
  width: number;
  height: number;
  paths: string[];
  aliases: string[];
}

type Definition = {
  iconName: string;
  icon: [number, number, (string | number)[], string, string | string[]];
};

const registries = new Map<IconStyle, Promise<Map<string, ScientificIcon>>>();

export function parseIconName(name: string): { prefix: IconStyle; name: string } {
  const parts = name.trim().split(':');
  const prefix = parts.length > 1 ? parts[0] : 'fas';
  if (prefix !== 'fas' && prefix !== 'far' && prefix !== 'fab') {
    throw new Error(`Unknown icon style: ${prefix}. Use fas:, far: or fab:.`);
  }
  return { prefix, name: (parts.length > 1 ? parts[1] : parts[0]).replace(/^fa-/, '') };
}

async function registry(prefix: IconStyle): Promise<Map<string, ScientificIcon>> {
  let result = registries.get(prefix);
  if (!result) {
    result = (async () => {
      const loaded =
        prefix === 'fas'
          ? (await import('@fortawesome/free-solid-svg-icons')).fas
          : prefix === 'far'
            ? (await import('@fortawesome/free-regular-svg-icons')).far
            : (await import('@fortawesome/free-brands-svg-icons')).fab;
      const icons = new Map<string, ScientificIcon>();
      for (const definition of Object.values(loaded) as Definition[]) {
        const [width, height, aliases, , data] = definition.icon;
        const icon: ScientificIcon = {
          name: definition.iconName,
          prefix,
          width,
          height,
          paths: Array.isArray(data) ? data : [data],
          aliases: aliases.filter((entry): entry is string => typeof entry === 'string'),
        };
        icons.set(icon.name, icon);
        for (const alias of icon.aliases) icons.set(alias, icon);
      }
      return icons;
    })();
    registries.set(prefix, result);
    result.catch(() => registries.delete(prefix));
  }
  return result;
}

export async function loadScientificIcon(raw: string): Promise<ScientificIcon> {
  const { prefix, name } = parseIconName(raw);
  const icon = (await registry(prefix)).get(name);
  if (!icon) throw new Error(`Icon ${raw} is not in the bundled Font Awesome Free library.`);
  return icon;
}

export async function searchScientificIcons(
  query: string,
  prefix: IconStyle = 'fas',
  limit = 48,
): Promise<ScientificIcon[]> {
  const icons = [...new Set((await registry(prefix)).values())];
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return icons
    .filter((icon) =>
      words.every((word) => [icon.name, ...icon.aliases].some((name) => name.includes(word))),
    )
    .slice(0, limit);
}
