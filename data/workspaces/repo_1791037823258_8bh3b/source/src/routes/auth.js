import { findUserByEmail } from '../services/authService.js';

export async function handleLogin(req, res) {
  try {
    const { email, password } = req.body || {};

    // Validate email presence and non-empty constraint
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Email is required and cannot be empty.' });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    return res.status(200).json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
