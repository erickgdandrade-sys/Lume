import { describe, expect, it } from 'vitest'
import { detectPlatform, isInAppBrowser } from '../src/features/lumis-run/share/SharePage'

describe('página do QR: detecção do celular', () => {
  it('reconhece Android e iPhone', () => {
    expect(detectPlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/129 Mobile')).toBe('android')
    expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1')).toBe('ios')
    expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129')).toBe('outro')
  })
  it('reconhece os navegadores embutidos de redes sociais', () => {
    expect(isInAppBrowser('Mozilla/5.0 (iPhone) Mobile/15E148 Instagram 300.0.0')).toBe(true)
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android 14) [FBAN/EMA;FBAV/400.0]')).toBe(true)
    expect(isInAppBrowser('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/129 Mobile Safari/537.36')).toBe(false)
  })
})
