import random


def generate_sudoku_4x4(blanks: int = 4) -> dict:
    """
    Generates a randomized valid 4x4 Sudoku puzzle with `blanks` empty cells.
    Returns a 4x4 puzzle matrix (None = blank) and the 4x4 solution matrix.
    """
    base = [
        [1, 2, 3, 4],
        [3, 4, 1, 2],
        [2, 1, 4, 3],
        [4, 3, 2, 1],
    ]

    digits = [1, 2, 3, 4]
    shuffled = digits[:]
    random.shuffle(shuffled)
    mapping = dict(zip(digits, shuffled))
    grid = [[mapping[val] for val in row] for row in base]

    if random.choice([True, False]):
        grid[0], grid[1] = grid[1], grid[0]
    if random.choice([True, False]):
        grid[2], grid[3] = grid[3], grid[2]
    if random.choice([True, False]):
        grid[0:2], grid[2:4] = grid[2:4], grid[0:2]

    def swap_cols(g: list[list[int]], c1: int, c2: int) -> None:
        for r in range(4):
            g[r][c1], g[r][c2] = g[r][c2], g[r][c1]

    if random.choice([True, False]):
        swap_cols(grid, 0, 1)
    if random.choice([True, False]):
        swap_cols(grid, 2, 3)
    if random.choice([True, False]):
        swap_cols(grid, 0, 2)
        swap_cols(grid, 1, 3)

    solution = [row[:] for row in grid]
    puzzle: list[list[int | None]] = [row[:] for row in grid]

    all_positions = [(r, c) for r in range(4) for c in range(4)]
    for r, c in random.sample(all_positions, blanks):
        puzzle[r][c] = None

    return {
        "puzzle": puzzle,
        "solution": solution,
        "total_cells": 16,
        "filled_cells": 16 - blanks,
    }


def generate_troll_captcha(omit_probability: float = 0.65) -> dict:
    """
    Generates a 3x3 grid of digits (length 9) and a target digit.
    With `omit_probability`, the target digit is intentionally missing from the grid!
    """
    target_digit = random.randint(0, 9)
    other_digits = [d for d in range(10) if d != target_digit]

    if random.random() < omit_probability:
        grid = random.sample(other_digits, 9)
    else:
        match_count = random.randint(1, 3)
        grid = [target_digit] * match_count + random.sample(other_digits, 9 - match_count)
        random.shuffle(grid)

    correct_indices = [idx for idx, val in enumerate(grid) if val == target_digit]

    return {
        "target_digit": target_digit,
        "grid": grid,
        "correct_indices": correct_indices,
        "has_matches": len(correct_indices) > 0,
    }