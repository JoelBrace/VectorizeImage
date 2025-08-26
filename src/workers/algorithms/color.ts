export type RGB = { r: number; g: number; b: number }

export function clamp01(x: number) { return Math.max(0, Math.min(1, x)) }

export function hexToRgb(hex: string): RGB {
  hex = hex.replace('#','').trim()
  if (hex.length === 3) {
    const r = parseInt(hex[0]+hex[0],16)
    const g = parseInt(hex[1]+hex[1],16)
    const b = parseInt(hex[2]+hex[2],16)
    return { r, g, b }
  }
  const r = parseInt(hex.slice(0,2),16)
  const g = parseInt(hex.slice(2,4),16)
  const b = parseInt(hex.slice(4,6),16)
  return { r, g, b }
}

export function rgbToHex({r,g,b}: RGB): string {
  const toHex = (v:number)=> v.toString(16).padStart(2,'0')
  return '#' + toHex(Math.round(r)) + toHex(Math.round(g)) + toHex(Math.round(b))
}

// sRGB to linear
function srgbToLinear(c: number) {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}
function linearToSrgb(c: number) {
  const v = clamp01(c)
  return v <= 0.0031308 ? 255 * (12.92 * v) : 255 * (1.055 * Math.pow(v, 1/2.4) - 0.055)
}

// OKLab conversion (Björn Ottosson)
export function rgbToOklab(r: number, g: number, b: number) {
  const rl = srgbToLinear(r), gl = srgbToLinear(g), bl = srgbToLinear(b)

  const l = 0.4122214708*rl + 0.5363325363*gl + 0.0514459929*bl
  const m = 0.2119034982*rl + 0.6806995451*gl + 0.1073969566*bl
  const s = 0.0883024619*rl + 0.2817188376*gl + 0.6299787005*bl

  const l_ = Math.cbrt(l)
  const m_ = Math.cbrt(m)
  const s_ = Math.cbrt(s)

  return {
    L: 0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_,
    a: 1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_,
    b: 0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_,
  }
}

export function oklabToRgb(L: number, a: number, b: number): RGB {
  const l_ = L + 0.3963377774*a + 0.2158037573*b
  const m_ = L - 0.1055613458*a - 0.0638541728*b
  const s_ = L - 0.0894841775*a - 1.2914855480*b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  const rl = +4.0767416621*l - 3.3077115913*m + 0.2309699292*s
  const gl = -1.2684380046*l + 2.6097574011*m - 0.3413193965*s
  const bl = -0.0041960863*l - 0.7034186147*m + 1.7076147010*s

  return {
    r: linearToSrgb(rl),
    g: linearToSrgb(gl),
    b: linearToSrgb(bl),
  }
}

export function deltaE_oklab(a: {L:number,a:number,b:number}, b_: {L:number,a:number,b:number}) {
  const dL = a.L - b_.L
  const da = a.a - b_.a
  const db = a.b - b_.b
  return Math.sqrt(dL*dL + da*da + db*db)
}

export function toHexFromLab(L:number,a:number,b:number): string {
  const rgb = oklabToRgb(L,a,b)
  return rgbToHex(rgb)
}

export function hexToLab(hex: string) {
  const {r,g,b} = hexToRgb(hex)
  return rgbToOklab(r,g,b)
}
