import { describe, it, expect } from 'vitest';
import { buildFiscalPayload } from '@/lib/fiscal/mapping';
import type {
  FiscalEmitInput,
  FiscalIssuer,
  FiscalTaxProfile,
} from '@/lib/fiscal/types';

const issuer: FiscalIssuer = {
  cnpj: '12345678000199',
  razaoSocial: 'Momento Cake LTDA',
  nomeFantasia: 'Momento Cake',
  inscricaoEstadual: '111222333444',
  crt: 1,
  logradouro: 'Rua das Flores',
  numero: '100',
  complemento: 'Sala 2',
  bairro: 'Centro',
  municipio: 'Sao Paulo',
  codigoMunicipioIbge: '3550308',
  uf: 'SP',
  cep: '01001000',
  telefone: '1133334444',
};

const simplesProfile: FiscalTaxProfile = {
  cfop: '5102',
  ncm: '19059090',
  unidade: 'UN',
  origem: '0',
  csosn: '102',
  naturezaOperacao: 'Venda de mercadoria',
};

function baseInput(overrides: Partial<FiscalEmitInput> = {}): FiscalEmitInput {
  return {
    modelo: 55,
    serie: 1,
    numero: 42,
    ambiente: 'producao',
    issuer,
    taxProfile: simplesProfile,
    recipient: {
      nome: 'Cliente Teste',
      cpfCnpj: '39053344705',
      tipo: 'CPF',
    },
    items: [
      { codigo: 'BOLO-1', descricao: 'Bolo de chocolate', quantidade: 2, valorUnitario: 50, valorTotal: 100 },
    ],
    totals: { produtos: 100, desconto: 10, acrescimo: 0, frete: 0, total: 90 },
    payments: [{ tPag: '17', valor: 90 }],
    numeroPedido: 'PED-2026-0042',
    emittedAtIso: '2026-07-26T10:00:00-03:00',
    ...overrides,
  };
}

