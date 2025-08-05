export const tri_func = (dr) => {
  const theta = 4 * Math.PI * dr;

  const R = 6;
  const r = 4;
  const d = 4;

  const x = (R - r) * Math.cos(theta) + d * Math.cos(((R - r) / r) * theta);
  const y = (R - r) * Math.sin(theta) - d * Math.sin(((R - r) / r) * theta);
  const z = 0;

  return [x, y, z];
};
