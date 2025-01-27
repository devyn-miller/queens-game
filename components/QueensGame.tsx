"use client"

import { useState, useEffect } from "react"
import { generatePuzzle, checkSolution } from "../utils/queensGame"
import { initZ3 } from "@/lib/z3-solver"

type Cell = "empty" | "queen" | "x"
type Board = Cell[][]
type ColoredRegions = Record<string, [number, number][]>

export default function QueensGame() {
  const [size, setSize] = useState(7)
  const [board, setBoard] = useState<Board>([])
  const [coloredRegions, setColoredRegions] = useState<ColoredRegions>({})
  const [message, setMessage] = useState("")
  const [checking, setChecking] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        await initZ3()
        if (mounted) {
          setInitialized(true)
          setInitError(null)
          newGame()
        }
      } catch (error) {
        console.error("Failed to initialize Z3:", error)
        if (mounted) {
          setInitError("Failed to initialize the solver. Please refresh the page and try again.")
        }
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [])

  function newGame() {
    if (!initialized) return
    const { board, coloredRegions } = generatePuzzle(size)
    setBoard(board)
    setColoredRegions(coloredRegions)
    setMessage("")
  }

  async function handleCellClick(row: number, col: number) {
    if (checking || !initialized) return

    const newBoard = [...board.map(row => [...row])]
    if (newBoard[row][col] === "empty") {
      newBoard[row][col] = "x"
    } else if (newBoard[row][col] === "x") {
      newBoard[row][col] = "queen"
    } else {
      newBoard[row][col] = "empty"
    }
    setBoard(newBoard)

    setChecking(true)
    try {
      const isSolved = await checkSolution(newBoard, coloredRegions)
      if (isSolved) {
        setMessage("Congratulations! You solved the puzzle!")
      } else {
        setMessage("")
      }
    } catch (error) {
      console.error("Error checking solution:", error)
      setMessage("Error checking solution. Please try again.")
    } finally {
      setChecking(false)
    }
  }

  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 text-lg font-bold mb-4"> {initError}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    )
  }

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-lg">Initializing solver...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <h1 className="text-2xl font-bold">LinkedIn's Queens Game</h1>
      <div className="flex space-x-2">
        <label className="flex items-center">
          <span className="mr-2">Board Size:</span>
          <input
            type="number"
            min="4"
            max="10"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-16 border rounded px-2 py-1"
            disabled={checking}
          />
        </label>
        <button 
          onClick={newGame} 
          className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors ${
            checking ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={checking}
        >
          New Game
        </button>
      </div>
      <div 
        className="grid gap-1 bg-white rounded-lg p-4 shadow-lg relative" 
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {checking && (
          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
        {board.map((row, i) =>
          row.map((cell, j) => {
            const color = Object.entries(coloredRegions).find(
              ([_, cells]) => cells.some(([r, c]) => r === i && c === j)
            )?.[0] || "white"
            return (
              <div
                key={`${i}-${j}`}
                className={`w-12 h-12 flex items-center justify-center text-3xl cursor-pointer border border-gray-200 transition-all duration-200 ${
                  checking ? "opacity-50" : "hover:opacity-80"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleCellClick(i, j)}
              >
                {cell === "queen" ? "♛" : cell === "x" ? "X" : ""}
              </div>
            )
          })
        )}
      </div>
      {message && (
        <div 
          className={`text-lg font-bold p-2 rounded ${
            message.includes("Error") ? "text-red-500 bg-red-50" : "text-green-500 bg-green-50"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  )
}
