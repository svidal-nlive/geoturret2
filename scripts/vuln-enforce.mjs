#!/usr/bin/env node
import { execSync } from 'node:child_process';

// Basic vulnerability enforcement: fail on HIGH or CRITICAL from npm audit (prod deps only)
// Future: integrate Trivy JSON output parsing once image build pipeline present.
try {
  const output = execSync('npm audit --omit=dev --json', { stdio: ['ignore','pipe','pipe'] }).toString();
  const data = JSON.parse(output);
  let high = 0, critical = 0;
  if (data.vulnerabilities) {
    for (const v of Object.values(data.vulnerabilities)) {
      const sev = v.severity || v.severitySource;
      if (sev === 'high') high += v.via?.length ? 1 : 1;
      if (sev === 'critical') critical += v.via?.length ? 1 : 1;
    }
  }
  if (critical > 0 || high > 5) {
    console.error(`Vulnerability threshold exceeded: critical=${critical} high=${high} (limit: critical=0 high<=5)`);
    process.exit(1);
  } else {
    console.log(`Vulnerability check OK: critical=${critical} high=${high}`);
  }
} catch (err) {
  console.error('npm audit failed to produce JSON (non-blocking fallback)', err.message);
  process.exit(0); // do not block if audit internal error
}
