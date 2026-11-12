import type { AncestryItem } from '../content'
import { formatFormula } from './formula'
import type { Rules } from './resolve'

/** A ancestralidade define a característica com fórmula diferente da padrão do item (D5). */
export function differsFromDefault(rules: Rules, ancestry: AncestryItem, characteristicId: string): boolean {
  const own = ancestry.characteristics?.[characteristicId]
  if (own === undefined) return false
  const standard = rules.characteristics.find((characteristic) => characteristic.id === characteristicId)?.formula
  return JSON.stringify(own) !== JSON.stringify(standard)
}

/**
 * Linha de mecânica de uma ancestralidade (FR-CONT-009), gerada só dos dados: os atributos, cada característica
 * cuja fórmula difere da padrão e os talentos. Ex.: "Strength 10", "Health = Strength + 4", "Size 1/2".
 */
export function mechanics(rules: Rules, ancestry: AncestryItem): { id: string; text: string }[] {
  const attributes = rules.attributes
    .filter((attribute) => ancestry.attributes[attribute.id] !== undefined)
    .map((attribute) => ({ id: attribute.id, text: `${attribute.name} ${ancestry.attributes[attribute.id]}` }))

  const characteristics = rules.characteristics
    .filter((characteristic) => differsFromDefault(rules, ancestry, characteristic.id))
    .map((characteristic) => {
      const formula = ancestry.characteristics![characteristic.id]
      const text = formatFormula(rules, formula, ancestry.id)
      // Constante e escolha de valor se leem como valor ("Speed 8", "Size 1/2 or 1"); o resto, como fórmula.
      const plain = typeof formula === 'number' || ('ref' in formula && formula.ref.startsWith('grant:'))
      return { id: characteristic.id, text: plain ? `${characteristic.name} ${text}` : `${characteristic.name} = ${text}` }
    })

  const talents = (ancestry.talents ?? []).map((id) => {
    const talent = rules.items.get(id)
    return { id, text: talent && 'name' in talent ? talent.name : id }
  })
  return [...attributes, ...characteristics, ...talents]
}
