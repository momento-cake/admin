import { useCallback, useState } from 'react';

export interface CepResult {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
}

interface ViaCepResponse extends Partial<CepResult> {
  erro?: boolean;
}

export interface UseCepLookupResult {
  lookup: (cep: string) => Promise<CepResult | null>;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

export function useCepLookup(): UseCepLookupResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  const lookup = useCallback(async (cep: string): Promise<CepResult | null> => {
    const digits = (cep || '').replace(/\D/g, '');
    if (digits.length !== 8) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data: ViaCepResponse = await response.json();

      if (data.erro) {
        setError('CEP não encontrado');
        return null;
      }

      return {
        cep: data.cep ?? '',
        logradouro: data.logradouro ?? '',
        bairro: data.bairro ?? '',
        localidade: data.localidade ?? '',
        uf: data.uf ?? '',
      };
    } catch {
      setError('Erro ao buscar CEP');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { lookup, loading, error, reset };
}
