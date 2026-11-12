// NFR-PERF-001 (ADR-008): LCP da Home até 4 s em celular médio com 4G simulado (perfil móvel padrão do Lighthouse).
module.exports = require('./lighthouserc.shared.cjs')({ preset: undefined, maxLcp: 4000 })
