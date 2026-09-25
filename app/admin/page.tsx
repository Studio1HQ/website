import Script from "next/script";

export const metadata = {
  title: "Studio1 CMS",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <>
      <Script id="decap-base-path" strategy="beforeInteractive">
        {`document.head.insertAdjacentHTML("afterbegin", '<base href="/admin/">');`}
      </Script>
      <Script
        src="https://identity.netlify.com/v1/netlify-identity-widget.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://unpkg.com/decap-cms@^3.8.0/dist/decap-cms.js"
        strategy="afterInteractive"
      />
    </>
  );
}
