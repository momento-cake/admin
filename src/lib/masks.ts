export function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 2) return numbers
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`
}

export function formatCEP(value: string): string {
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 5) return numbers
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`
}

export function getContactFieldConfig(type: string): { label: string; placeholder: string; inputType: string; mask?: (value: string) => string } {
  switch (type) {
    case 'phone': return { label: 'Telefone', placeholder: '(11) 99999-9999', inputType: 'tel', mask: formatPhone }
    case 'email': return { label: 'Email', placeholder: 'email@exemplo.com', inputType: 'email' }
    case 'whatsapp': return { label: 'WhatsApp', placeholder: '(11) 99999-9999', inputType: 'tel', mask: formatPhone }
    case 'instagram': return { label: 'Instagram', placeholder: '@usuario', inputType: 'text' }
    case 'facebook': return { label: 'Facebook', placeholder: 'facebook.com/usuario', inputType: 'text' }
    case 'linkedin': return { label: 'LinkedIn', placeholder: 'linkedin.com/in/usuario', inputType: 'text' }
    default: return { label: 'Contato', placeholder: 'Informação de contato', inputType: 'text' }
  }
}
