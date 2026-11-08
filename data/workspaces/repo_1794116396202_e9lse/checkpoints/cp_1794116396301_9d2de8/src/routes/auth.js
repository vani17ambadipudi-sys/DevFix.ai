import { findUserByEmail } from '../services/authService.js';

export async function handleLogin(req, res) {
  try {
    const { email, password } = req.body || {};

    // BUG: Missing empty/null validation! Calling findUserByEmail with empty email throws an unhandled exception!
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    return res.status(200).json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    // Unhandled exception bubbled up as HTTP 500 Internal Server Error
    return res.status(500).json({ success: false, error: err.message });
  }
}
