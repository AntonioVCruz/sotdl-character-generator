// NFR-CAP-001 (FEAT-001 D8): LCP da Home com 100 personagens até 2,5 s no desktop, como a NFR-PERF-001. Mediana de 3.
module.exports = require('./lighthouserc.shared.cjs')({ preset: 'desktop', maxLcp: 2500, capacity: true })
