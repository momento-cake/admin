/**
 * NFeWizard-io fiscal provider.
 *
 * Implements {@link FiscalProvider} over the NFeWizard-io library (NF-e model
 * 55) and `@nfewizard/nfce` (NFC-e model 65). One `emit` handles both models:
 * build the payload → load the environment → call the model's autorização →
 * map the response → (when authorized) archive the signed XML and render the
 * DANFE. `cancelNf` sends a SEFAZ evento de cancelamento; `queryNf` runs a
 * consulta protocolo by chave.
 */
import { promises as fs } from 'fs';
import path from 'path';
import type { FiscalProvider } from '../provider';
import type {
  FiscalCancelInput,
  FiscalCancelResult,
  FiscalConfig,
  FiscalEmitInput,
  FiscalEmitResult,
  FiscalQueryResult,
} from '../types';
import { FiscalProviderError } from '../types';
import { buildFiscalPayload, ufCodigo } from '../mapping';
import { AUTHORIZED_XML_DIR, buildWizardConfig, createWizard } from './client';
import { mapCancelResult, mapEmitResult, mapQueryResult } from './map-result';
import { generateDanfePdf } from './danfe';

/** Current instant as a São Paulo wall-clock ISO string (UTC-3, no DST). */
function nowSpIso(): string {
  const shifted = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${shifted.getUTCFullYear()}-${p(shifted.getUTCMonth() + 1)}-${p(shifted.getUTCDate())}` +
    `T${p(shifted.getUTCHours())}:${p(shifted.getUTCMinutes())}:${p(shifted.getUTCSeconds())}-03:00`
  );
}

/**
 * Best-effort archival record of a cancellation response. The library does not
 * return the re-signed procEventoNFe string (it parses the SEFAZ envelope to
 * JSON), so we serialize the response envelope for this call — correctly scoped
 * (no shared /tmp file, no cross-cancellation race). Returns undefined when the
 * response carries no recognizable event payload.
 */
function extractCancelXml(response: unknown): string | undefined {
  // NFE_Cancelamento returns the envelope array directly; NFCE_Cancelamento wraps
  // it in `{ success, xMotivos, response }`. A response with neither carries no
  // event payload to archive.
  let payload: unknown;
  if (Array.isArray(response)) {
    payload = response[0];
  } else {
    const r = (response ?? {}) as { response?: unknown };
    payload = Array.isArray(r.response) ? r.response[0] : r.response;
  }
  if (payload === undefined || payload === null) return undefined;
  if (typeof payload === 'string') return payload;
  try {
    return JSON.stringify(payload);
  } catch {
    return undefined;
  }
}

/** First authorized nfeProc JSON entry (`{ NFe, protNFe }`) from the response. */
function firstNfeProc(response: unknown): unknown {
  const xmls = (response as { xmls?: unknown[] })?.xmls;
  if (Array.isArray(xmls)) return xmls[0];
  return xmls;
}

/**
 * Read back the signed XML the library persisted for the chave. Best-effort: a
 * failure never blocks the (already authorized) emission, but the authorized XML
 * is the legal fiscal document, so we log loudly with the accessKey so ops can
 * detect and recover an unarchived note.
 */
async function readAuthorizedXml(accessKey: string): Promise<string | undefined> {
  try {
    return await fs.readFile(path.join(AUTHORIZED_XML_DIR, `${accessKey}.xml`), 'utf8');
  } catch (err) {
    console.error(
      `[fiscal] Falha ao arquivar o XML autorizado da NF-e ${accessKey}: ${(err as Error).message}`,
    );
    return undefined;
  }
}

export function createNfeWizardProvider(config: FiscalConfig): FiscalProvider {
  async function emit(input: FiscalEmitInput): Promise<FiscalEmitResult> {
    const payload = buildFiscalPayload(input);
    // May throw FiscalProviderError('csc_missing') — a configuration problem,
    // not an emission outcome, so it propagates.
    const wizardConfig = buildWizardConfig(config, input.modelo);
    const wizard = createWizard(input.modelo);

    try {
      await wizard.NFE_LoadEnvironment({ config: wizardConfig });
    } catch (err) {
      throw new FiscalProviderError(
        'nfewizard',
        'load_environment',
        `Falha ao carregar o ambiente fiscal: ${(err as Error).message}`,
      );
    }

    const emittedAt = new Date(input.emittedAtIso);
    const ctx = {
      modelo: input.modelo,
      serie: input.serie,
      numero: input.numero,
      emittedAt,
    };

    let response: unknown;
    try {
      response =
        input.modelo === 65
          ? await wizard.NFCE_Autorizacao!(payload)
          : await wizard.NFE_Autorizacao!(payload);
    } catch (err) {
      // Payload/validation/transport failures surface as an ERRO outcome so the
      // order flow can show the message without a 500.
      return {
        ...ctx,
        status: 'ERRO',
        rejection: { code: 'exception', message: (err as Error).message },
      };
    }

    const result = mapEmitResult(response, ctx);

    if (result.status === 'AUTORIZADA' && result.accessKey) {
      const xml = await readAuthorizedXml(result.accessKey);
      if (xml) result.xml = xml;
      result.danfePdf = await generateDanfePdf({
        modelo: input.modelo,
        data: firstNfeProc(response),
        accessKey: result.accessKey,
      });
      // Best-effort, but the DANFE is a customer-facing document — surface a
      // missing one so ops can regenerate it for an otherwise-valid note.
      if (!result.danfePdf) {
        console.error(
          `[fiscal] Falha ao gerar o DANFE da NF-e ${result.accessKey} (nota autorizada mesmo assim)`,
        );
      }
    }

    return result;
  }

  async function cancelNf(input: FiscalCancelInput): Promise<FiscalCancelResult> {
    // Cancellation events never use the CSC, so don't require it for model 65.
    const wizardConfig = buildWizardConfig(config, input.modelo, { requireCsc: false });
    const wizard = createWizard(input.modelo);

    try {
      await wizard.NFE_LoadEnvironment({ config: wizardConfig });
    } catch (err) {
      throw new FiscalProviderError(
        'nfewizard',
        'load_environment',
        `Falha ao carregar o ambiente fiscal: ${(err as Error).message}`,
      );
    }

    const evento = {
      idLote: 1,
      modelo: String(input.modelo) as '55' | '65',
      evento: [
        {
          tpAmb: config.ambiente === 'producao' ? 1 : 2,
          cOrgao: ufCodigo(config.issuer.uf),
          CNPJ: config.issuer.cnpj,
          chNFe: input.accessKey,
          dhEvento: nowSpIso(),
          tpEvento: '110111',
          nSeqEvento: 1,
          verEvento: '1.00',
          detEvento: {
            descEvento: 'Cancelamento',
            nProt: input.protocolo,
            xJust: input.justificativa,
          },
        },
      ],
    };

    const cancelledAt = new Date();
    let response: unknown;
    try {
      // NFC-e cancellation goes through @nfewizard/nfce (NFCE_Cancelamento adds
      // modelo 65 and uses the NFC-e event endpoint); NF-e uses NFE_Cancelamento.
      response =
        input.modelo === 65
          ? await wizard.NFCE_Cancelamento!(evento)
          : await wizard.NFE_Cancelamento!(evento);
    } catch (err) {
      return {
        status: 'ERRO',
        rejection: { code: 'exception', message: (err as Error).message },
      };
    }

    const xml = extractCancelXml(response);
    if (!xml) {
      console.error(
        `[fiscal] Falha ao arquivar o XML do cancelamento da NF-e ${input.accessKey}: resposta sem evento`,
      );
    }

    return mapCancelResult(response, {
      accessKey: input.accessKey,
      cancelledAt,
      ...(xml ? { xml } : {}),
    });
  }

  async function queryNf(accessKey: string): Promise<FiscalQueryResult> {
    // Consulta protocolo por chave is served by the NF-e wizard for both models.
    const wizardConfig = buildWizardConfig(config, 55, { requireCsc: false });
    const wizard = createWizard(55);
    await wizard.NFE_LoadEnvironment({ config: wizardConfig });
    const response = await wizard.NFE_ConsultaProtocolo!(accessKey);
    return mapQueryResult(response);
  }

  return { name: 'nfewizard', emit, cancelNf, queryNf };
}
