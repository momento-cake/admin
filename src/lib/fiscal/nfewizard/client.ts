/**
 * NFeWizard client construction: turn a {@link FiscalConfig} into the
 * `NFeWizardProps` config the library's `NFE_LoadEnvironment` expects, and
 * instantiate the right wizard for the model (NFeWizard for 55, NFCEWizard for
 * 65).
 *
 * The certificate is passed as a Buffer straight from Storage — `dfe.pathCertificado`
 * accepts `string | Buffer | ReadableStream`, so no /tmp .pfx file is needed.
 * Authorized XMLs are persisted to /tmp (the only writable path on App Hosting)
 * so the emit flow can read the signed XML back for archival.
 */
import NFeWizard from 'nfewizard-io';
import { NFCEWizard } from '@nfewizard/nfce';
import type { FiscalConfig, FiscalModelo } from '../types';
import { FiscalProviderError } from '../types';

/** Directory the library writes authorized XMLs to (readable back for archival). */
export const AUTHORIZED_XML_DIR = '/tmp/fiscal-xml';

/**
 * Minimal structural type for `NFeWizardProps` — we build only the fields we
 * use. Cast at the `NFE_LoadEnvironment` boundary.
 */
export interface NfeWizardConfig {
  dfe: {
    armazenarXMLAutorizacao: boolean;
    pathXMLAutorizacao: string;
    incluirTimestampNoNomeDosArquivos: boolean;
    armazenarXMLConsulta: boolean;
    armazenarXMLRetorno: boolean;
    pathCertificado: Buffer;
    senhaCertificado: string;
    UF: string;
    CPFCNPJ: string;
  };
  nfe: {
    ambiente: number;
    versaoDF: string;
    tokenCSC?: string;
    idCSC?: number;
  };
  lib: {
    connection: { timeout: number };
    log: { exibirLogNoConsole: boolean };
    /**
     * Force the pure-JS XSD validator. The Java-based validator relies on
     * `xsd-schema-validator`'s postinstall compiling a Java helper (needs a JDK),
     * which the App Hosting build image lacks — so we never use that path.
     */
    useForSchemaValidation: 'validateSchemaJsBased';
  };
}

/** Wizard instances share the `NFE_LoadEnvironment`/autorização surface we use. */
export interface FiscalWizard {
  NFE_LoadEnvironment(args: { config: unknown }): Promise<void>;
  NFE_Autorizacao?(data: unknown): Promise<unknown>;
  NFCE_Autorizacao?(data: unknown): Promise<unknown>;
  NFE_Cancelamento?(evento: unknown): Promise<unknown>;
  NFCE_Cancelamento?(evento: unknown): Promise<unknown>;
  NFE_ConsultaProtocolo?(chave: string): Promise<unknown>;
}

/** Options controlling how the wizard config is assembled. */
export interface BuildWizardConfigOptions {
  /**
   * Whether a missing CSC on model 65 is an error. True for emission (the QR
   * needs it); false for cancellation/consulta events, which don't use the CSC.
   */
  requireCsc?: boolean;
}

/**
 * Build the NFeWizard `NFeWizardProps` config for the given model. NFC-e (65)
 * additionally needs the CSC (tokenCSC/idCSC); emitting model 65 without a CSC
 * is a configuration error.
 */
export function buildWizardConfig(
  config: FiscalConfig,
  modelo: FiscalModelo,
  options: BuildWizardConfigOptions = {},
): NfeWizardConfig {
  const { requireCsc = true } = options;
  const ambiente = config.ambiente === 'producao' ? 1 : 2;

  const nfe: NfeWizardConfig['nfe'] = {
    ambiente,
    versaoDF: '4.00',
  };

  if (modelo === 65) {
    if (config.csc) {
      nfe.tokenCSC = config.csc.token;
      nfe.idCSC = Number(config.csc.id);
    } else if (requireCsc) {
      throw new FiscalProviderError(
        'nfewizard',
        'csc_missing',
        'NFC-e (modelo 65) requer CSC (Código de Segurança do Contribuinte) configurado',
      );
    }
  }

  return {
    dfe: {
      armazenarXMLAutorizacao: true,
      pathXMLAutorizacao: AUTHORIZED_XML_DIR,
      incluirTimestampNoNomeDosArquivos: false,
      armazenarXMLConsulta: false,
      armazenarXMLRetorno: false,
      pathCertificado: config.cert.pfx,
      senhaCertificado: config.cert.password,
      UF: config.issuer.uf,
      CPFCNPJ: config.issuer.cnpj,
    },
    nfe,
    lib: {
      connection: { timeout: 30000 },
      log: { exibirLogNoConsole: false },
      useForSchemaValidation: 'validateSchemaJsBased',
    },
  };
}

/** Instantiate the wizard class matching the model. */
export function createWizard(modelo: FiscalModelo): FiscalWizard {
  if (modelo === 65) {
    return new NFCEWizard() as unknown as FiscalWizard;
  }
  return new NFeWizard() as unknown as FiscalWizard;
}
