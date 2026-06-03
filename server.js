const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/z-imoveis', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// ==================== SCHEMAS ====================

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'agent'], default: 'agent' },
  avatar: String,
  createdAt: { type: Date, default: Date.now },
});

// Property Schema
const propertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  location: { type: String, required: true },
  price: { type: Number, required: true },
  bedrooms: Number,
  bathrooms: Number,
  area: Number,
  description: String,
  imageUrl: String,
  status: { type: String, enum: ['active', 'pending', 'sold', 'inactive'], default: 'active' },
  type: { type: String, enum: ['apartment', 'house', 'penthouse', 'villa'], required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Lead Schema
const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  subject: String,
  message: { type: String, required: true },
  propertyInterest: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  status: { type: String, enum: ['new', 'contacted', 'qualified', 'closed'], default: 'new' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Models
const User = mongoose.model('User', userSchema);
const Property = mongoose.model('Property', propertySchema);
const Lead = mongoose.model('Lead', leadSchema);

// ==================== MIDDLEWARE ====================

// JWT Verification
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.userId = decoded.id;
    next();
  });
};

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'agent',
    });

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d',
    });

    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: '7d',
    });

    res.json({ 
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PROPERTY ROUTES ====================

// Get all properties
app.get('/api/properties', async (req, res) => {
  try {
    const properties = await Property.find().populate('createdBy', 'name email');
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single property
app.get('/api/properties/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate('createdBy', 'name email');
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json(property);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create property
app.post('/api/properties', verifyToken, async (req, res) => {
  try {
    const { title, location, price, bedrooms, bathrooms, area, description, imageUrl, type } = req.body;

    if (!title || !location || !price || !type) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const property = new Property({
      title,
      location,
      price,
      bedrooms,
      bathrooms,
      area,
      description,
      imageUrl,
      type,
      createdBy: req.userId,
    });

    await property.save();
    res.status(201).json(property);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update property
app.put('/api/properties/:id', verifyToken, async (req, res) => {
  try {
    const { title, location, price, bedrooms, bathrooms, area, description, imageUrl, status, type } = req.body;

    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { title, location, price, bedrooms, bathrooms, area, description, imageUrl, status, type, updatedAt: Date.now() },
      { new: true }
    );

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete property
app.delete('/api/properties/:id', verifyToken, async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json({ message: 'Property deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== LEAD ROUTES ====================

// Get all leads
app.get('/api/leads', verifyToken, async (req, res) => {
  try {
    const leads = await Lead.find()
      .populate('assignedTo', 'name email')
      .populate('propertyInterest', 'title location price');
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single lead
app.get('/api/leads/:id', verifyToken, async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('propertyInterest', 'title location price');
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create lead (public)
app.post('/api/leads', async (req, res) => {
  try {
    const { name, email, phone, subject, message, propertyInterest } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const lead = new Lead({
      name,
      email,
      phone,
      subject,
      message,
      propertyInterest,
      status: 'new',
    });

    await lead.save();
    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update lead
app.put('/api/leads/:id', verifyToken, async (req, res) => {
  try {
    const { status, assignedTo, notes } = req.body;

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { status, assignedTo, notes, updatedAt: Date.now() },
      { new: true }
    ).populate('assignedTo', 'name email');

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete lead
app.delete('/api/leads/:id', verifyToken, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    res.json({ message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TEAM ROUTES ====================

// Get all users (team members)
app.get('/api/team', verifyToken, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== STATS ROUTE ====================

app.get('/api/stats', verifyToken, async (req, res) => {
  try {
    const totalProperties = await Property.countDocuments({ status: 'active' });
    const totalLeads = await Lead.countDocuments();
    const newLeads = await Lead.countDocuments({ status: 'new' });
    const properties = await Property.find();
    
    const volumeInPortfolio = properties.reduce((sum, p) => sum + p.price, 0);

    res.json({
      activeProperties: totalProperties,
      totalLeads,
      newLeads,
      volumeInPortfolio,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
