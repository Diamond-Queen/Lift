const fs = require('fs');
const path = './lighthouse-report.json';
if (!fs.existsSync(path)) {
  console.error('lighthouse-report.json not found');
  process.exit(1);
}
const r = JSON.parse(fs.readFileSync(path, 'utf8'));
const cats = r.categories || {};

// thresholds (0..1) via env or defaults
const thresholds = {
  performance: parseFloat(process.env.PERF_THRESHOLD || '0.9'),
  accessibility: parseFloat(process.env.ACCESSIBILITY_THRESHOLD || '0.9'),
  'best-practices': parseFloat(process.env.BP_THRESHOLD || '0.9'),
  seo: parseFloat(process.env.SEO_THRESHOLD || '0.9'),
  pwa: parseFloat(process.env.PWA_THRESHOLD || '0.5'),
};

function scoreOf(key) {
  return cats[key] && typeof cats[key].score === 'number' ? cats[key].score : null;
}

const results = {
  performance: scoreOf('performance'),
  accessibility: scoreOf('accessibility'),
  'best-practices': scoreOf('best-practices'),
  seo: scoreOf('seo'),
  pwa: scoreOf('pwa'),
};

console.log('\nLighthouse scores (0-100):');
Object.keys(results).forEach(k=>{
  const v = results[k];
  console.log(`${k.padEnd(15)} ${v!=null?Math.round(v*100):'n/a'}`);
});

const audits = Object.values(r.audits || {});
const opps = audits.filter(a=>a.details && a.details.type === 'opportunity')
  .sort((a,b)=> (b.details?.overallSavingsMs || 0) - (a.details?.overallSavingsMs || 0))
  .slice(0,5);

console.log('\nTop opportunities:');
if (opps.length === 0) console.log('  none');
opps.forEach(o=>{
  const savings = o.details?.overallSavingsMs ? `${Math.round(o.details.overallSavingsMs)}ms` : (o.details?.overallSavingsBytes ? `${o.details.overallSavingsBytes} bytes` : 'n/a');
  console.log(` - ${o.title} — savings: ${savings}`);
});

console.log('\nTop failing audits (first 5):');
const failing = audits.filter(a=>typeof a.score === 'number' && a.score < 0.9).slice(0,5);
if (failing.length === 0) console.log('  none');
failing.forEach(f=>console.log(` - ${f.title} — score: ${f.score}`));

// Write a markdown summary file for PR comments
const mdLines = [];
mdLines.push('# Lighthouse summary');
mdLines.push('');
mdLines.push('| Category | Score | Threshold |');
mdLines.push('|---|---:|---:|');
Object.keys(results).forEach(k=>{
  const v = results[k];
  const t = thresholds[k] || 0;
  mdLines.push(`| ${k} | ${v!=null?Math.round(v*100):'n/a'} | ${Math.round(t*100)} |`);
});
mdLines.push('');
mdLines.push('## Top opportunities');
if (opps.length === 0) mdLines.push('- none');
opps.forEach(o=>{
  const savings = o.details?.overallSavingsMs ? `${Math.round(o.details.overallSavingsMs)}ms` : (o.details?.overallSavingsBytes ? `${o.details.overallSavingsBytes} bytes` : 'n/a');
  mdLines.push(`- **${o.title}** — savings: ${savings}`);
});

mdLines.push('');
mdLines.push('## Top failing audits');
if (failing.length === 0) mdLines.push('- none');
failing.forEach(f=> mdLines.push(`- **${f.title}** — score: ${f.score}`));

mdLines.push('');
mdLines.push('Full JSON artifact: `lighthouse-report.json`');

fs.writeFileSync('./lighthouse-summary.md', mdLines.join('\n'));
console.log('\nWrote lighthouse-summary.md');

// determine if thresholds are met
const below = Object.keys(results).filter(k => {
  const v = results[k];
  const t = thresholds[k] || 0;
  return v == null ? false : (v < t);
});
if (below.length > 0) {
  console.error('\nThresholds not met for:', below.join(', '));
  // exit non-zero so CI can fail
  process.exit(2);
}

console.log('\nAll thresholds met');
console.log('\nFull Lighthouse JSON saved as lighthouse-report.json');
