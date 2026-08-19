const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

export function formatTickets(value: number): string {
  return new Intl.NumberFormat('de-DE').format(value)
}

export function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${formatTickets(value)}`
}
