import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

export async function analyzeCandidate(resumeText, jobDescription) {
  try {
    const response = await axios.post(`${AI_ENGINE_URL}/analyze`, {
      resume_text: resumeText,
      job_description: jobDescription
    });
    return response.data;
  } catch (error) {
    console.error('Error calling AI engine:', error.response?.data || error.message);
    throw new Error('Failed to analyze candidate via AI Engine');
  }
}
