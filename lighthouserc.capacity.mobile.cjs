// NFR-CAP-001 (FEAT-001 D8): LCP da Home com 100 personagens até 4 s no perfil móvel padrão, como a NFR-PERF-001.
module.exports = require('./lighthouserc.shared.cjs')({ preset: undefined, maxLcp: 4000, capacity: true })
