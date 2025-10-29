/**
 * Special Dates Dashboard Utilities
 *
 * This module provides utility functions for the Special Dates dashboard,
 * including date calculations, formatting, and type conversions.
 */

/**
 * Calculate the number of days from today to a given date.
 *
 * Handles recurring dates (e.g., birthdays) by calculating days to the
 * next occurrence of the date in the current or following year.
 *
 * @param dateString - ISO format date string (YYYY-MM-DD)
 * @returns Number of days from today (negative for past, positive for future, 0 for today)
 */
export function calculateDaysFromToday(dateString: string): number {
  const [year, month, day] = dateString.split('-').map(Number)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Create date for current year
  let dateThisYear = new Date(today.getFullYear(), month - 1, day)
  dateThisYear.setHours(0, 0, 0, 0)

  // If date already passed this year, use next year
  if (dateThisYear < today) {
    dateThisYear = new Date(today.getFullYear() + 1, month - 1, day)
    dateThisYear.setHours(0, 0, 0, 0)
  }

  const diff = dateThisYear.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Get a human-readable label for the relative date from today.
 *
 * Examples: "Hoje!", "Em 5 dias", "Há 3 dias"
 *
 * @param daysFromToday - Number of days from today
 * @returns Portuguese formatted relative date string
 */
export function getRelativeDateLabel(daysFromToday: number): string {
  if (daysFromToday === 0) {
    return 'Hoje!'
  }

  if (daysFromToday === 1) {
    return 'Amanhã'
  }

  if (daysFromToday === -1) {
    return 'Ontem'
  }

  if (daysFromToday > 0) {
    return `Em ${daysFromToday} dia${daysFromToday === 1 ? '' : 's'}`
  }

  // Past dates
  const absDays = Math.abs(daysFromToday)
  return `Há ${absDays} dia${absDays === 1 ? '' : 's'}`
}

/**
 * Format a date string to Portuguese display format.
 *
 * @param dateString - ISO format date string (YYYY-MM-DD)
 * @param year - The year to use in the display (current or next year)
 * @returns Formatted date string, e.g., "15 de março de 2025"
 */
export function formatDisplayDate(dateString: string, year: number): string {
  const [_, month, day] = dateString.split('-').map(Number)

  const monthNames: Record<number, string> = {
    1: 'janeiro',
    2: 'fevereiro',
    3: 'março',
    4: 'abril',
    5: 'maio',
    6: 'junho',
    7: 'julho',
    8: 'agosto',
    9: 'setembro',
    10: 'outubro',
    11: 'novembro',
    12: 'dezembro'
  }

  const monthName = monthNames[month]
  return `${day} de ${monthName} de ${year}`
}

/**
 * Get the year for the next occurrence of a date.
 *
 * @param dateString - ISO format date string (YYYY-MM-DD)
 * @returns Year for the next occurrence of the date
 */
export function getDateYear(dateString: string): number {
  const [_year, month, day] = dateString.split('-').map(Number)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dateThisYear = new Date(today.getFullYear(), month - 1, day)
  dateThisYear.setHours(0, 0, 0, 0)

  if (dateThisYear < today) {
    return today.getFullYear() + 1
  }

  return today.getFullYear()
}

/**
 * Get the localized label for a special date type.
 *
 * @param type - The special date type ('birthday', 'anniversary', 'custom', etc.)
 * @returns Portuguese label for the date type
 */
export function getDateTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'birthday': 'Aniversário',
    'anniversary': 'Aniversário de Casamento',
    'custom': 'Customizado',
    'company-anniversary': 'Aniversário da Empresa'
  }

  return labels[type] || type
}

/**
 * Get an emoji for a special date type.
 *
 * @param type - The special date type
 * @returns Emoji representing the date type
 */
export function getDateTypeEmoji(type: string): string {
  const emojis: Record<string, string> = {
    'birthday': '🎂',
    'anniversary': '💍',
    'custom': '📅',
    'company-anniversary': '🏢'
  }

  return emojis[type] || '📅'
}

/**
 * Filter dates by date range (days from today).
 *
 * @param daysArray - Array of day counts to filter
 * @param minDays - Minimum days from today (inclusive)
 * @param maxDays - Maximum days from today (inclusive)
 * @returns Filtered array of day counts
 */
export function filterByDayRange(
  daysArray: number[],
  minDays: number,
  maxDays: number
): number[] {
  return daysArray.filter(days => days >= minDays && days <= maxDays)
}

/**
 * Sort dates by proximity to today (ascending).
 *
 * @param dates - Array of objects with daysFromToday property
 * @returns Sorted array
 */
export function sortByDaysFromToday<T extends { daysFromToday: number }>(
  dates: T[]
): T[] {
  return [...dates].sort((a, b) => a.daysFromToday - b.daysFromToday)
}

/**
 * Check if a date is valid ISO format (YYYY-MM-DD).
 *
 * @param dateString - String to validate
 * @returns True if valid ISO date format
 */
export function isValidISODate(dateString: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!isoDateRegex.test(dateString)) {
    return false
  }

  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}
