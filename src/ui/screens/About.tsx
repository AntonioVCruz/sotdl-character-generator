// SCR-WEB-019, texto provisório. O conteúdo definitivo é da FEAT-022 (FR-HELP-001 a 003).

export function About() {
  return (
    <section className="page prose" aria-labelledby="about-title">
      <h1 id="about-title" className="typography-display">
        About
      </h1>
      <p className="typography-body">
        SotDL Generator helps you create characters for Shadow of the Demon Lord. This page is a placeholder and will
        explain the project, its sources and its limits.
      </p>
      <p className="typography-meta">
        Shadow of the Demon Lord is a trademark of Schwalb Entertainment. This project is not affiliated with or endorsed
        by the publisher.
      </p>
    </section>
  )
}
