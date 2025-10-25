import { 
  RecipeSettings,
  RecipeCategory 
} from '@/types/recipe';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  query, 
  limit,
  Timestamp,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COLLECTION_NAME = 'recipe_settings';

// Helper function to convert Firestore document to RecipeSettings
function docToRecipeSettings(doc: DocumentSnapshot): RecipeSettings {
  const data = doc.data();
  if (!data) throw new Error('Document data is undefined');
  
  return {
    id: doc.id,
    laborHourRate: data.laborHourRate || 25.00, // Default R$ 25/hour
    defaultMargin: data.defaultMargin || 150.00, // Default 150% margin
    marginsByCategory: data.marginsByCategory || {},
    updatedAt: data.updatedAt?.toDate() || new Date()
  };
}

// Get current recipe settings (returns default if none exist)
export async function fetchRecipeSettings(): Promise<RecipeSettings> {
  try {
    console.log('🔍 Fetching recipe settings');

    // Get the most recent settings document
    const settingsQuery = query(
      collection(db, COLLECTION_NAME),
      limit(1)
    );

    const snapshot = await getDocs(settingsQuery);

    if (snapshot.empty) {
      // Return default settings if none exist
      console.log('📝 No settings found, returning defaults');
      return getDefaultRecipeSettings();
    }

    const settings = docToRecipeSettings(snapshot.docs[0]);
    console.log('✅ Recipe settings retrieved:', settings);

    return settings;
  } catch (error) {
    console.error('❌ Error fetching recipe settings:', error);
    // Return defaults on error to avoid blocking operations
    return getDefaultRecipeSettings();
  }
}

// Get specific recipe settings by ID
export async function fetchRecipeSettingsById(id: string): Promise<RecipeSettings> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Configurações não encontradas');
    }
    
    return docToRecipeSettings(docSnap);
  } catch (error) {
    console.error('❌ Error fetching recipe settings by ID:', error);
    throw new Error('Erro ao buscar configurações da receita');
  }
}

// Create or update recipe settings
export async function updateRecipeSettings(updates: Partial<Omit<RecipeSettings, 'id' | 'updatedAt'>>): Promise<RecipeSettings> {
  try {
    console.log('🔄 Updating recipe settings:', updates);

    // Get current settings first
    const currentSettings = await fetchRecipeSettings();

    // Prepare updated data
    const updatedData = {
      laborHourRate: updates.laborHourRate ?? currentSettings.laborHourRate,
      defaultMargin: updates.defaultMargin ?? currentSettings.defaultMargin,
      marginsByCategory: updates.marginsByCategory ?? currentSettings.marginsByCategory,
      updatedAt: Timestamp.now()
    };

    let settingsId: string;

    if (currentSettings.id && currentSettings.id !== 'default') {
      // Update existing settings
      const docRef = doc(db, COLLECTION_NAME, currentSettings.id);
      await updateDoc(docRef, updatedData);
      settingsId = currentSettings.id;
      console.log('✅ Updated existing settings:', settingsId);
    } else {
      // Create new settings document
      const docRef = await addDoc(collection(db, COLLECTION_NAME), updatedData);
      settingsId = docRef.id;
      console.log('✅ Created new settings:', settingsId);
    }

    // Return updated settings
    return {
      id: settingsId,
      laborHourRate: updatedData.laborHourRate,
      defaultMargin: updatedData.defaultMargin,
      marginsByCategory: updatedData.marginsByCategory,
      updatedAt: updatedData.updatedAt.toDate()
    };
  } catch (error) {
    console.error('❌ Error updating recipe settings:', error);
    throw new Error('Erro ao atualizar configurações da receita');
  }
}

// Get default recipe settings
export function getDefaultRecipeSettings(): RecipeSettings {
  return {
    id: 'default',
    laborHourRate: 25.00, // R$ 25 per hour
    defaultMargin: 150.00, // 150% margin
    marginsByCategory: {
      [RecipeCategory.CAKES]: 150.00,
      [RecipeCategory.CUPCAKES]: 180.00,
      [RecipeCategory.COOKIES]: 200.00,
      [RecipeCategory.BREADS]: 120.00,
      [RecipeCategory.PASTRIES]: 160.00,
      [RecipeCategory.ICINGS]: 300.00,
      [RecipeCategory.FILLINGS]: 250.00,
      [RecipeCategory.OTHER]: 150.00
    },
    updatedAt: new Date()
  };
}

// Get margin for specific category
export function getMarginForCategory(settings: RecipeSettings, category: RecipeCategory): number {
  return settings.marginsByCategory[category] || settings.defaultMargin;
}

// Validate recipe settings data
export function validateRecipeSettings(settings: Partial<RecipeSettings>): string[] {
  const errors: string[] = [];

  if (settings.laborHourRate !== undefined) {
    if (settings.laborHourRate < 0) {
      errors.push('Taxa por hora deve ser maior ou igual a zero');
    }
    if (settings.laborHourRate > 1000) {
      errors.push('Taxa por hora parece muito alta (máximo R$ 1000/hora)');
    }
  }

  if (settings.defaultMargin !== undefined) {
    if (settings.defaultMargin < 100) {
      errors.push('Margem padrão deve ser pelo menos 100% (sem lucro)');
    }
    if (settings.defaultMargin > 1000) {
      errors.push('Margem padrão parece muito alta (máximo 1000%)');
    }
  }

  if (settings.marginsByCategory) {
    Object.entries(settings.marginsByCategory).forEach(([category, margin]) => {
      if (margin < 100) {
        errors.push(`Margem para ${category} deve ser pelo menos 100%`);
      }
      if (margin > 1000) {
        errors.push(`Margem para ${category} parece muito alta (máximo 1000%)`);
      }
    });
  }

  return errors;
}

// Format currency for display
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Format percentage for display
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}