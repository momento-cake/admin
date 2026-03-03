import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Holiday } from '@/types/time-tracking'

const COLLECTION_NAME = 'holidays'

/**
 * Helper to convert Firestore document to Holiday
 */
function docToHoliday(docSnap: DocumentSnapshot): Holiday {
  const data = docSnap.data()
  if (!data) throw new Error('Dados do documento indefinidos')

  return {
    id: docSnap.id,
    date: data.date,
    name: data.name,
    type: data.type,
    year: data.year,
    createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
    createdBy: data.createdBy,
  }
}

/**
 * Get all holidays for a specific year
 */
export async function getHolidaysByYear(year: number): Promise<Holiday[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('year', '==', year)
    )
    const snapshot = await getDocs(q)

    const holidays = snapshot.docs.map(docToHoliday)
    // Sort in-memory to avoid requiring a composite index
    holidays.sort((a, b) => a.date.localeCompare(b.date))
    return holidays
  } catch (error) {
    console.error('Error fetching holidays:', error)
    throw new Error('Erro ao buscar feriados')
  }
}

/**
 * Create a new holiday
 */
export async function createHoliday(
  data: Omit<Holiday, 'id' | 'createdAt'>
): Promise<Holiday> {
  try {
    const holidayData = {
      ...data,
      createdAt: Timestamp.now(),
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), holidayData)

    return {
      ...data,
      id: docRef.id,
      createdAt: new Date(),
    }
  } catch (error) {
    console.error('Error creating holiday:', error)
    if (error instanceof Error) throw error
    throw new Error('Erro ao criar feriado')
  }
}

/**
 * Delete a holiday
 */
export async function deleteHoliday(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id))
  } catch (error) {
    console.error('Error deleting holiday:', error)
    if (error instanceof Error) throw error
    throw new Error('Erro ao excluir feriado')
  }
}

/**
 * Seed Brazilian national holidays for a given year
 */
export function getBrazilianNationalHolidays(year: number): Omit<Holiday, 'id' | 'createdAt' | 'createdBy'>[] {
  // Easter calculation (Meeus algorithm)
  const easterDate = calculateEaster(year)

  // Carnival: 47 days before Easter (Tuesday)
  const carnival = new Date(easterDate)
  carnival.setDate(carnival.getDate() - 47)
  const carnivalMon = new Date(carnival)
  carnivalMon.setDate(carnivalMon.getDate() - 1)

  // Good Friday: 2 days before Easter
  const goodFriday = new Date(easterDate)
  goodFriday.setDate(goodFriday.getDate() - 2)

  // Corpus Christi: 60 days after Easter
  const corpusChristi = new Date(easterDate)
  corpusChristi.setDate(corpusChristi.getDate() + 60)

  const formatDate = (d: Date): string => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const holidays: Omit<Holiday, 'id' | 'createdAt' | 'createdBy'>[] = [
    { date: `${year}-01-01`, name: 'Confraternizacao Universal', type: 'national', year },
    { date: formatDate(carnivalMon), name: 'Carnaval (Segunda)', type: 'national', year },
    { date: formatDate(carnival), name: 'Carnaval (Terca)', type: 'national', year },
    { date: formatDate(goodFriday), name: 'Sexta-feira Santa', type: 'national', year },
    { date: formatDate(easterDate), name: 'Pascoa', type: 'national', year },
    { date: `${year}-04-21`, name: 'Tiradentes', type: 'national', year },
    { date: `${year}-05-01`, name: 'Dia do Trabalho', type: 'national', year },
    { date: formatDate(corpusChristi), name: 'Corpus Christi', type: 'national', year },
    { date: `${year}-09-07`, name: 'Independencia do Brasil', type: 'national', year },
    { date: `${year}-10-12`, name: 'Nossa Senhora Aparecida', type: 'national', year },
    { date: `${year}-11-02`, name: 'Finados', type: 'national', year },
    { date: `${year}-11-15`, name: 'Proclamacao da Republica', type: 'national', year },
    { date: `${year}-12-25`, name: 'Natal', type: 'national', year },
    // SP Municipal
    { date: `${year}-01-25`, name: 'Aniversario de Sao Paulo', type: 'municipal', year },
  ]

  return holidays
}

/**
 * Calculate Easter date using Meeus algorithm
 */
function calculateEaster(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month - 1, day)
}
