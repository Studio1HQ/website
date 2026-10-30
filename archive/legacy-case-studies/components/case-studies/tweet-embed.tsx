"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load: (element?: HTMLElement) => void;
      };
    };
  }
}

const WIDGET_SCRIPT = "https://platform.twitter.com/widgets.js";

type TweetEmbedProps = {
  url: string;
};

/** Loads X's official post widget while keeping a readable link as fallback. */
export function TweetEmbed({ url }: TweetEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const render = () => window.twttr?.widgets?.load(containerRef.current ?? undefined);
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${WIDGET_SCRIPT}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", render);
      render();
      return () => existingScript.removeEventListener("load", render);
    }

    const script = document.createElement("script");
    script.src = WIDGET_SCRIPT;
    script.async = true;
    script.addEventListener("load", render);
    document.body.appendChild(script);

    return () => script.removeEventListener("load", render);
  }, []);

  return (
    <div ref={containerRef} className="not-prose my-10 max-w-full overflow-hidden">
      <blockquote className="twitter-tweet" data-dnt="true">
        <a href={url}>View the Tensorlake post on X</a>
      </blockquote>
    </div>
  );
}