describe('buildFiscalPayload — NF-e (model 55)', () => {
  it('builds the ide block for an intra-state consumer sale', () => {
    const p = buildFiscalPayload(baseInput(), { cNF: '00011122' });
    const ide = p.NFe.infNFe.ide;
    expect(ide.mod).toBe(55);
    expect(ide.serie).toBe('1');
    expect(ide.nNF).toBe(42);
    expect(ide.natOp).toBe('Venda de mercadoria');
    expect(ide.dhEmi).toBe('2026-07-26T10:00:00-03:00');
    expect(ide.tpNF).toBe(1);
    expect(ide.tpImp).toBe(1); // DANFE retrato
    expect(ide.indPres).toBe(2); // internet
    expect(ide.tpAmb).toBe(1); // produção
    expect(ide.idDest).toBe(1); // interna (recipient sem endereço)
    expect(ide.cUF).toBe(35);
    expect(ide.cMunFG).toBe(3550308);
    expect(ide.cNF).toBe('00011122');
    expect(ide.finNFe).toBe(1);
    expect(ide.indFinal).toBe(1);
    expect(ide.cDV).toBeUndefined(); // library computes it
  });

  it('is deterministic when cNF is supplied and random otherwise', () => {
    const a = buildFiscalPayload(baseInput(), { cNF: '11112222' });
    const b = buildFiscalPayload(baseInput(), { cNF: '11112222' });
    expect(a).toEqual(b);
    const c = buildFiscalPayload(baseInput());
    expect(c.NFe.infNFe.ide.cNF).toMatch(/^\d{8}$/);
  });

  it('maps the emitente from the issuer', () => {
    const emit = buildFiscalPayload(baseInput(), { cNF: '1' }).NFe.infNFe.emit;
    expect(emit.CNPJCPF).toBe('12345678000199');
    expect(emit.xNome).toBe('Momento Cake LTDA');
    expect(emit.xFant).toBe('Momento Cake');
    expect(emit.IE).toBe('111222333444');
    expect(emit.CRT).toBe(1);
    expect(emit.enderEmit.cMun).toBe(3550308);
    expect(emit.enderEmit.xCpl).toBe('Sala 2');
    expect(emit.enderEmit.cPais).toBe(1058);
    expect(emit.enderEmit.fone).toBe('1133334444');
  });

  it('requires a destinatário with the recipient document (CPF)', () => {
    const dest = buildFiscalPayload(baseInput(), { cNF: '1' }).NFe.infNFe.dest;
    expect(dest).toBeDefined();
    expect(dest!.CNPJCPF).toBe('39053344705');
    expect(dest!.xNome).toBe('Cliente Teste');
    expect(dest!.indIEDest).toBe(9);
  });

  it('accepts a CNPJ recipient and carries IE/email/endereço', () => {
    const dest = buildFiscalPayload(
      baseInput({
        recipient: {
          nome: 'Empresa X',
          cpfCnpj: '12345678000100',
          tipo: 'CNPJ',
          indicadorIeDestinatario: 1,
          inscricaoEstadual: '999888777',
          email: 'nf@x.com',
          endereco: {
            logradouro: 'Av B',
            numero: '200',
            bairro: 'Jardim',
            municipio: 'Sao Paulo',
            uf: 'SP',
            cep: '02002000',
          },
        },
      }),
      { cNF: '1' },
    ).NFe.infNFe.dest;
    expect(dest!.CNPJCPF).toBe('12345678000100');
    expect(dest!.indIEDest).toBe(1);
    expect(dest!.IE).toBe('999888777');
    expect(dest!.email).toBe('nf@x.com');
    expect(dest!.enderDest?.UF).toBe('SP');
  });

  it('uses a 6xxx CFOP and idDest=2 for an interstate sale', () => {
    const p = buildFiscalPayload(
      baseInput({
        recipient: {
          nome: 'Cliente RJ',
          cpfCnpj: '39053344705',
          endereco: {
            logradouro: 'Rua RJ',
            numero: '1',
            bairro: 'Centro',
            municipio: 'Rio de Janeiro',
            uf: 'RJ',
            cep: '20000000',
          },
        },
      }),
      { cNF: '1' },
    );
    expect(p.NFe.infNFe.ide.idDest).toBe(2);
    expect(p.NFe.infNFe.det[0].prod.CFOP).toBe(6102);
  });

  it('emits an ICMSSN102 block with the profile CSOSN under Simples', () => {
    const imposto = buildFiscalPayload(baseInput(), { cNF: '1' }).NFe.infNFe.det[0].imposto;
    expect(imposto.ICMS).toEqual({ ICMSSN102: { orig: 0, CSOSN: 102 } });
    expect(imposto.PIS).toEqual({ PISOutr: { CST: '49', vBC: 0, pPIS: 0, vPIS: 0 } });
    expect(imposto.COFINS).toEqual({ COFINSOutr: { CST: '49', vBC: 0, pCOFINS: 0, vCOFINS: 0 } });
  });

  it('emits an ICMSSN101 block with credit fields when CSOSN is 101', () => {
    const imposto = buildFiscalPayload(
      baseInput({ taxProfile: { ...simplesProfile, csosn: '101' } }),
      { cNF: '1' },
    ).NFe.infNFe.det[0].imposto;
    expect(imposto.ICMS).toEqual({
      ICMSSN101: { orig: 0, CSOSN: 101, pCredSN: 0, vCredICMSSN: 0 },
    });
  });

  it('emits an ICMS40 block for Regime Normal with CST 40', () => {
    const imposto = buildFiscalPayload(
      baseInput({
        issuer: { ...issuer, crt: 3 },
        taxProfile: { ...simplesProfile, csosn: undefined, cst: '40' },
      }),
      { cNF: '1' },
    ).NFe.infNFe.det[0].imposto;
    expect(imposto.ICMS).toEqual({ ICMS40: { orig: 0, CST: '40' } });
  });

  it('emits a zeroed ICMS00 block for Regime Normal with CST 00', () => {
    const imposto = buildFiscalPayload(
      baseInput({
        issuer: { ...issuer, crt: 3 },
        taxProfile: { ...simplesProfile, csosn: undefined, cst: '00' },
      }),
      { cNF: '1' },
    ).NFe.infNFe.det[0].imposto;
    expect(imposto.ICMS).toEqual({
      ICMS00: { orig: 0, CST: '00', modBC: 3, vBC: '0.00', pICMS: '0.00', vICMS: '0.00' },
    });
  });

  it('totals reflect produtos/desconto/frete/vNF and per-item values', () => {
    const p = buildFiscalPayload(
      baseInput({
        frete: 12.5,
        totals: { produtos: 100, desconto: 10, acrescimo: 3, frete: 12.5, total: 105.5 },
      }),
      { cNF: '1' },
    );
    const tot = p.NFe.infNFe.total.ICMSTot;
    expect(tot.vProd).toBe('100.00');
    expect(tot.vDesc).toBe('10.00');
    expect(tot.vFrete).toBe('12.50');
    expect(tot.vOutro).toBe('3.00');
    expect(tot.vNF).toBe('105.50');
    const prod = p.NFe.infNFe.det[0].prod;
    expect(prod.vUnCom).toBe('50.00');
    expect(prod.vProd).toBe('100.00');
    expect(prod.qCom).toBe(2);
    expect(prod.cEAN).toBe('SEM GTIN');
  });

  it('sets modFrete 0 when there is freight and 9 otherwise', () => {
    expect(buildFiscalPayload(baseInput({ frete: 5 }), { cNF: '1' }).NFe.infNFe.transp.modFrete).toBe(0);
    expect(buildFiscalPayload(baseInput({ frete: 0 }), { cNF: '1' }).NFe.infNFe.transp.modFrete).toBe(9);
  });

  it('maps payments to detPag with tPag and vPag', () => {
    const pag = buildFiscalPayload(
      baseInput({ payments: [{ tPag: '01', valor: 40 }, { tPag: '03', valor: 50 }] }),
      { cNF: '1' },
    ).NFe.infNFe.pag;
    expect(pag.detPag).toEqual([
      { indPag: 0, tPag: '01', vPag: '40.00' },
      { indPag: 0, tPag: '03', vPag: '50.00' },
    ]);
  });

  it('references the pedido number in infAdic.infCpl', () => {
    const infAdic = buildFiscalPayload(baseInput(), { cNF: '1' }).NFe.infNFe.infAdic;
    expect(infAdic.infCpl).toBe('Pedido PED-2026-0042');
  });

  it('forces the homologação razão social on the destinatário', () => {
    const dest = buildFiscalPayload(baseInput({ ambiente: 'homologacao' }), { cNF: '1' }).NFe.infNFe.dest;
    expect(dest!.xNome).toBe('NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL');
    expect(buildFiscalPayload(baseInput({ ambiente: 'homologacao' }), { cNF: '1' }).NFe.infNFe.ide.tpAmb).toBe(2);
  });

  it('wraps the payload with idLote and indSinc for synchronous emission', () => {
    const p = buildFiscalPayload(baseInput(), { cNF: '1' });
    expect(p.idLote).toBe(1);
    expect(p.indSinc).toBe(1);
  });
});

