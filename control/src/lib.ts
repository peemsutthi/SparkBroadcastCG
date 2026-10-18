import { useEffect, useState } from 'react'
import { API } from '../../shared/relay'

/** Colours and fonts are a show setting, not part of a draft — set once, they
 *  should outlive the reload that puts the board back to step 0. Spread over
 *  the defaults so a key added later fills itself in. */
export const load = <T extends object>(key: string, defaults: T): T => {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(`sparkcg.${key}`) ?? '{}') }
  } catch {
    return defaults // no storage, or someone hand-edited the value
  }
}

/** A roster read off the relay — heroes, team logos, fonts — each a file drop
 *  in assets/, no code change. Picks and bans autocomplete against heroes:
 *  a mistyped hero name is a blank image on air with no error anywhere. */
export function useList(path: string) {
  const [items, setItems] = useState<string[]>([])
  useEffect(() => {
    fetch(`${API}${path}`)
      .then((r) => r.json())
      .then(setItems)
      .catch(() => {}) // relay down: inputs still take typed names, dropdowns stay empty
  }, [path])
  return items
}
