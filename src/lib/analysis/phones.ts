// Contatos que não estão salvos no celular de quem exportou aparecem no export só como número
// ("+55 11 98765-4321"). O WhatsApp não exporta o nome que a pessoa usa no perfil.

/** "+55 11 98765-4321", "(11) 98765-4321", "+1 (555) 123-4567" */
export function isPhoneNumber(name: string): boolean {
  // Tira marcas de direção de texto e troca hífens tipográficos (‑ –) pelo comum
  const clean = name.replace(/[‎‏‪-‮]/g, '').replace(/[‐-―]/g, '-').trim()
  return /^\+?[\d\s().-]+$/.test(clean) && clean.replace(/\D/g, '').length >= 8
}

/**
 * Rótulos que escondem o número: "Contato •4321".
 * Se dois números terminam igual, usa mais dígitos até ficarem diferentes.
 */
export function phoneLabels(names: Iterable<string>): Map<string, string> {
  const phones = [...new Set(names)].filter(isPhoneNumber)
  const digits = new Map(phones.map((p) => [p, p.replace(/\D/g, '')]))
  const labels = new Map<string, string>()

  for (const phone of phones) {
    const mine = digits.get(phone)!
    let size = 4
    while (
      size < mine.length &&
      phones.some((other) => other !== phone && digits.get(other)!.endsWith(mine.slice(-size)))
    ) {
      size++
    }
    labels.set(phone, `Contato •${mine.slice(-size)}`)
  }
  return labels
}