describe('buildFiscalPayload — NFC-e (model 65)', () => {
  it('sets mod 65, tpImp 4 and indPres 1 for an in-store sale', () => {
    const ide = buildFiscalPayload(
      baseInput({ modelo: 65, recipient: undefined }),
      { cNF: '1' },
    ).NFe.infNFe.ide;
    expect(ide.mod).toBe(65);
    expect(ide.tpImp).toBe(4);
    expect(ide.indPres).toBe(1);
  });

  it('omits the destinatário for an anonymous consumer', () => {
    const p = buildFiscalPayload(
      baseInput({ modelo: 65, recipient: undefined }),
      { cNF: '1' },
    );
    expect(p.NFe.infNFe.dest).toBeUndefined();
  });

  it('includes the destinatário when the consumer provides a CPF (CPF na nota)', () => {
    const p = buildFiscalPayload(
      baseInput({ modelo: 65, recipient: { nome: 'Fulano', cpfCnpj: '39053344705' } }),
      { cNF: '1' },
    );
    expect(p.NFe.infNFe.dest?.CNPJCPF).toBe('39053344705');
  });

  it('does not add infNFeSupl (the library generates the QR on authorization)', () => {
    const p = buildFiscalPayload(baseInput({ modelo: 65 }), { cNF: '1' }) as Record<string, unknown>;
    expect((p.NFe as Record<string, unknown>).infNFeSupl).toBeUndefined();
  });

  it('forces the homologação razão social on a CPF-na-nota destinatário', () => {
    const p = buildFiscalPayload(
      baseInput({
        modelo: 65,
        ambiente: 'homologacao',
        recipient: { nome: 'Fulano', cpfCnpj: '39053344705' },
      }),
      { cNF: '1' },
    );
    expect(p.NFe.infNFe.dest?.xNome).toBe(
      'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL',
    );
    expect(p.NFe.infNFe.ide.tpAmb).toBe(2);
  });
});
