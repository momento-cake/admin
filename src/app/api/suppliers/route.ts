import { NextRequest, NextResponse } from 'next/server';
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supplierValidation } from '@/lib/validators/ingredient';
import { Supplier } from '@/types/ingredient';

// GET /api/suppliers - List suppliers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pageLimit = parseInt(searchParams.get('limit') || '50');
    const searchQuery = searchParams.get('searchQuery');
    
    // Build Firestore query
    const suppliersQuery = query(
      collection(db, 'suppliers'),
      where('isActive', '==', true),
      orderBy('name', 'asc'),
      limit(pageLimit)
    );

    const querySnapshot = await getDocs(suppliersQuery);
    let suppliers: Supplier[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      suppliers.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date()
      } as Supplier);
    });

    // Apply search filter (client-side for now)
    if (searchQuery) {
      const searchTerm = searchQuery.toLowerCase();
      suppliers = suppliers.filter((supplier) =>
        supplier.name.toLowerCase().includes(searchTerm) ||
        supplier.contactPerson?.toLowerCase().includes(searchTerm) ||
        supplier.email?.toLowerCase().includes(searchTerm)
      );
    }

    return NextResponse.json({
      suppliers,
      total: suppliers.length,
      page: 1,
      limit: pageLimit
    });

  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar fornecedores' },
      { status: 500 }
    );
  }
}

// POST /api/suppliers - Create new supplier
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input data
    const validatedData = supplierValidation.parse(body);
    
    // Create supplier document
    const supplierData = {
      ...validatedData,
      isActive: true,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'suppliers'), supplierData);
    
    // Return the created supplier with the generated ID
    const newSupplier: Supplier = {
      id: docRef.id,
      ...validatedData,
      isActive: true,
      createdAt: new Date()
    };

    return NextResponse.json(newSupplier, { status: 201 });

  } catch (error) {
    console.error('Error creating supplier:', error);
    
    if (error instanceof Error && 'issues' in error) {
      // Zod validation error
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Erro ao criar fornecedor' },
      { status: 500 }
    );
  }
}