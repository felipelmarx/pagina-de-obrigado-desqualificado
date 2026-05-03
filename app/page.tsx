import Countdown from "./components/Countdown";
import PurchaseTracker from "./components/PurchaseTracker";
import Script from "next/script";

export default function Home() {
  return (
    <>
      <PurchaseTracker />

      {/* Barra decorativa topo */}
      <div className="top-bar" />

      <main className="main-container">
        {/* Badge + Data */}
        <div className="section-center section-gap-sm">
          <div className="badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Começa em breve
          </div>
          <p className="subtitle">
            Próxima Segunda &mdash; dia 04/05
          </p>
          <p className="subtitle-light">
            Sempre às <span className="subtitle-bold">19h00</span>
          </p>
        </div>

        {/* Countdown */}
        <div className="section-gap-lg">
          <Countdown />
        </div>

        {/* Divider */}
        <div className="divider section-gap-lg" />

        {/* Titulo */}
        <div className="section-center section-gap-lg">
          <h1 className="main-title">
            Seu acesso ao Desafio de 5 Dias de Breathwork e Neurociência da
            Respiração{" "}
            <span className="title-gradient">
              está ativo!
            </span>
          </h1>
        </div>

        {/* VSL Player Vertical */}
        <div className="vsl-container section-gap-lg">
          <div className="vsl-wrapper">
            <div
              dangerouslySetInnerHTML={{
                __html: `<vturb-smartplayer id="vid-69b9ab7dd04b0a3cfd8bbd50" style="display: block; margin: 0 auto; width: 100%; max-width: 400px;"></vturb-smartplayer>`,
              }}
            />
          </div>
        </div>

        {/* Info card com texto do grupo */}
        <div className="info-card section-gap-lg">
          <div className="info-card-icon-wrap">
            <div className="info-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <p className="info-card-text">
            Para garantir seu link de acesso, é necessário entrar no{" "}
            <strong className="info-card-strong">grupo de avisos oficial</strong>.
          </p>
          <p className="info-card-subtext">
            Lá você vai receber o link da Transmissão + Conteúdos extras antes
            do evento.
          </p>
        </div>

        {/* Botao WhatsApp */}
        <div className="btn-wrapper">
          <a
            href="https://lp.felipemarx.com.br/grupo-avisos-desafio-de-breathwork"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Entrar no grupo de avisos
          </a>
        </div>

        {/* Footer sutil */}
        <p className="footer-disclaimer">
          Ao entrar no grupo, você concorda em receber avisos sobre o Desafio.
        </p>
      </main>

      {/* ConverteAI Script */}
      <Script
        src="https://scripts.converteai.net/833af2ee-27dd-45af-bdd8-8a182b93ccf8/players/69b9ab7dd04b0a3cfd8bbd50/v4/player.js"
        strategy="afterInteractive"
      />
    </>
  );
}
