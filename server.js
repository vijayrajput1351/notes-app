const express  = require('express');
const mongoose = require('mongoose');
const path     = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── MongoDB Connection ───────────────────────────────────────────────────────
// MONGO_URI environment variable se aayega — K8s Secret mein store hoga
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/notesdb';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected!'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ─── Note Schema ──────────────────────────────────────────────────────────────
const noteSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  content:   { type: String, required: true },
  category:  { type: String, default: 'General' },
  createdAt: { type: Date, default: Date.now },
});

const Note = mongoose.model('Note', noteSchema);

// ─── API Routes ───────────────────────────────────────────────────────────────

// GET /api/notes — saare notes
app.get('/api/notes', async (req, res) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ error: 'Notes nahi mile' });
  }
});

// POST /api/notes — naya note
app.post('/api/notes', async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title aur content zaruri hai!' });
    }
    const note = await Note.create({ title, content, category });
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: 'Note nahi bana' });
  }
});

// DELETE /api/notes/:id — note delete karo
app.delete('/api/notes/:id', async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted!' });
  } catch (err) {
    res.status(500).json({ error: 'Delete nahi hua' });
  }
});

// GET /health — K8s Liveness + Readiness Probe
app.get('/health', async (req, res) => {
  // MongoDB connected hai ya nahi check karo
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status:   'ok',
    database: dbStatus,
    pod:      process.env.POD_NAME    || 'local',
    version:  process.env.APP_VERSION || 'v1',
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server chal raha hai → http://localhost:${PORT}`);
  console.log(`📦 Pod: ${process.env.POD_NAME || 'local'}`);
});
