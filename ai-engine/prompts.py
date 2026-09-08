def build_analysis_prompt(resume_text: str, job_description: str) -> str:
    return f"""You are an expert technical recruiter and talent matcher.
Analyze the provided resume against the job description.

Extract the candidate's seniority level, years of experience, technical skills, strengths, and gaps.
Calculate a match score between 0 and 100 representing how well the resume fits the job description.
Return exactly 3 interview questions tailored to the candidate's gaps or specific technical skills.

Job Description:
{job_description}

Resume:
{resume_text}

Return the result as a JSON object matching this schema:
{{
  "match_score": integer (0-100),
  "seniority_level": string,
  "years_experience": float,
  "technical_skills": list of strings,
  "strengths": list of strings,
  "gaps": list of strings,
  "interview_questions": list of 3 strings
}}
"""
