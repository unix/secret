export const textEncoder = new TextEncoder()

export const hex = (bytes: Uint8Array): string => {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
