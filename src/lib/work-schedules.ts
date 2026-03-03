import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { WorkSchedule } from '@/types/time-tracking'

const COLLECTION_NAME = 'work_schedules'

/**
 * Helper to convert Firestore document to WorkSchedule
 */
function docToWorkSchedule(docSnap: DocumentSnapshot): WorkSchedule {
  const data = docSnap.data()
  if (!data) throw new Error('Dados do documento indefinidos')

  return {
    id: docSnap.id,
    userId: data.userId,
    name: data.name,
    hourlyRate: data.hourlyRate,
    weeklySchedule: data.weeklySchedule,
    lunchBreakMinimum: data.lunchBreakMinimum,
    lunchCompensation: data.lunchCompensation,
    effectiveFrom: data.effectiveFrom?.toDate?.() ?? new Date(data.effectiveFrom),
    effectiveTo: data.effectiveTo ? (data.effectiveTo.toDate?.() ?? new Date(data.effectiveTo)) : undefined,
    createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(data.updatedAt),
    createdBy: data.createdBy,
    lastModifiedBy: data.lastModifiedBy,
    isActive: data.isActive !== false,
  }
}

/**
 * Create a new work schedule
 */
export async function createWorkSchedule(
  data: Omit<WorkSchedule, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WorkSchedule> {
  try {
    const scheduleData = {
      ...data,
      effectiveFrom: Timestamp.fromDate(new Date(data.effectiveFrom)),
      effectiveTo: data.effectiveTo ? Timestamp.fromDate(new Date(data.effectiveTo)) : null,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), scheduleData)
    const createdDoc = await getDoc(docRef)

    if (!createdDoc.exists()) {
      throw new Error('Erro ao criar escala de trabalho')
    }

    return docToWorkSchedule(createdDoc)
  } catch (error) {
    console.error('Error creating work schedule:', error)
    if (error instanceof Error) throw error
    throw new Error('Erro ao criar escala de trabalho')
  }
}

/**
 * Update an existing work schedule
 */
export async function updateWorkSchedule(
  id: string,
  data: Partial<Omit<WorkSchedule, 'id' | 'createdAt'>>
): Promise<WorkSchedule> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Escala de trabalho não encontrada')
    }

    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: Timestamp.now(),
    }

    if (data.effectiveFrom) {
      updateData.effectiveFrom = Timestamp.fromDate(new Date(data.effectiveFrom))
    }
    if (data.effectiveTo !== undefined) {
      updateData.effectiveTo = data.effectiveTo
        ? Timestamp.fromDate(new Date(data.effectiveTo))
        : null
    }

    await updateDoc(docRef, updateData)
    const updatedDoc = await getDoc(docRef)

    if (!updatedDoc.exists()) {
      throw new Error('Erro ao atualizar escala de trabalho')
    }

    return docToWorkSchedule(updatedDoc)
  } catch (error) {
    console.error('Error updating work schedule:', error)
    if (error instanceof Error) throw error
    throw new Error('Erro ao atualizar escala de trabalho')
  }
}

/**
 * Soft delete a work schedule (mark as inactive)
 */
export async function deleteWorkSchedule(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error('Escala de trabalho não encontrada')
    }

    await updateDoc(docRef, {
      isActive: false,
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    console.error('Error deleting work schedule:', error)
    if (error instanceof Error) throw error
    throw new Error('Erro ao deletar escala de trabalho')
  }
}

/**
 * Get a single work schedule by ID
 */
export async function getWorkSchedule(id: string): Promise<WorkSchedule> {
  try {
    const docSnap = await getDoc(doc(db, COLLECTION_NAME, id))

    if (!docSnap.exists()) {
      throw new Error('Escala de trabalho não encontrada')
    }

    return docToWorkSchedule(docSnap)
  } catch (error) {
    console.error('Error fetching work schedule:', error)
    if (error instanceof Error) throw error
    throw new Error('Erro ao buscar escala de trabalho')
  }
}

/**
 * Get all active work schedules
 */
export async function getWorkSchedules(): Promise<WorkSchedule[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('isActive', '==', true)
    )
    const snapshot = await getDocs(q)

    const schedules = snapshot.docs.map(docToWorkSchedule)
    // Sort in-memory to avoid requiring a composite index
    schedules.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return schedules
  } catch (error) {
    console.error('Error fetching work schedules:', error)
    throw new Error('Erro ao buscar escalas de trabalho')
  }
}

/**
 * Get the active schedule for a specific employee
 */
export async function getEmployeeSchedule(userId: string): Promise<WorkSchedule | null> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      where('isActive', '==', true)
    )
    const snapshot = await getDocs(q)

    if (snapshot.empty) return null

    // Return the most recent active schedule
    const schedules = snapshot.docs.map(docToWorkSchedule)
    schedules.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())
    return schedules[0]
  } catch (error) {
    console.error('Error fetching employee schedule:', error)
    throw new Error('Erro ao buscar escala do funcionário')
  }
}

/**
 * Assign a schedule to an employee by creating a copy with the employee's userId
 */
export async function assignScheduleToEmployee(
  scheduleId: string,
  userId: string,
  assignedBy: string
): Promise<WorkSchedule> {
  try {
    const template = await getWorkSchedule(scheduleId)

    const newSchedule = await createWorkSchedule({
      userId,
      name: template.name,
      hourlyRate: template.hourlyRate,
      weeklySchedule: template.weeklySchedule,
      lunchBreakMinimum: template.lunchBreakMinimum,
      lunchCompensation: template.lunchCompensation,
      effectiveFrom: new Date(),
      isActive: true,
      createdBy: assignedBy,
      lastModifiedBy: assignedBy,
    })

    return newSchedule
  } catch (error) {
    console.error('Error assigning schedule to employee:', error)
    if (error instanceof Error) throw error
    throw new Error('Erro ao atribuir escala ao funcionário')
  }
}
