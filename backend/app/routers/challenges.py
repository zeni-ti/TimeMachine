import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Challenge
from app.schemas.challenge import (
    CaptchaGenerateResponse,
    CaptchaVerifyRequest,
    ChallengeVerifyResponse,
    SudokuGenerateResponse,
    SudokuVerifyRequest,
)
from app.services.puzzle_gen import generate_sudoku_4x4, generate_troll_captcha

router = APIRouter(prefix="/challenges", tags=["Challenges"])


def _is_valid_sudoku_4x4(submitted: list[list[int]], clues: list[list[int | None]]) -> bool:
    if len(submitted) != 4 or any(len(row) != 4 for row in submitted):
        return False

    # Ensure original pre-filled clues weren't altered
    for r in range(4):
        for c in range(4):
            if clues[r][c] is not None and submitted[r][c] != clues[r][c]:
                return False

    expected = {1, 2, 3, 4}

    # Check rows and columns
    for i in range(4):
        if set(submitted[i]) != expected:
            return False
        if {submitted[r][i] for r in range(4)} != expected:
            return False

    # Check 2x2 boxes
    for br in (0, 2):
        for bc in (0, 2):
            box = {submitted[br + dr][bc + dc] for dr in (0, 1) for dc in (0, 1)}
            if box != expected:
                return False

    return True


@router.get("/sudoku", response_model=SudokuGenerateResponse)
def get_sudoku_challenge(blanks: int = Query(4, ge=1, le=8), db: Session = Depends(get_db)):
    """Generates a 4x4 Sudoku puzzle (default 12 of 16 cells complete)."""
    data = generate_sudoku_4x4(blanks=blanks)

    challenge = Challenge(
        challenge_type="sudoku",
        payload={"puzzle": data["puzzle"]},
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)

    return SudokuGenerateResponse(
        challenge_id=challenge.id,
        puzzle=data["puzzle"],
        total_cells=data["total_cells"],
        filled_cells=data["filled_cells"],
    )


@router.post("/sudoku/verify", response_model=ChallengeVerifyResponse)
def verify_sudoku_challenge(payload: SudokuVerifyRequest, db: Session = Depends(get_db)):
    challenge = db.query(Challenge).filter(Challenge.id == payload.challenge_id).first()
    if not challenge or challenge.challenge_type != "sudoku":
        raise HTTPException(status_code=404, detail="Sudoku challenge not found.")

    clues = challenge.payload["puzzle"]
    if not _is_valid_sudoku_4x4(payload.grid, clues):
        return ChallengeVerifyResponse(
            passed=False,
            message="Not quite right! Every row, column, and 2x2 box must contain 1–4.",
        )

    challenge.is_solved = True
    db.commit()
    return ChallengeVerifyResponse(
        passed=True,
        message="Sudoku solved! Proceed to confirmation.",
        verification_token=str(uuid.uuid4()),
    )


@router.get("/captcha", response_model=CaptchaGenerateResponse)
def get_captcha_challenge(
    omit_probability: float = Query(0.65, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
):
    """
    Generates a 3x3 number CAPTCHA.
    65% chance the target digit isn't in the grid at all!
    """
    data = generate_troll_captcha(omit_probability=omit_probability)

    challenge = Challenge(
        challenge_type="captcha",
        payload={
            "correct_indices": data["correct_indices"],
            "has_matches": data["has_matches"],
        },
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)

    return CaptchaGenerateResponse(
        challenge_id=challenge.id,
        target_digit=data["target_digit"],
        grid=data["grid"],
    )


@router.post("/captcha/verify", response_model=ChallengeVerifyResponse)
def verify_captcha_challenge(payload: CaptchaVerifyRequest, db: Session = Depends(get_db)):
    challenge = db.query(Challenge).filter(Challenge.id == payload.challenge_id).first()
    if not challenge or challenge.challenge_type != "captcha":
        raise HTTPException(status_code=404, detail="CAPTCHA challenge not found.")

    has_matches = challenge.payload["has_matches"]
    correct_indices = sorted(challenge.payload["correct_indices"])
    selected = sorted(set(payload.selected_indices))

    if not has_matches:
        return ChallengeVerifyResponse(
            passed=False,
            message="No matching tiles in this grid—tap 'Refresh challenge' to try again!",
        )

    if selected != correct_indices:
        return ChallengeVerifyResponse(
            passed=False,
            message="Incorrect selection. Select ALL matching tiles.",
        )

    challenge.is_solved = True
    db.commit()
    return ChallengeVerifyResponse(
        passed=True,
        message="Verified! You appear to be awake.",
        verification_token=str(uuid.uuid4()),
    )