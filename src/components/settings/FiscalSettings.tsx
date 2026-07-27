'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, FileText, Upload, ShieldCheck, AlertTriangle } from 'lucide-react'
import { validateCertFile } from '@/lib/validators/fiscal'
import { formatErrorMessage } from '@/lib/error-handler'

interface FiscalForm {
  ambiente: 'homologacao' | 'producao'
  inscricaoEstadual: string
  crt: '1' | '2' | '3'
  cfop: string
  ncm: string
  csosn: string
  cst: string
  unidade: string
  naturezaOperacao: string
  serieNfe: string
  serieNfce: string
  cscId: string
}

const DEFAULT_FORM: FiscalForm = {
  ambiente: 'homologacao',
  inscricaoEstadual: '',
  crt: '1',
  cfop: '5102',
  ncm: '',
  csosn: '102',
  cst: '',
  unidade: 'UN',
  naturezaOperacao: 'Venda de mercadoria',
  serieNfe: '1',
  serieNfce: '1',
  cscId: '',
}

export function FiscalSettings() {
  const [form, setForm] = useState<FiscalForm>(DEFAULT_FORM)
  const [cscToken, setCscToken] = useState('')
  const [certPassword, setCertPassword] = useState('')
  const [hasCert, setHasCert] = useState(false)
  const [hasCsc, setHasCsc] = useState(false)
  const [certFileName, setCertFileName] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/fiscal-settings')
        const result = await response.json()
        if (!result.success) throw new Error(result.error || 'Erro ao carregar configuração fiscal')
        const d = result.data || {}
        setForm({
          ambiente: d.ambiente ?? DEFAULT_FORM.ambiente,
          inscricaoEstadual: d.inscricaoEstadual ?? '',
          crt: String(d.crt ?? DEFAULT_FORM.crt) as FiscalForm['crt'],
          cfop: d.cfop ?? DEFAULT_FORM.cfop,
          ncm: d.ncm ?? '',
          csosn: d.csosn ?? DEFAULT_FORM.csosn,
          cst: d.cst ?? '',
          unidade: d.unidade ?? DEFAULT_FORM.unidade,
          naturezaOperacao: d.naturezaOperacao ?? DEFAULT_FORM.naturezaOperacao,
          serieNfe: String(d.serieNfe ?? DEFAULT_FORM.serieNfe),
          serieNfce: String(d.serieNfce ?? DEFAULT_FORM.serieNfce),
          cscId: d.cscId ?? '',
        })
        setHasCert(Boolean(d.hasCert))
        setHasCsc(Boolean(d.hasCsc))
        setCertFileName(d.certFileName ?? null)
      } catch (error) {
        toast.error('Erro ao carregar configuração fiscal', {
          description: formatErrorMessage(error),
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const update = <K extends keyof FiscalForm>(key: K, value: FiscalForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        ambiente: form.ambiente,
        inscricaoEstadual: form.inscricaoEstadual.trim(),
        crt: Number(form.crt),
        cfop: form.cfop.trim(),
        ncm: form.ncm.trim(),
        csosn: form.csosn.trim(),
        unidade: form.unidade.trim(),
        naturezaOperacao: form.naturezaOperacao.trim(),
        serieNfe: Number(form.serieNfe),
        serieNfce: Number(form.serieNfce),
        cscId: form.cscId.trim(),
      }
      if (form.cst.trim()) payload.cst = form.cst.trim()
      if (cscToken.trim()) payload.csc = cscToken.trim()
      if (certPassword) payload.certPassword = certPassword

      const response = await fetch('/api/fiscal-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!result.success) {
        const detail = Array.isArray(result.details) && result.details.length
          ? result.details.map((d: { message: string }) => d.message).join('; ')
          : result.error
        throw new Error(detail || 'Erro ao salvar configuração fiscal')
      }
      if (cscToken.trim()) setHasCsc(true)
      setCscToken('')
      setCertPassword('')
      toast.success('Configuração fiscal salva com sucesso!')
    } catch (error) {
      toast.error('Erro ao salvar configuração fiscal', {
        description: formatErrorMessage(error),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCertUpload = async (file: File) => {
    const check = validateCertFile(file)
    if (!check.isValid) {
      toast.error(check.error || 'Arquivo inválido')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (certPassword) formData.append('password', certPassword)

      const response = await fetch('/api/fiscal-settings/certificate', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Erro ao enviar certificado')

      setHasCert(true)
      setCertFileName(result.data?.certFileName ?? file.name)
      if (certPassword) setCertPassword('')
      toast.success('Certificado enviado com sucesso!')
    } catch (error) {
      toast.error('Erro ao enviar certificado', {
        description: formatErrorMessage(error),
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {form.ambiente === 'producao' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Ambiente de <strong>Produção</strong>: as notas emitidas terão validade fiscal real.
            Use <strong>Homologação</strong> para testes.
          </AlertDescription>
        </Alert>
      )}

      {/* Ambiente + regime */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Emissão de NF-e / NFC-e
          </CardTitle>
          <CardDescription>
            Configure o ambiente SEFAZ e os dados fiscais do emitente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="ambiente">Ambiente</Label>
              <Select
                value={form.ambiente}
                onValueChange={(v) => update('ambiente', v as FiscalForm['ambiente'])}
              >
                <SelectTrigger id="ambiente">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="homologacao">Homologação (teste)</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="crt">Regime Tributário (CRT)</Label>
              <Select value={form.crt} onValueChange={(v) => update('crt', v as FiscalForm['crt'])}>
                <SelectTrigger id="crt">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Simples Nacional</SelectItem>
                  <SelectItem value="2">2 - Simples Nacional (excesso)</SelectItem>
                  <SelectItem value="3">3 - Regime Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="inscricaoEstadual">Inscrição Estadual</Label>
              <Input
                id="inscricaoEstadual"
                value={form.inscricaoEstadual}
                onChange={(e) => update('inscricaoEstadual', e.target.value)}
                placeholder="Ex.: 123456789012"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax profile */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil Tributário</CardTitle>
          <CardDescription>
            Valores fixos aplicados a todos os itens (confirme com sua contabilidade).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="cfop">CFOP</Label>
              <Input id="cfop" value={form.cfop} onChange={(e) => update('cfop', e.target.value)} placeholder="5102" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ncm">NCM</Label>
              <Input id="ncm" value={form.ncm} onChange={(e) => update('ncm', e.target.value)} placeholder="19059090" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="csosn">CSOSN</Label>
              <Input id="csosn" value={form.csosn} onChange={(e) => update('csosn', e.target.value)} placeholder="102" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cst">CST ICMS (Regime Normal)</Label>
              <Input id="cst" value={form.cst} onChange={(e) => update('cst', e.target.value)} placeholder="00" />
              <p className="text-xs text-muted-foreground">Opcional — usado apenas quando o regime tributário é Normal (CRT 3).</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="unidade">Unidade Comercial</Label>
              <Input id="unidade" value={form.unidade} onChange={(e) => update('unidade', e.target.value)} placeholder="UN" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="naturezaOperacao">Natureza da Operação</Label>
              <Input
                id="naturezaOperacao"
                value={form.naturezaOperacao}
                onChange={(e) => update('naturezaOperacao', e.target.value)}
                placeholder="Venda de mercadoria"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="serieNfe">Série NF-e (55)</Label>
              <Input id="serieNfe" type="number" min={1} value={form.serieNfe} onChange={(e) => update('serieNfe', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="serieNfce">Série NFC-e (65)</Label>
              <Input id="serieNfce" type="number" min={1} value={form.serieNfce} onChange={(e) => update('serieNfce', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NFC-e CSC */}
      <Card>
        <CardHeader>
          <CardTitle>CSC (NFC-e)</CardTitle>
          <CardDescription>
            Código de Segurança do Contribuinte, obrigatório para emitir NFC-e (modelo 65).
            {hasCsc && ' Um token já está salvo — preencha novamente apenas para substituí-lo.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="cscId">ID do CSC (idToken)</Label>
              <Input id="cscId" value={form.cscId} onChange={(e) => update('cscId', e.target.value)} placeholder="000001" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cscToken">Token CSC</Label>
              <Input
                id="cscToken"
                type="password"
                value={cscToken}
                onChange={(e) => setCscToken(e.target.value)}
                placeholder={hasCsc ? '•••••••• (salvo)' : 'Token do CSC'}
                autoComplete="off"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certificate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Certificado Digital A1
          </CardTitle>
          <CardDescription>
            Envie o arquivo .pfx/.p12 do certificado A1. Ele é armazenado de forma privada.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            {hasCert ? (
              <span className="flex items-center gap-2 text-foreground">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                Certificado configurado{certFileName ? `: ${certFileName}` : ''}
              </span>
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Nenhum certificado enviado
              </span>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="certPassword">Senha do Certificado</Label>
            <Input
              id="certPassword"
              type="password"
              value={certPassword}
              onChange={(e) => setCertPassword(e.target.value)}
              placeholder="Senha do arquivo .pfx"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Enviada junto com o arquivo e usada ao salvar. É armazenada criptografada.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pfx,.p12,application/x-pkcs12"
            className="hidden"
            data-testid="cert-file-input"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleCertUpload(file)
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {hasCert ? 'Substituir certificado' : 'Enviar certificado'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            'Salvar'
          )}
        </Button>
      </div>
    </div>
  )
}
