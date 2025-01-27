// @ts-ignore
import { init, Z3_WASM } from "z3-solver/build/browser"

let z3Instance: any = null
let isInitializing = false
let initPromise: Promise<void> | null = null

export async function initZ3(): Promise<void> {
  if (z3Instance) return
  if (initPromise) return initPromise

  if (typeof window === 'undefined') {
    throw new Error('Z3 initialization requires a browser environment')
  }

  isInitializing = true
  initPromise = (async () => {
    try {
      // Initialize Z3 with explicit WebAssembly loading
      const wasmModule = await WebAssembly.compileStreaming(
        fetch('https://cdn.jsdelivr.net/npm/z3-solver@^4.13.4/build/z3-built.wasm')
      )
      
      z3Instance = await init(wasmModule)
      isInitializing = false
    } catch (error) {
      console.error('Failed to initialize Z3:', error)
      isInitializing = false
      initPromise = null
      throw error
    }
  })()

  return initPromise
}

export function getZ3() {
  if (!z3Instance) {
    throw new Error('Z3 not initialized. Call initZ3() first.')
  }
  return z3Instance
}

export const Z3_RESULTS = {
  sat: 'sat',
  unsat: 'unsat',
} as const
