// @ts-nocheck
/* eslint-disable */
import { FTABR26_SOCCERMENT as S_DEFAULT } from "../data/ftabr26-soccerment-data";
import { Ftabr26PartnerHeader } from "./ftabr26-partner-header";
import "./ftabr26-soccerment-feature.css";

const copyLinks = [
  ["SICS Atlas", "https://soccerment.com/products/sics-plus/atlas"],
  ["XSEED GPS", "https://soccerment.com/products/xseed/gps"],
  ["MLS Innovation Lab", "https://soccerment.com/media/newsroom/mls-innovation-lab"],
  ["Juventus Forward", "https://soccerment.com/media/newsroom/juventus-forward"],
] as const;

function linkifyCopy(copy: string) {
  const pattern = new RegExp(`(${copyLinks.map(([label]) => label).join("|")})`, "g");
  return copy.split(pattern).map((part, index) => {
    const link = copyLinks.find(([label]) => label === part);
    return link
      ? <a key={`${part}-${index}`} className="soc-copy-link" href={link[1]} target="_blank" rel="noopener noreferrer">{part}</a>
      : part;
  });
}

/** Shared editorial panel, following the report's Playermaker row structure. */
export function Ftabr26SoccermentFeature({ print = false, data }: { print?: boolean; data?: typeof S_DEFAULT }) {
  const S = data ?? S_DEFAULT;   // the report's editable `soccerment` block
  const titleId = print ? "soccerment-print-title" : "soccerment-title";
  const images = [S.images.monitor, ...S.images.gallery];

  return (
    <article className={`ft26-soccerment${print ? " soc-print" : ""}`} aria-labelledby={titleId}>
      <div className="soc-inner">
        <div className="soc-header">
          <Ftabr26PartnerHeader
            name={S.name} headline={S.headline} url={S.url} accent="#38b7e4" buttonColor="#237ba7" print={print} titleId={titleId}
            logo={
              <div className="soc-logo">
                <img src={S.logo} alt={S.name} />
                <img className="soc-logo-emblem" src={S.logo} alt="" aria-hidden="true" />
              </div>
            }
          />
        </div>

        <div className="soc-story-row">
          <div className="soc-story">
            <section className="soc-about">
              <h3 className="soc-label">{S.problemLabel}</h3>
              {S.about.map((paragraph, index) => (
                <p key={paragraph} className={`soc-body${index === 0 ? " soc-intro" : ""}`}>{linkifyCopy(paragraph)}</p>
              ))}
            </section>
            <section className="soc-achievement-panel">
              <h3 className="soc-label">{S.achievementsLabel}</h3>
              <ol className="soc-achievements">
                <li>
                  <span className="soc-index" aria-hidden="true">01</span>
                  <p>
                    {S.metrics.map((metric, i) => (
                      <span key={metric.label}>{i > 0 ? "; " : ""}{metric.value} {metric.label.charAt(0).toLowerCase() + metric.label.slice(1)}</span>
                    ))}.
                  </p>
                </li>
                {S.achievements.map((text, i) => (
                  <li key={text}>
                    <span className="soc-index" aria-hidden="true">{String(i + 2).padStart(2, "0")}</span>
                    <p>{linkifyCopy(text)}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
          <div className="soc-mosaic" aria-label="Soccerment product views">
            {images.map((image, index) => (
              <figure className={`soc-figure${index === 0 ? " soc-figure--lead" : ""}`} key={image.src}>
                <img className="soc-screen" src={image.src} alt={image.alt} loading={print ? "eager" : "lazy"} />
              </figure>
            ))}
          </div>
        </div>

        <div className="soc-bottom">
          <div className="soc-founder">
            <img src={S.founder.photo} alt={`${S.founder.name}, CEO of Soccerment`} loading={print ? "eager" : "lazy"} />
            <div><strong>{S.founder.name}</strong><span>{S.founder.role}</span></div>
          </div>
          <div className="soc-next">
            <h3 className="soc-label">{S.nextLabel}</h3>
            <p className="soc-body">{linkifyCopy(S.next)}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
