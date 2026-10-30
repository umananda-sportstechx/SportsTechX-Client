// @ts-nocheck
/* eslint-disable */
import type { CSSProperties, ReactNode } from "react";
import "./ftabr26-partner-header.css";

/** One editorial hierarchy and website-control placement for web and PDF. */
export function Ftabr26PartnerHeader({
  name, headline, url, logo, accent, buttonColor = accent, print = false, titleId, className = "",
}: {
  name: string;
  headline: string;
  url: string;
  logo: ReactNode;
  accent: string;
  buttonColor?: string;
  print?: boolean;
  titleId?: string;
  className?: string;
}) {
  const style = {
    "--partner-accent": accent,
    "--partner-rule": `${accent}55`,
    "--partner-button": buttonColor,
  } as CSSProperties;
  return (
    <header className={`ft26-partner-header${print ? " ft26-partner-header--print" : ""} ${className}`} style={style}>
      <div className="ft26-partner-header__logo">{logo}</div>
      <div className="ft26-partner-header__title">
        <h2 id={titleId} className="ft26-partner-header__headline">{headline}</h2>
        <p className="ft26-partner-header__subline">Partner feature · {name}</p>
      </div>
      <div className="ft26-partner-header__actions">
        <a className="ft26-partner-header__visit" href={url} target="_blank" rel="noopener noreferrer">Visit {name}</a>
        <a className="ft26-partner-header__website" href={url} target="_blank" rel="noopener noreferrer" aria-label={`${name} website (opens in a new tab)`}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </a>
      </div>
    </header>
  );
}
