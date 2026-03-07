'use client'

import { useState } from 'react'
import { QrCode, CreditCard, Barcode, MessageSquare } from 'lucide-react'

type PaymentMethod = 'pix' | 'cartao' | 'boleto' | 'outros' | null

export function PublicPaymentOptions() {
  const [selected, setSelected] = useState<PaymentMethod>(null)
  const [outrosDescricao, setOutrosDescricao] = useState('')

  const handlePix = () => {
    // TODO: implement payment — PIX
    setSelected('pix')
  }

  const handleCartao = () => {
    // TODO: implement payment — Cartao de Credito
    setSelected('cartao')
  }

  const handleBoleto = () => {
    // TODO: implement payment — Boleto
    setSelected('boleto')
  }

  const handleOutros = () => {
    // TODO: implement payment — Outros
    setSelected('outros')
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">Forma de Pagamento</h3>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {/* PIX */}
        <button
          onClick={handlePix}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            selected === 'pix'
              ? 'border-rose-500 bg-rose-50 text-rose-700'
              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
          }`}
        >
          <QrCode className="h-6 w-6" />
          <span className="text-xs font-medium">PIX</span>
        </button>

        {/* Cartao de Credito */}
        <button
          onClick={handleCartao}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            selected === 'cartao'
              ? 'border-rose-500 bg-rose-50 text-rose-700'
              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
          }`}
        >
          <CreditCard className="h-6 w-6" />
          <span className="text-xs font-medium text-center">Cartao de Credito</span>
        </button>

        {/* Boleto */}
        <button
          onClick={handleBoleto}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            selected === 'boleto'
              ? 'border-rose-500 bg-rose-50 text-rose-700'
              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
          }`}
        >
          <Barcode className="h-6 w-6" />
          <span className="text-xs font-medium">Boleto</span>
        </button>

        {/* Outros */}
        <button
          onClick={handleOutros}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            selected === 'outros'
              ? 'border-rose-500 bg-rose-50 text-rose-700'
              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
          }`}
        >
          <MessageSquare className="h-6 w-6" />
          <span className="text-xs font-medium">Outros</span>
        </button>
      </div>

      {/* Expanded content for selected method */}
      {selected === 'pix' && (
        <div className="px-5 pb-5">
          <div className="bg-gray-50 rounded-lg p-6 text-center space-y-3">
            <div className="w-32 h-32 mx-auto bg-gray-200 rounded-lg flex items-center justify-center">
              <QrCode className="h-12 w-12 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500">QR Code sera gerado aqui</p>
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-600 transition-colors"
              onClick={() => {
                // TODO: implement payment — PIX
              }}
            >
              Copiar Chave PIX
            </button>
          </div>
        </div>
      )}

      {selected === 'cartao' && (
        <div className="px-5 pb-5">
          <div className="bg-gray-50 rounded-lg p-6 text-center space-y-3">
            <CreditCard className="h-10 w-10 text-gray-400 mx-auto" />
            <p className="text-sm text-gray-600">Pagamento com cartao de credito</p>
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-600 transition-colors"
              onClick={() => {
                // TODO: implement payment — Cartao de Credito
              }}
            >
              Pagar com Cartao
            </button>
          </div>
        </div>
      )}

      {selected === 'boleto' && (
        <div className="px-5 pb-5">
          <div className="bg-gray-50 rounded-lg p-6 text-center space-y-3">
            <Barcode className="h-10 w-10 text-gray-400 mx-auto" />
            <p className="text-sm text-gray-600">Gerar boleto bancario</p>
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-600 transition-colors"
              onClick={() => {
                // TODO: implement payment — Boleto
              }}
            >
              Gerar Boleto
            </button>
          </div>
        </div>
      )}

      {selected === 'outros' && (
        <div className="px-5 pb-5">
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <label className="block text-xs font-medium text-gray-600">
              Descreva a forma de pagamento
            </label>
            <textarea
              value={outrosDescricao}
              onChange={(e) => setOutrosDescricao(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 resize-none"
              rows={3}
              placeholder="Ex: Transferencia bancaria, dinheiro, etc."
            />
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-600 transition-colors"
              onClick={() => {
                // TODO: implement payment — Outros
              }}
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
