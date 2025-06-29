import express from 'express';
import { checkModelAvailability } from '../utils/modelCheck.js';

const router = express.Router();

router.get('/', (req, res) => {
  const status = checkModelAvailability();

  res.json({
    status: 'ok',
    modelAvailable: status.available,
    modelPath: status.path,
    message: status.message
  });
});

export default router;