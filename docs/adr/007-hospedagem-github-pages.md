# ADR-007: Hospedagem no GitHub Pages com deploy por GitHub Actions

**Status:** Aceita
**Data:** 2026-11-11
**Requisitos atendidos:** NFR-COST-001, NFR-SEC-001, NFR-REL-002, NFR-PRIV-001.

## Contexto

Site estático (ADR-001), público (Q1), repositório já no GitHub, custo zero (NFR-COST-001), HTTPS obrigatório (NFR-SEC-001), meta de 99% de disponibilidade (NFR-REL-002). Decidido pelo usuário: GitHub Pages.

## Decisão

- **GitHub Pages**, publicado por workflow do GitHub Actions a partir do `main`, depois do CI verde (ADR-008).
- **Ambientes:** produção apenas. Local é o ambiente de desenvolvimento; não há homologação nem prévia por PR.
- **HTTPS obrigatório** nas configurações do Pages.
- **Política de segurança por `<meta http-equiv="Content-Security-Policy">`**, já que o Pages não permite cabeçalhos próprios: só recursos do próprio site, sem scripts inline, sem `eval`.
- **Base de caminho** do Vite ajustada ao endereço do Pages (`/<repositório>/` ou domínio próprio, a decidir na publicação).

## Opções consideradas

- **GitHub Pages (escolhida).** Prós: junto do repositório, sem outra conta, gratuito, HTTPS automático. Contras: sem cabeçalhos HTTP próprios (CSP por meta não cobre `frame-ancestors`), sem prévia por PR, sem reescrita de rotas.
- **Cloudflare Pages.** Prós: arquivo `_headers`, prévia por PR, banda ilimitada. Contras: mais uma conta; plataforma em fusão com Workers. Perdeu na escolha do usuário.

## Consequências

- Sem cabeçalho `frame-ancestors`, o site pode ser embutido em outra página. O risco é baixo: não há login nem dados de terceiros.
- A troca de host é barata: o build é uma pasta estática. Mudar se precisar de cabeçalhos ou de prévias.
- As regras de uso do GitHub Pages proíbem uso comercial; o projeto não é comercial.
