export function formatCurrency(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(iso))
}

export function formatArea(v: number, unit: string): string {
  return `${v.toLocaleString('pt-BR')} ${unit}`
}

export function formatPercentual(v: number): string {
  return `${(v * 100).toFixed(2)}%`
}

export function formatNationalPhone(digits: string): string {
  if (!digits) return ''
  if (digits.length <= 2) return `(${digits}`
  const ddd = digits.slice(0, 2)
  const local = digits.slice(2)
  if (!local.length) return `(${ddd}) `
  if (local.length <= 4) return `(${ddd}) ${local}`
  return `(${ddd}) ${local.slice(0, local.length - 4)}-${local.slice(-4)}`
}
