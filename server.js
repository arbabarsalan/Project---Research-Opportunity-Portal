require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'research_portal',
  dateStrings: true,
  connectionLimit: 10
});

const FIELDS = ['title','description','research_area','faculty_name','department','required_skills','positions','deadline','status'];
const TEXT = ['title','description','research_area','faculty_name','department','required_skills'];

// Returns an array of error messages. partial=false means every field is required.
function validate(b, partial = false) {
  const errors = [];
  for (const f of FIELDS) {
    const missing = b[f] === undefined || b[f] === null || String(b[f]).trim() === '';
    if (missing) { if (!partial) errors.push(`${f} is required`); continue; }
    if (TEXT.includes(f) && typeof b[f] !== 'string') errors.push(`${f} must be text`);
  }
  if (b.title && b.title.length > 200) errors.push('title must be 200 characters or fewer');
  if (b.positions !== undefined && !(Number.isInteger(Number(b.positions)) && Number(b.positions) >= 1))
    errors.push('positions must be a whole number of 1 or more');
  if (b.deadline !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(b.deadline) || isNaN(Date.parse(b.deadline))))
    errors.push('deadline must be a valid date (YYYY-MM-DD)');
  if (b.status !== undefined && !['Open','Closed'].includes(b.status))
    errors.push('status must be Open or Closed');
  return errors;
}

const validId = (id) => /^\d+$/.test(id) && Number(id) > 0;
const fail = (res, err) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); };

app.post('/api/opportunities', async (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });
  try {
    const b = req.body;
    const [r] = await pool.query(
      `INSERT INTO opportunities (${FIELDS.join(',')}) VALUES (?,?,?,?,?,?,?,?,?)`,
      FIELDS.map(f => typeof b[f] === 'string' ? b[f].trim() : b[f])
    );
    const [rows] = await pool.query('SELECT * FROM opportunities WHERE id = ?', [r.insertId]);
    res.status(201).json(rows[0]);
  } catch (e) { fail(res, e); }
});

app.get('/api/opportunities', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM opportunities ORDER BY created_at DESC, id DESC');
    res.status(200).json(rows);
  } catch (e) { fail(res, e); }
});

app.get('/api/opportunities/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'ID must be a positive number' });
  try {
    const [rows] = await pool.query('SELECT * FROM opportunities WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Opportunity not found' });
    res.status(200).json(rows[0]);
  } catch (e) { fail(res, e); }
});

app.put('/api/opportunities/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'ID must be a positive number' });
  const errors = validate(req.body, true);
  const keys = FIELDS.filter(f => req.body[f] !== undefined);
  if (!keys.length) errors.push('Send at least one field to update');
  if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });
  try {
    const values = keys.map(k => typeof req.body[k] === 'string' ? req.body[k].trim() : req.body[k]);
    const [r] = await pool.query(`UPDATE opportunities SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`, [...values, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Opportunity not found' });
    const [rows] = await pool.query('SELECT * FROM opportunities WHERE id = ?', [req.params.id]);
    res.status(200).json(rows[0]);
  } catch (e) { fail(res, e); }
});

app.delete('/api/opportunities/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ error: 'ID must be a positive number' });
  try {
    const [r] = await pool.query('DELETE FROM opportunities WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Opportunity not found' });
    res.status(200).json({ message: 'Opportunity deleted' });
  } catch (e) { fail(res, e); }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  fail(res, err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Portal running at http://localhost:${PORT}`));
