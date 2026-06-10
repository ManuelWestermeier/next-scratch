export const uid = (prefix = 'id') => `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
