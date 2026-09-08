from pydantic import BaseModel, Field

class AnalyzeRequest(BaseModel):
    resume_text: str
    job_description: str

class MatchResult(BaseModel):
    match_score: int = Field(..., ge=0, le=100, description="Match score from 0 to 100")
    seniority_level: str
    years_experience: float
    technical_skills: list[str]
    strengths: list[str]
    gaps: list[str]
    interview_questions: list[str] = Field(..., min_length=3, max_length=3, description="Exactly 3 interview questions")
