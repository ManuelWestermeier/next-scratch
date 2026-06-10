export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export const snap = (value: number, grid: number) => grid > 0 ? Math.round(value / grid) * grid : value

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
