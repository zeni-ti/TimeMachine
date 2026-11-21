from pydantic import BaseModel, Field


class SudokuGenerateResponse(BaseModel):
    challenge_id: str
    puzzle: list[list[int | None]]
    total_cells: int
    filled_cells: int


class SudokuVerifyRequest(BaseModel):
    challenge_id: str
    grid: list[list[int]]


class CaptchaGenerateResponse(BaseModel):
    challenge_id: str
    target_digit: int
    grid: list[int]  # 9 numbers (3x3)


class CaptchaVerifyRequest(BaseModel):
    challenge_id: str
    selected_indices: list[int] = Field(default_factory=list)


class ChallengeVerifyResponse(BaseModel):
    passed: bool
    message: str
    verification_token: str | None = None