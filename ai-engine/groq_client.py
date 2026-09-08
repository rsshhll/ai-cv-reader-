import os
import json
from groq import Groq
from schemas import MatchResult
from pydantic import ValidationError

def get_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set")
    return Groq(api_key=api_key)

def analyze_candidate(prompt: str, is_retry: bool = False) -> MatchResult:
    client = get_client()
    system_message = "You are a helpful assistant. Return ONLY a valid JSON object matching the requested schema. Do not include any explanations or markdown formatting (like ```json)."
    if is_retry:
        system_message += " Ensure the JSON strictly matches the MatchResult schema. Fix any validation errors from previous attempts."
    
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1,
        response_format={"type": "json_object"}
    )
    
    response_content = completion.choices[0].message.content
    try:
        parsed_json = json.loads(response_content)
        return MatchResult(**parsed_json)
    except (json.JSONDecodeError, ValidationError) as e:
        if not is_retry:
            # Retry once on validation/parsing failure
            return analyze_candidate(prompt, is_retry=True)
        else:
            raise Exception(f"Failed to parse or validate Groq response: {e}\nResponse was: {response_content}")
