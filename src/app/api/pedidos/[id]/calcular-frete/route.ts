import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthFromRequest, canPerformActionFromRequest, unauthorizedResponse, forbiddenResponse } from '@/lib/api-auth';

const PEDIDOS_COLLECTION = 'pedidos';
const SETTINGS_COLLECTION = 'storeSettings';
const SETTINGS_DOC_ID = 'config';
const ADDRESSES_COLLECTION = 'storeAddresses';

interface NominatimResult {
  lat: string;
  lon: string;
}

interface OsrmRoute {
  distance: number; // meters
  duration: number; // seconds
}

interface OsrmResponse {
  code: string;
  routes: OsrmRoute[];
}

/**
 * Geocode an address using Nominatim (OpenStreetMap)
 */
async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const encoded = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&countrycodes=br&limit=1`,
      {
        headers: {
          'User-Agent': 'MomentoCake-Admin/1.0',
        },
      }
    );

    if (!response.ok) return null;

    const results: NominatimResult[] = await response.json();
    if (results.length === 0) return null;

    return {
      lat: parseFloat(results[0].lat),
      lon: parseFloat(results[0].lon),
    };
  } catch {
    return null;
  }
}

/**
 * Calculate route distance using OSRM
 */
async function calculateRouteDistance(
  origin: { lat: number; lon: number },
  destination: { lat: number; lon: number }
): Promise<number | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?overview=false`;
    const response = await fetch(url);

    if (!response.ok) return null;

    const data: OsrmResponse = await response.json();
    if (data.code !== 'Ok' || data.routes.length === 0) return null;

    // Convert meters to km, round to 1 decimal
    return Math.round((data.routes[0].distance / 1000) * 10) / 10;
  } catch {
    return null;
  }
}

/**
 * Build a full address string from address fields
 */
function buildAddressString(addr: Record<string, unknown>): string {
  const parts = [
    addr.endereco,
    addr.numero,
    addr.bairro,
    addr.cidade,
    addr.estado,
    addr.cep,
  ].filter(Boolean);
  return parts.join(', ');
}

// POST /api/pedidos/[id]/calcular-frete - Calculate freight distance and cost
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return unauthorizedResponse();
    }

    if (!canPerformActionFromRequest(auth, 'orders', 'update')) {
      return forbiddenResponse('Sem permissão para calcular frete');
    }

    const body = await request.json();
    const { enderecoEntrega, storeAddressId } = body;

    if (!enderecoEntrega) {
      return NextResponse.json(
        { success: false, error: 'Endereço de entrega é obrigatório' },
        { status: 400 }
      );
    }

    // Get pedido
    const pedidoDoc = await adminDb.collection(PEDIDOS_COLLECTION).doc(id).get();
    if (!pedidoDoc.exists) {
      return NextResponse.json({ success: false, error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Get store origin address
    let originAddress: Record<string, unknown> | null = null;

    if (storeAddressId) {
      const storeAddrDoc = await adminDb.collection(ADDRESSES_COLLECTION).doc(storeAddressId).get();
      if (storeAddrDoc.exists) {
        originAddress = storeAddrDoc.data() as Record<string, unknown>;
      }
    }

    if (!originAddress) {
      // Try default store address
      const defaultQuery = await adminDb
        .collection(ADDRESSES_COLLECTION)
        .where('isDefault', '==', true)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (!defaultQuery.empty) {
        originAddress = defaultQuery.docs[0].data() as Record<string, unknown>;
      } else {
        // Fall back to any active store address
        const anyQuery = await adminDb
          .collection(ADDRESSES_COLLECTION)
          .where('isActive', '==', true)
          .limit(1)
          .get();

        if (!anyQuery.empty) {
          originAddress = anyQuery.docs[0].data() as Record<string, unknown>;
        }
      }
    }

    if (!originAddress) {
      return NextResponse.json(
        { success: false, error: 'Nenhum endereço de loja cadastrado. Cadastre um endereço nas configurações.' },
        { status: 400 }
      );
    }

    // Get store settings for custoPorKm
    const settingsDoc = await adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC_ID).get();
    const custoPorKm = settingsDoc.exists ? (settingsDoc.data()!.custoPorKm ?? 4.5) : 4.5;

    // Geocode both addresses
    const originStr = buildAddressString(originAddress);
    const destStr = buildAddressString(enderecoEntrega);

    const [originCoords, destCoords] = await Promise.all([
      geocodeAddress(originStr),
      geocodeAddress(destStr),
    ]);

    if (!originCoords || !destCoords) {
      return NextResponse.json({
        success: false,
        error: 'Não foi possível geocodificar os endereços. Insira a distância manualmente.',
        needsManualDistance: true,
      }, { status: 422 });
    }

    // Calculate route distance
    const distanciaKm = await calculateRouteDistance(originCoords, destCoords);

    if (distanciaKm === null) {
      return NextResponse.json({
        success: false,
        error: 'Não foi possível calcular a rota. Insira a distância manualmente.',
        needsManualDistance: true,
      }, { status: 422 });
    }

    // Get current pedido entrega data
    const pedidoData = pedidoDoc.data()!;
    const entrega = pedidoData.entrega || {};
    const taxaExtra = entrega.taxaExtra || 0;
    const freteTotal = distanciaKm * custoPorKm + taxaExtra;

    // Update pedido with calculated distance and freight
    await adminDb.collection(PEDIDOS_COLLECTION).doc(id).update({
      'entrega.distanciaKm': distanciaKm,
      'entrega.custoPorKm': custoPorKm,
      'entrega.freteTotal': Math.round(freteTotal * 100) / 100,
      'entrega.enderecoEntrega': enderecoEntrega,
      updatedAt: FieldValue.serverTimestamp(),
      lastModifiedBy: auth.uid,
    });

    return NextResponse.json({
      success: true,
      data: {
        distanciaKm,
        custoPorKm,
        taxaExtra,
        freteTotal: Math.round(freteTotal * 100) / 100,
      },
    });
  } catch (error) {
    console.error('❌ Erro ao calcular frete:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
