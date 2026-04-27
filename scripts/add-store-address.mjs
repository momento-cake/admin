import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const address = {
  nome: 'Loja Principal',
  cep: '02131-080',
  estado: 'SP',
  cidade: 'São Paulo',
  bairro: 'Vila Maria Alta',
  endereco: 'Rua Samurais',
  numero: '25',
  complemento: '',
  isDefault: true,
  isActive: true,
  createdAt: FieldValue.serverTimestamp(),
  createdBy: 'cli-bootstrap',
};

const existingDefault = await db
  .collection('storeAddresses')
  .where('isDefault', '==', true)
  .get();

const batch = db.batch();
for (const doc of existingDefault.docs) {
  batch.update(doc.ref, { isDefault: false });
}
const newRef = db.collection('storeAddresses').doc();
batch.set(newRef, address);
await batch.commit();

console.log(`Created storeAddresses/${newRef.id}: ${address.nome} — ${address.endereco}, ${address.numero} - ${address.bairro}, ${address.cep}, ${address.cidade}/${address.estado}`);
process.exit(0);
