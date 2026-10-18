import { useState } from 'react'
import { DEFAULT_COLORS, DEFAULT_FONTS } from '../../../shared/draft'
import type { DraftColors, DraftFonts, DraftState } from '../../../shared/draft'
import Panel from './Panel'

const SWATCHES: { key: keyof DraftColors; label: string }[] = [
  { key: 'teamName', label: 'Team name' },
  { key: 'score', label: 'Score' },
  { key: 'matchInfo', label: 'Match line' },
]

const HEX = /^#[0-9a-f]{6}$/i

/** A colour arrives as a hex far more often than as a point in a gradient —
 *  it comes off a brand sheet or out of the psd — so the hex is typed in
 *  here, not just read back off the swatch.
 *
 *  `typing` holds the half-written value and nothing else: `#45` is not a
 *  colour and must not reach air. It clears the moment the text parses, so
 *  the field falls back to the live value and the swatch, Defaults and a
 *  committed edit all show through with no syncing to keep them in step. */
function Swatch({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const [typing, setTyping] = useState<string | null>(null)

  const type = (v: string) => {
    if (!HEX.test(v)) return setTyping(v)
    onChange(v.toLowerCase())
    setTyping(null)
  }

  return (
    <label className="field field-color">
      <span className="legend">{label}</span>
      <div className="color-input">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="swatch-hex"
          value={typing ?? value}
          spellCheck={false}
          onChange={(e) => type(e.target.value)}
          onBlur={() => setTyping(null)} // an entry that never parsed reverts
        />
      </div>
    </label>
  )
}

/** Colour and font for one element, stacked — the font choice sits directly
 *  under the swatch it dresses rather than in a shared field, since each of
 *  the three elements picks its own family. */
function StyleField({
  label,
  color,
  onColorChange,
  font,
  fontFiles,
  onFontChange,
}: {
  label: string
  color: string
  onColorChange: (v: string) => void
  font: string
  fontFiles: string[]
  onFontChange: (v: string) => void
}) {
  return (
    <div className="field-stack">
      <Swatch label={label} value={color} onChange={onColorChange} />
      <label className="field field-logo">
        <select value={font} onChange={(e) => onFontChange(e.target.value)}>
          <option value="">Default</option>
          {fontFiles.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

/** Set once per show, so it sits in Setup rather than beside the fields the
 *  operator drives the draft from. One colour and one font per element, not
 *  per side: the hud art carries team identity, the text does not. */
export default function ColorPanel({
  colors,
  fonts,
  fontFiles,
  onChange,
}: {
  colors: DraftColors
  fonts: DraftFonts
  fontFiles: string[]
  onChange: (style: Pick<DraftState, 'colors' | 'fonts'>) => void
}) {
  return (
    <Panel legend="Text Styling">
      {SWATCHES.map(({ key, label }) => (
        <StyleField
          key={key}
          label={label}
          color={colors[key]}
          onColorChange={(v) => onChange({ colors: { ...colors, [key]: v } })}
          font={fonts[key]}
          fontFiles={fontFiles}
          onFontChange={(v) => onChange({ fonts: { ...fonts, [key]: v } })}
        />
      ))}

      <div className="field">
        <span className="legend">Reset</span>
        {/* One change for both: two in one click each start from the pre-click board. */}
        <button
          className="btn"
          onClick={() => onChange({ colors: DEFAULT_COLORS, fonts: DEFAULT_FONTS })}
        >
          Defaults
        </button>
      </div>
    </Panel>
  )
}
