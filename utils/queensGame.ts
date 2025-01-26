import { z3, initZ3 } from "@/lib/z3-solver"

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
  await initZ3()
  const size = board.length
  const ctx = z3.Context()
  const solver = z3.Solver(ctx)

  // Create boolean variables for each cell
  const cells: any[][] = Array(size)
    .fill(null)
    .map((_, i) =>
      Array(size)
        .fill(null)
        .map((_, j) => ctx.mkBoolConst(`cell_${i}_${j}`))
    )

  // 1. Each row must have exactly one queen
  for (let i = 0; i < size; i++) {
    const row = cells[i].map(cell => [cell, 1])
    solver.add(ctx.mkPBEq(row, 1))
  }

  // 2. Each column must have exactly one queen
  for (let j = 0; j < size; j++) {
    const col = cells.map(row => [row[j], 1])
    solver.add(ctx.mkPBEq(col, 1))
  }

  // 3. Each colored region must have exactly one queen
  for (const region of Object.values(coloredRegions)) {
    const regionCells = region.map(([i, j]) => [cells[i][j], 1])
    solver.add(ctx.mkPBEq(regionCells, 1))
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
          solver.add(
            ctx.mkImplies(
              cells[i][j],
              ctx.mkNot(cells[ni][nj])
            )
          )
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
        solver.add(ctx.mkNot(cells[i][j]))
      }
    }
  }

  // Check if the current board state is solvable
  const result = await solver.check()
  return result === z3.sat
}
