/** Id brevi e stabili per gli oggetti salvati in locale. */
export function uid(prefix = ''): string {
  const rnd = Math.random().toString(36).slice(2, 9)
  return `${prefix}${Date.now().toString(36)}${rnd}`
}
