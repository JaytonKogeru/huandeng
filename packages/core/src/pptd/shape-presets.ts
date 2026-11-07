export const SHAPE_PRESETS: [string, string][] = [
  ['rect', '矩形'],
  ['roundRect', '圆角矩形'],
  ['ellipse', '椭圆'],
  ['triangle', '三角形'],
  ['rtTriangle', '直角三角形'],
  ['diamond', '菱形'],
  ['parallelogram', '平行四边形'],
  ['trapezoid', '梯形'],
  ['pentagon', '五边形'],
  ['hexagon', '六边形'],
  ['octagon', '八边形'],
  ['rightArrow', '右箭头'],
  ['leftArrow', '左箭头'],
  ['upArrow', '上箭头'],
  ['downArrow', '下箭头'],
  ['leftRightArrow', '双向箭头'],
  ['upDownArrow', '上下箭头'],
  ['chevron', '折线箭头'],
  ['plus', '加号'],
  ['star5', '五角星'],
  ['heart', '心形'],
];

function polygon(points: number[][]): string {
  return `${points.map((point, index) => `${index ? 'L' : 'M'}${point[0]} ${point[1]}`).join(' ')} Z`;
}

export function presetShapePath(name: string, width: number, height: number): string | null {
  const points = (values: number[][]) => polygon(values.map(([x, y]) => [x * width, y * height]));
  if (name === 'triangle')
    return points([
      [0.5, 0],
      [1, 1],
      [0, 1],
    ]);
  if (name === 'diamond')
    return points([
      [0.5, 0],
      [1, 0.5],
      [0.5, 1],
      [0, 0.5],
    ]);
  if (name === 'chevron')
    return points([
      [0, 0],
      [0.65, 0],
      [1, 0.5],
      [0.65, 1],
      [0, 1],
      [0.35, 0.5],
    ]);
  if (name === 'rightArrow' || name === 'leftArrow') {
    const values = [
      [0, 0.25],
      [0.6, 0.25],
      [0.6, 0],
      [1, 0.5],
      [0.6, 1],
      [0.6, 0.75],
      [0, 0.75],
    ];
    return points(name === 'leftArrow' ? values.map(([x, y]) => [1 - x, y]) : values);
  }
  if (name === 'rtTriangle')
    return points([
      [0, 0],
      [1, 1],
      [0, 1],
    ]);
  if (name === 'parallelogram')
    return points([
      [0.25, 0],
      [1, 0],
      [0.75, 1],
      [0, 1],
    ]);
  if (name === 'trapezoid')
    return points([
      [0.2, 0],
      [0.8, 0],
      [1, 1],
      [0, 1],
    ]);
  if (name === 'hexagon')
    return points([
      [0.25, 0],
      [0.75, 0],
      [1, 0.5],
      [0.75, 1],
      [0.25, 1],
      [0, 0.5],
    ]);
  if (name === 'pentagon' || name === 'octagon') {
    const count = name === 'pentagon' ? 5 : 8;
    const offset = name === 'pentagon' ? -Math.PI / 2 : Math.PI / 8;
    return polygon(
      Array.from({ length: count }, (_, index) => [
        width / 2 + (width / 2) * Math.cos(offset + (index * 2 * Math.PI) / count),
        height / 2 + (height / 2) * Math.sin(offset + (index * 2 * Math.PI) / count),
      ]),
    );
  }
  if (name === 'upArrow' || name === 'downArrow') {
    const values = [
      [0.5, 0],
      [1, 0.4],
      [0.75, 0.4],
      [0.75, 1],
      [0.25, 1],
      [0.25, 0.4],
      [0, 0.4],
    ];
    return points(name === 'downArrow' ? values.map(([x, y]) => [x, 1 - y]) : values);
  }
  if (name === 'leftRightArrow' || name === 'upDownArrow') {
    const values = [
      [0, 0.5],
      [0.3, 0],
      [0.3, 0.25],
      [0.7, 0.25],
      [0.7, 0],
      [1, 0.5],
      [0.7, 1],
      [0.7, 0.75],
      [0.3, 0.75],
      [0.3, 1],
    ];
    return points(name === 'upDownArrow' ? values.map(([x, y]) => [y, x]) : values);
  }
  if (name === 'plus')
    return points([
      [0.33, 0],
      [0.67, 0],
      [0.67, 0.33],
      [1, 0.33],
      [1, 0.67],
      [0.67, 0.67],
      [0.67, 1],
      [0.33, 1],
      [0.33, 0.67],
      [0, 0.67],
      [0, 0.33],
      [0.33, 0.33],
    ]);
  if (name === 'star5')
    return polygon(
      Array.from({ length: 10 }, (_, index) => {
        const radius = index % 2 ? 0.4 : 1;
        const angle = -Math.PI / 2 + (index * Math.PI) / 5;
        return [
          width / 2 + (width / 2) * radius * Math.cos(angle),
          height / 2 + (height / 2) * radius * Math.sin(angle),
        ];
      }),
    );
  if (name === 'heart')
    return `M${width / 2} ${height} C${width * 0.45} ${height * 0.87},0 ${height * 0.55},0 ${height * 0.27} C0 ${-height * 0.07},${width * 0.4} ${-height * 0.12},${width / 2} ${height * 0.2} C${width * 0.6} ${-height * 0.12},${width} ${-height * 0.07},${width} ${height * 0.27} C${width} ${height * 0.55},${width * 0.55} ${height * 0.87},${width / 2} ${height} Z`;
  return null;
}
