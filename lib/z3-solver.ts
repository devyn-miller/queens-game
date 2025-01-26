import { init } from "z3-solver"

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
  initPromise = init()
    .then((instance) => {
      z3Instance = instance
      isInitializing = false
    })
    .catch((error) => {
      console.error('Failed to initialize Z3:', error)
      isInitializing = false
      initPromise = null
      throw new Error('Failed to initialize Z3. Please check console for details.')
    })

  return initPromise
}

export const z3 = {
  Context: () => {
    if (!z3Instance) {
      throw new Error('Z3 not initialized. Call initZ3() first.')
    }
    return new z3Instance.Context('main')
  },
  Solver: (ctx: any) => {
    if (!z3Instance) {
      throw new Error('Z3 not initialized. Call initZ3() first.')
    }
    return new z3Instance.Solver(ctx)
  },
  sat: 'sat' as const,
  unsat: 'unsat' as const,
}
