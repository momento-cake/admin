/**
 * DANFE PDF generation from an authorized nfeProc.
 *
 * `@nfewizard/danfe`'s `NFE_GerarDanfe` / `NFCE_GerarDanfe` accept the library's
 * JSON form (`{ NFe, protNFe }`, exactly the `xmls[i]` entry the autorização
 * returns) and write a PDF to `outputPath`. App Hosting's filesystem is
 * read-only except `/tmp`, so we write there and read the bytes back into a
 * Buffer for {@link FiscalEmitResult.danfePdf}, then best-effort clean up.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { NFE_GerarDanfe, NFCE_GerarDanfe } from '@nfewizard/danfe';
import type { FiscalModelo } from '../types';

export const DANFE_DIR = '/tmp/fiscal-danfe';

export interface GenerateDanfeArgs {
  modelo: FiscalModelo;
  /** The authorized nfeProc JSON (`{ NFe, protNFe }`) from the autorização. */
  data: unknown;
  /** Chave de acesso (44 digits) — names the output file and the DANFE. */
  accessKey: string;
}

/**
 * Render the DANFE PDF for an authorized note and return its bytes. Returns
 * `undefined` if generation fails — a missing DANFE must never fail an already
 * authorized emission (the note is valid regardless).
 */
export async function generateDanfePdf(
  args: GenerateDanfeArgs,
): Promise<Buffer | undefined> {
  const outputPath = path.join(DANFE_DIR, `${args.accessKey}.pdf`);
  await fs.mkdir(DANFE_DIR, { recursive: true });

  const params = {
    data: args.data as never,
    chave: args.accessKey,
    outputPath,
  };

  try {
    const result =
      args.modelo === 65
        ? await NFCE_GerarDanfe(params)
        : await NFE_GerarDanfe(params);
    if (result && result.success === false) {
      return undefined;
    }
    return await fs.readFile(outputPath);
  } catch {
    return undefined;
  } finally {
    await fs.rm(outputPath, { force: true }).catch(() => {});
  }
}
