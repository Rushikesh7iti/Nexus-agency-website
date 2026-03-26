require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;
// Initialize MongoDB Atlas Database
if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('<YOUR_USERNAME>')) {
  console.error('❌ MONGODB ERROR: You must update the .env file with your real MongoDB Atlas URI!');
} else {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas securely. Leads are preserved permanently!'))
    .catch((err) => console.error('❌ MONGODB CONNECTION ERROR:', err.message));
}
// Define Mongoose Schema for Leads
const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  company: { type: String },
  message: { type: String },
  created_at: { type: Date, default: Date.now }
});
const Lead = mongoose.model('Lead', leadSchema);
app.use(express.json());
// Basic Security Middleware for Admin Routes
app.use((req, res, next) => {
  if (req.path === '/admin' || req.path === '/admin.html' || req.path === '/api/leads') {
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
    // Secure credentials configured for the owner
    if (login === 'admin' && password === 'nexus123') {
      return next();
    }
    
    res.set('WWW-Authenticate', 'Basic realm="Nexus Secure Admin"');
    return res.status(401).send('Authentication required. Authorized personnel only.');
  }
  next();
});
app.use(express.static(path.join(__dirname)));
// API: Handle New Lead Submissions
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, company, message } = req.body;
    
    const newLead = new Lead({ name, email, company, message });
    await newLead.save();
    
    console.log(`\n✅ NEW LEAD SAVED TO CLOUD DB (ID: ${newLead._id})`);
    console.log(`Name: ${name} | Email: ${email}`);
    
    res.status(200).json({ success: true, message: 'Message received successfully.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Cloud Database error' });
  }
});
// API: Fetch All Leads (for Admin page)
app.get('/api/leads', async (req, res) => {
  try {
    const leads = await Lead.find().sort({ created_at: -1 });
    // Map _id to id so admin.html dynamically reads it without frontend changes
    const mappedLeads = leads.map(lead => ({
      id: lead._id,
      name: lead.name,
      email: lead.email,
      company: lead.company,
      message: lead.message,
      created_at: lead.created_at
    }));
    res.status(200).json(mappedLeads);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});
// Route: Admin Dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});
// Route: Privacy Policy
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacy.html'));
});
// Route: Terms of Service
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'terms.html'));
});
// Route: Main Site
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.listen(PORT, () => {
  console.log(`🚀 Nexus Agency Backend running at http://localhost:${PORT}`);
  console.log(`📊 Admin Database available at http://localhost:${PORT}/admin`);
});
