# Registro de defeitos

> Dono: `sdlc-orchestrator` (rota de manutenção). Só acrescentar linhas; IDs DEF-NNN sequenciais, nunca reusados.

| DEF | Reported | FR / Feature | Symptom | Fixed by | Re-verified |
| :-- | :------- | :----------- | :------ | :------- | :---------- |
| DEF-001 | 2026-11-13 | NFR-ACC-001 / FEAT-007 | A 320 px, os controles da barra fixa do construtor (`.builder__dock`: Next e Summary) passam 15 px da borda direita da tela (achado menor 1 do relatório da FEAT-008). | `5c950ed` | `features/FEAT-007-ancestry-step-map-live-summary/acceptance-report.md`, re-verificação de 2026-11-13 (`14f27a2`) |
| DEF-002 | 2026-11-13 | NFR-ACC-001 / FEAT-007 | Foco fica sob a barra fixa no celular: com Tab, o controle focado da etapa (Ancestry, Attributes) para atrás da `.builder__dock` (WCAG 2.4.11). | `432636b`, `851b60a` | `features/FEAT-007-ancestry-step-map-live-summary/acceptance-report.md`, re-verificação de 2026-11-13 (`14f27a2`) |
