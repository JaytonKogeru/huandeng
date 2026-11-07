import type { Bounds, Diagnostic, PageSize, PageSnapshot, PptdElement } from './types';

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function references(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const item of value) references(item, found);
  else {
    const fields = record(value);
    if (fields)
      for (const [key, item] of Object.entries(fields)) {
        if ((key === 'src' || key === 'url') && typeof item === 'string' && item) found.add(item);
        else if (item && typeof item === 'object') references(item, found);
      }
  }
  return found;
}

export function rotatedElementBounds(bounds: Bounds, rotation = 0): Bounds {
  const [x, y, width, height] = bounds;
  const radians = (rotation * Math.PI) / 180;
  const extentWidth = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
  const extentHeight = Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));
  return [
    x + (width - extentWidth) / 2,
    y + (height - extentHeight) / 2,
    extentWidth,
    extentHeight,
  ];
}

export function technicalDiagnostics(page: PageSnapshot, size: PageSize): Diagnostic[] {
  const result: Diagnostic[] = [];
  const append = (
    code: string,
    message: string,
    severity: Diagnostic['severity'],
    elementId?: string,
    path?: string,
  ) => {
    result.push({
      code,
      message,
      severity,
      pageId: page.pageId,
      ...(elementId ? { elementId } : {}),
      ...(path ? { path } : {}),
    });
  };
  const validSize =
    Array.isArray(size) &&
    size.length === 2 &&
    size.every((value) => Number.isFinite(value) && value > 0);
  if (!validSize) append('QA_INVALID_PAGE_SIZE', '画布尺寸必须是两个大于零的有限数值。', 'error');
  const missing = new Set(
    Object.entries(page.assetRevisions ?? {})
      .filter(([, revision]) => revision === null)
      .map(([source]) => source),
  );
  const locatedAssets = new Set<string>();
  const inspectImage = (element: PptdElement, elementId?: string) => {
    if (typeof element.src !== 'string' || !element.src.trim()) {
      append(
        'QA_IMAGE_SOURCE_MISSING',
        '图片没有有效的资源路径，请选择原始图片。',
        'error',
        elementId,
      );
    }
    if (element.crop === undefined || element.crop === null) return;
    const crop = record(element.crop);
    const values = ['left', 'right', 'top', 'bottom'].map((side) => crop?.[side] ?? 0);
    if (!crop || !values.every((value) => typeof value === 'number' && Number.isFinite(value))) {
      append('QA_INVALID_IMAGE_CROP', '图片裁切比例必须是有限数值。', 'error', elementId);
      return;
    }
    const [left, right, top, bottom] = values as number[];
    if (left + right >= 1 || top + bottom >= 1) {
      append(
        'QA_INVALID_IMAGE_CROP',
        '图片裁切移除了整个源矩形，请减少裁切比例。',
        'error',
        elementId,
      );
    } else if (values.some((value) => (value as number) < 0)) {
      append(
        'QA_IMAGE_CROP_PADDING',
        '负裁切比例会在图片外扩展透明区域；PPTX 可能需要对象级图像回退。',
        'warning',
        elementId,
      );
    }
  };
  for (const element of page.data.elements) {
    const id = element.elementId;
    const bounds = element.bounds;
    if (!bounds) {
      append('QA_BOUNDS_MISSING', '对象没有显式位置与尺寸，当前显示使用默认外框。', 'warning', id);
    } else if (
      !Array.isArray(bounds) ||
      bounds.length !== 4 ||
      !bounds.every(Number.isFinite) ||
      bounds[2] < 0 ||
      bounds[3] < 0
    ) {
      append('QA_INVALID_BOUNDS', '对象外框必须包含有限坐标与非负尺寸。', 'error', id);
    } else {
      if (
        element.elementType === 'line'
          ? bounds[2] === 0 && bounds[3] === 0
          : bounds[2] === 0 || bounds[3] === 0
      ) {
        append('QA_ZERO_SIZE', '对象没有可见面积或线段长度，请检查宽度与高度。', 'warning', id);
      }
      if (!Number.isFinite(element.rotation ?? 0)) {
        append('QA_INVALID_ROTATION', '对象旋转角度必须是有限数值。', 'error', id);
      } else if (validSize) {
        const [x, y, width, height] = rotatedElementBounds(bounds, element.rotation);
        const tolerance = 1e-7;
        if (
          x < -tolerance ||
          y < -tolerance ||
          x + width > size[0] + tolerance ||
          y + height > size[1] + tolerance
        ) {
          append(
            'QA_OUTSIDE_CANVAS',
            '对象的旋转外框超出画布，演示或导出可能裁掉边缘；若是有意出血可保留。',
            'warning',
            id,
          );
        }
      }
    }
    if (element.elementType === 'image') inspectImage(element, id);
    for (const source of references(element)) {
      if (!missing.has(source)) continue;
      locatedAssets.add(source);
      append(
        'QA_ASSET_UNAVAILABLE',
        `无法读取资源 ${source}，请恢复原文件或更新资源路径。`,
        'error',
        id,
        source,
      );
    }
  }
  const background = record(page.data.background);
  if (background?.type === 'image')
    inspectImage({ ...background, elementId: '$background', elementType: 'image' });
  for (const source of missing) {
    if (!locatedAssets.has(source))
      append(
        'QA_ASSET_UNAVAILABLE',
        `无法读取页面或主题资源 ${source}，请恢复原文件或更新资源路径。`,
        'error',
        undefined,
        source,
      );
  }
  return result;
}

export function requestedPageFonts(page: PageSnapshot): string[] {
  const found = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === 'string') {
      for (const family of value.split(',')) {
        const name = family.trim().replace(/^(['"])(.*)\1$/, '$2');
        if (name && !name.startsWith('$')) found.add(name);
      }
    } else if (Array.isArray(value)) value.forEach(add);
    else if (record(value)) Object.values(value as Record<string, unknown>).forEach(add);
  };
  const visit = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(visit);
    else {
      const fields = record(value);
      if (fields)
        for (const [key, item] of Object.entries(fields)) {
          if (key === 'fontFamily') add(item);
          else if (item && typeof item === 'object') visit(item);
        }
    }
  };
  visit(page.data);
  visit(page.metadata.themeOverride);
  return [...found].sort((a, b) => a.localeCompare(b));
}
