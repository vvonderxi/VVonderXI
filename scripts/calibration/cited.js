/*  THE CITED WRITER LIVES IN api/_cited/cited.js SINCE 2026-10-25: the Vercel allowlist (.vercelignore) ships /api and
    not /scripts, and the first preview of the port failed with "Cannot find module '../scripts/calibration/cited.js'".
    A file under api/ whose path starts with an underscore is not a function, so it is bundled and not served. This
    path stays as the calibration scripts' and the self-test's entry.  */
module.exports = require('../../api/_cited/cited.js');
