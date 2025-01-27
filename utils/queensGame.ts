import { getZ3, Z3_RESULTS } from "@/lib/z3-solver"

type Cell = "empty" | "queen" | "x"
type Board = Cell[][]
type ColoredRegions = Record<string, [number, number][]>

export function generatePuzzle(size: number): { board: Board; coloredRegions: ColoredRegions } {
  // Initialize an empty board
  const board: Board = Array(size)
    .fill(null)
    .map(() => Array(size).fill("empty"))

  // Generate colored regions
  const coloredRegions: ColoredRegions = {}
  const numRegions = Math.min(size, 8) // Maximum of 8 regions
  const colors = ["#FFB3BA", "#BAFFC9", "#BAE1FF", "#FFFFBA", "#FFB3F7", "#B3FFF7", "#E8BAF7", "#F7E8BA"]

  // Divide the board into roughly equal-sized regions
  const cellsPerRegion = Math.floor((size * size) / numRegions)
  let remainingCells = size * size
  let currentRegionSize = 0
  let currentColor = 0

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const color = colors[currentColor]
      if (!coloredRegions[color]) {
        coloredRegions[color] = []
      }
      coloredRegions[color].push([i, j])
      currentRegionSize++
      remainingCells--

      // Check if we should move to the next region
      if (currentRegionSize >= cellsPerRegion && currentColor < numRegions - 1) {
        currentRegionSize = 0
        currentColor++
      }
    }
  }

  return { board, coloredRegions }
}

export async function checkSolution(board: Board, coloredRegions: ColoredRegions): Promise<boolean> {
  const z3 = getZ3()
  const size = board.length

  const ctx = new z3.Context()
  const solver = new z3.Solver(ctx)

  // Create boolean variables for each cell
  const cells: any[][] = Array(size)
    .fill(null)
    .map((_, i) =>
      Array(size)
        .fill(null)
        .map((_, j) => ctx.bool(`cell_${i}_${j}`))
    )

  // Helper function to create exactly one constraint
  function exactlyOne(vars: any[]) {
    // At least one must be true
    solver.add(z3.Or(...vars))

    // No two can be true at the same time
    for (let i = 0; i < vars.length; i++) {
      for (let j = i + 1; j < vars.length; j++) {
        solver.add(z3.Not(z3.And(vars[i], vars[j])))
      }
    }
  }

  // 1. Each row must have exactly one queen
  for (let i = 0; i < size; i++) {
    exactlyOne(cells[i])
  }

  // 2. Each column must have exactly one queen
  for (let j = 0; j < size; j++) {
    const colVars = cells.map(row => row[j])
    exactlyOne(colVars)
  }

  // 3. Each colored region must have exactly one queen
  for (const region of Object.values(coloredRegions)) {
    const regionVars = region.map(([i, j]) => cells[i][j])
    exactlyOne(regionVars)
  }

  // 4. No two queens can be adjacent (including diagonally)
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ]
      for (const [di, dj] of directions) {
        const ni = i + di, nj = j + dj
        if (ni >= 0 && ni < size && nj >= 0 && nj < size) {
          solver.add(z3.Not(z3.And(cells[i][j], cells[ni][nj])))
        }
      }
    }
  }

  // Set the current board state
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (board[i][j] === "queen") {
        solver.add(cells[i][j])
      } else if (board[i][j] === "x") {
        solver.add(z3.Not(cells[i][j]))
      }
    }
  }

  // Check if the current board state is solvable
  const result = await solver.check()
  return result === Z3_RESULTS.sat
}
