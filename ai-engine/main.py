from fastapi import FastAPI, HTTPException
from schemas import AnalyzeRequest, MatchResult
from groq_client import analyze_candidate
from prompts import build_analysis_prompt
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="AI CV Reader Engine - FastAPI + Groq Matcher")

@app.post("/analyze", response_model=MatchResult)
async def analyze(request: AnalyzeRequest):
    try:
        prompt = build_analysis_prompt(request.resume_text, request.job_description)
        result = analyze_candidate(prompt)
        return result
    except ValueError as ve:
        # e.g. missing API key
        raise HTTPException(status_code=500, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during analysis: {str(e)}")

@app.get("/")
async def root():
    return {"message": "AI CV Reader Engine is running. Use POST /analyze to analyze candidates."}
