import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import candidatesRouter from './routes/candidates.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/candidates', candidatesRouter);

app.get('/', (req, res) => {
  res.send('Gateway API is running');
});

app.listen(port, () => {
  console.log(`Gateway listening on port ${port}`);
});
