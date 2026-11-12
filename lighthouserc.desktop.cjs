// NFR-PERF-001 (ADR-008): LCP da Home até 2,5 s no desktop. Mediana de 3 execuções.
// Mede o build servido pelo `vite preview`; rode `npm run build` antes, com o mesmo BASE_PATH.
module.exports = require('./lighthouserc.shared.cjs')({ preset: 'desktop', maxLcp: 2500 })
