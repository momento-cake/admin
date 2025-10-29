/**
 * Special Dates Dashboard Data Transformer
 *
 * Transforms raw client data into the format needed for the dashboard.
 */

import { Client } from '@/types/client'
import { SpecialDateWithClient } from '@/lib/clients'
import {
  calculateDaysFromToday,
  getRelativeDateLabel,
  formatDisplayDate,
  getDateYear,
  getDateTypeLabel,
  isValidISODate
} from '@/lib/special-dates-utils'

/**
 * Transform client data into special date dashboard entries
 *
 * @param clients - Array of clients to transform
 * @param minDaysFromToday - Minimum days from today (inclusive, default -7)
 * @param maxDaysFromToday - Maximum days from today (inclusive, default 14)
 * @returns Array of special date entries sorted by days from today
 */
export function transformClientDatesToEntries(
  clients: Client[],
  minDaysFromToday: number = -7,
  maxDaysFromToday: number = 14
): SpecialDateWithClient[] {
  const entries: SpecialDateWithClient[] = []

  console.log(`🔄 Transforming dates with range: ${minDaysFromToday} to ${maxDaysFromToday} days`)

  for (const client of clients) {
    // Process special dates
    if (client.specialDates && client.specialDates.length > 0) {
      console.log(`📅 Client ${client.id} has ${client.specialDates.length} special dates`)
      for (const specialDate of client.specialDates) {
        if (!isValidISODate(specialDate.date)) {
          console.warn(`Invalid date format for client ${client.id}: ${specialDate.date}`)
          continue
        }

        const daysFromToday = calculateDaysFromToday(specialDate.date)
        console.log(`📌 Date ${specialDate.date}: ${daysFromToday} days from today`)

        // Filter by date range
        if (daysFromToday < minDaysFromToday || daysFromToday > maxDaysFromToday) {
          console.log(`   ❌ Filtered out (outside range ${minDaysFromToday} to ${maxDaysFromToday})`)
          continue
        }
        console.log(`   ✅ Included in results`)

        const yearOfDate = getDateYear(specialDate.date)

        entries.push({
          dateId: specialDate.id,
          date: specialDate.date,
          type: specialDate.type,
          description: specialDate.description,
          relatedPersonId: specialDate.relatedPersonId,
          notes: specialDate.notes,
          clientId: client.id,
          clientName: client.name,
          clientType: client.type,
          daysFromToday,
          displayDate: formatDisplayDate(specialDate.date, yearOfDate),
          relativeDate: getRelativeDateLabel(daysFromToday),
          yearOfDate
        })
      }
    }

    // Process related person birthdates
    if (client.relatedPersons && client.relatedPersons.length > 0) {
      for (const relatedPerson of client.relatedPersons) {
        if (!relatedPerson.birthDate || !isValidISODate(relatedPerson.birthDate)) {
          continue
        }

        const daysFromToday = calculateDaysFromToday(relatedPerson.birthDate)

        // Filter by date range
        if (daysFromToday < minDaysFromToday || daysFromToday > maxDaysFromToday) {
          continue
        }

        const yearOfDate = getDateYear(relatedPerson.birthDate)

        entries.push({
          dateId: `${client.id}-${relatedPerson.id}-birthdate`,
          date: relatedPerson.birthDate,
          type: 'birthday',
          description: 'Aniversário',
          relatedPersonId: relatedPerson.id,
          relatedPersonName: relatedPerson.name,
          notes: undefined,
          clientId: client.id,
          clientName: client.name,
          clientType: client.type,
          daysFromToday,
          displayDate: formatDisplayDate(relatedPerson.birthDate, yearOfDate),
          relativeDate: getRelativeDateLabel(daysFromToday),
          yearOfDate
        })
      }
    }
  }

  // Sort by days from today (closest first)
  return entries.sort((a, b) => a.daysFromToday - b.daysFromToday)
}

/**
 * Get the currently loaded date range
 *
 * @param pastDays - Number of days in the past to show
 * @param futureDays - Number of days in the future to show
 * @returns Object with min and max days from today
 */
export function getDateRangeBounds(
  pastDays: number,
  futureDays: number
): { minDays: number; maxDays: number } {
  return {
    minDays: -pastDays,
    maxDays: futureDays
  }
}

/**
 * Check if there are older dates (before the current range)
 *
 * @param clients - Array of clients
 * @param pastDays - Current number of past days shown
 * @returns True if there are dates older than the current range (or if we haven't explored very far back yet)
 */
export function hasOlderDates(clients: Client[], pastDays: number): boolean {
  // Allow exploration up to 1 year (365 days) in the past
  const maxExplorableHistoryDays = 365
  if (pastDays < maxExplorableHistoryDays) {
    return true
  }

  const { minDays } = getDateRangeBounds(pastDays, 0)

  for (const client of clients) {
    // Check special dates
    if (client.specialDates && client.specialDates.length > 0) {
      for (const specialDate of client.specialDates) {
        if (!isValidISODate(specialDate.date)) continue
        const daysFromToday = calculateDaysFromToday(specialDate.date)
        if (daysFromToday < minDays) return true
      }
    }

    // Check related person birthdates
    if (client.relatedPersons && client.relatedPersons.length > 0) {
      for (const relatedPerson of client.relatedPersons) {
        if (!relatedPerson.birthDate || !isValidISODate(relatedPerson.birthDate)) continue
        const daysFromToday = calculateDaysFromToday(relatedPerson.birthDate)
        if (daysFromToday < minDays) return true
      }
    }
  }

  return false
}

/**
 * Check if there are future dates (after the current range)
 *
 * @param clients - Array of clients
 * @param futureDays - Current number of future days shown
 * @returns True if there are dates further in the future than the current range (or if we haven't explored very far ahead yet)
 */
export function hasFutureDates(clients: Client[], futureDays: number): boolean {
  // Allow exploration up to 1 year (365 days) in the future
  const maxExplorableFutureDays = 365
  if (futureDays < maxExplorableFutureDays) {
    return true
  }

  const { maxDays } = getDateRangeBounds(0, futureDays)

  for (const client of clients) {
    // Check special dates
    if (client.specialDates && client.specialDates.length > 0) {
      for (const specialDate of client.specialDates) {
        if (!isValidISODate(specialDate.date)) continue
        const daysFromToday = calculateDaysFromToday(specialDate.date)
        if (daysFromToday > maxDays) return true
      }
    }

    // Check related person birthdates
    if (client.relatedPersons && client.relatedPersons.length > 0) {
      for (const relatedPerson of client.relatedPersons) {
        if (!relatedPerson.birthDate || !isValidISODate(relatedPerson.birthDate)) continue
        const daysFromToday = calculateDaysFromToday(relatedPerson.birthDate)
        if (daysFromToday > maxDays) return true
      }
    }
  }

  return false
}
