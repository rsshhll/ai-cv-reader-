import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { supabase } from '../lib/supabaseClient.js';
import { analyzeCandidate } from '../lib/aiEngineClient.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// GET /candidates
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('match_score', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /candidates/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

// PATCH /candidates/:id
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const { data, error } = await supabase
    .from('candidates')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /candidates
router.post('/', upload.single('resume'), async (req, res) => {
  try {
    const { name, email, job_description } = req.body;
    const file = req.file;

    if (!file || !job_description) {
      return res.status(400).json({ error: 'Resume file and job_description are required' });
    }

    // 1. Upload resume to Supabase Storage
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: publicUrlData } = supabase.storage
      .from('resumes')
      .getPublicUrl(filePath);
    const resumeUrl = publicUrlData.publicUrl;

    // 2. Parse PDF to extract text
    let resumeText = '';
    if (file.mimetype === 'application/pdf') {
      const pdfData = await pdfParse(file.buffer);
      resumeText = pdfData.text;
    } else {
      resumeText = file.buffer.toString('utf-8');
    }

    // 3. Call AI Engine FastAPI Service
    const aiResult = await analyzeCandidate(resumeText, job_description);

    // 4. Insert row into Supabase DB
    const newCandidate = {
      name: name || 'Unknown',
      email: email || 'unknown@example.com',
      resume_url: resumeUrl,
      job_description,
      match_score: aiResult.match_score,
      seniority_level: aiResult.seniority_level,
      skills: aiResult.technical_skills,
      strengths: aiResult.strengths,
      gaps: aiResult.gaps,
      interview_questions: aiResult.interview_questions,
      status: 'pending'
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('candidates')
      .insert([newCandidate])
      .select()
      .single();

    if (insertError) throw new Error(`DB Insert failed: ${insertError.message}`);

    res.status(201).json(insertedData);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
