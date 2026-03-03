'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { WorkplaceLocation } from '@/types/time-tracking'

interface LocationFormProps {
  location?: WorkplaceLocation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function LocationForm({ location, open, onOpenChange, onSuccess }: LocationFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(location?.name ?? '')
  const [address, setAddress] = useState(location?.address ?? '')
  const [latitude, setLatitude] = useState(location?.latitude?.toString() ?? '')
  const [longitude, setLongitude] = useState(location?.longitude?.toString() ?? '')
  const [radiusMeters, setRadiusMeters] = useState(location?.radiusMeters?.toString() ?? '100')
  const [isActive, setIsActive] = useState(location?.isActive ?? true)

  const handleSubmit = async () => {
    setError(null)

    if (!name.trim()) {
      setError('Nome do local e obrigatorio')
      return
    }

    if (!address.trim()) {
      setError('Endereco e obrigatorio')
      return
    }

    const lat = parseFloat(latitude)
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitude deve ser entre -90 e 90')
      return
    }

    const lng = parseFloat(longitude)
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Longitude deve ser entre -180 e 180')
      return
    }

    const radius = parseInt(radiusMeters)
    if (isNaN(radius) || radius < 10 || radius > 10000) {
      setError('Raio deve ser entre 10 e 10.000 metros')
      return
    }

    try {
      setLoading(true)

      const body = {
        name: name.trim(),
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        radiusMeters: radius,
        isActive,
      }

      const method = location ? 'PUT' : 'POST'
      const url = location
        ? `/api/workplace-locations/${location.id}`
        : '/api/workplace-locations'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Erro ao salvar local')
        return
      }

      toast.success(location ? 'Local atualizado com sucesso!' : 'Local criado com sucesso!')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar local')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {location ? 'Editar Local' : 'Novo Local de Trabalho'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive flex items-start gap-2 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="location-name">Nome</Label>
            <Input
              id="location-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Padaria Central, Cozinha Industrial"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="location-address">Endereco</Label>
            <Input
              id="location-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, numero, bairro, cidade - UF"
            />
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="-23.550520"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="-46.633308"
              />
            </div>
          </div>

          {/* Radius */}
          <div className="space-y-2">
            <Label htmlFor="radius">Raio (metros)</Label>
            <Input
              id="radius"
              type="number"
              min={10}
              max={10000}
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(e.target.value)}
              placeholder="100"
            />
            <p className="text-xs text-muted-foreground">
              Raio de geofence para referencia (10 a 10.000 metros)
            </p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Ativo</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {loading ? 'Salvando...' : location ? 'Atualizar' : 'Criar Local'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
