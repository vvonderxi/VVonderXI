// /api/auth.js — VVonderXI Locker Room Auth
// Wraps Supabase Auth for sign-in and registration.
// Uses Supabase's built-in auth system — passwords hashed by Supabase, never stored in plaintext.

const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Auth not configured' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { action, email, password, name } = req.body || {};

  if (!action || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    if (action === 'register') {
      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name || email.split('@')[0] }
        }
      });

      if (error) {
        // User already exists
        if (error.message.includes('already registered') || error.status === 422) {
          return res.status(400).json({ error: 'A locker already exists for this email. Sign in instead.' });
        }
        return res.status(400).json({ error: error.message });
      }

      // Store display name in locker_profiles table
      try {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        await serviceSupabase.from('locker_profiles').upsert({
          user_id: data.user?.id,
          email: email,
          display_name: name || email.split('@')[0],
          joined_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      } catch (profileErr) {
        // Non-critical — profile can be created later
        console.log('Profile creation skipped:', profileErr.message);
      }

      return res.json({
        ok: true,
        name: name || email.split('@')[0],
        joined: new Date().toISOString(),
        message: data.user?.email_confirmed_at
          ? 'Locker created.'
          : 'Locker created. Check your email to confirm your account.'
      });

    } else if (action === 'signin') {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.includes('Invalid login')) {
          return res.status(401).json({ error: 'Incorrect email or password. Try again.' });
        }
        return res.status(401).json({ error: error.message });
      }

      // Get display name from locker_profiles
      let displayName = email.split('@')[0];
      let joined = data.user?.created_at || new Date().toISOString();
      try {
        const serviceSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const { data: profile } = await serviceSupabase
          .from('locker_profiles')
          .select('display_name, joined_at')
          .eq('user_id', data.user.id)
          .single();
        if (profile) {
          displayName = profile.display_name || displayName;
          joined = profile.joined_at || joined;
        }
      } catch (profileErr) {
        // Non-critical
      }

      return res.json({
        ok: true,
        name: displayName,
        joined: joined,
        access_token: data.session?.access_token || null,
      });

    } else {
      return res.status(400).json({ error: 'Unknown action' });
    }

  } catch (err) {
    console.error('auth.js error:', err.message);
    return res.status(500).json({ error: 'Authentication service unavailable. Try again.' });
  }
};
