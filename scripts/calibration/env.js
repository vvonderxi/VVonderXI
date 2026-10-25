/*  THE ANTHROPIC KEY FOR THE CALIBRATION TOOLS (Lucas, 2026-10-25): from the environment first, else from
    ~/.config/anthropic/vv.key, never from .env (the key was moved out of .env on 2026-10-24 so that no run could
    leave it in a repo file). The Supabase settings still come from .env through dotenv, as every script here has
    always read them. Require this before anything that calls the model.  */
const fs = require('fs'), os = require('os'), path = require('path');
require('dotenv').config({ quiet: true });
if (!process.env.ANTHROPIC_API_KEY) {
  const f = path.join(os.homedir(), '.config', 'anthropic', 'vv.key');
  try { const k = fs.readFileSync(f, 'utf8').trim(); if (k) { process.env.ANTHROPIC_API_KEY = k; process.env.VV_KEY_SOURCE = f; } } catch (e) { /* absent: the caller says so */ }
}
module.exports = { keySource: process.env.VV_KEY_SOURCE || (process.env.ANTHROPIC_API_KEY ? 'environment' : null), KEY_FILE: path.join(os.homedir(), '.config', 'anthropic', 'vv.key') };
