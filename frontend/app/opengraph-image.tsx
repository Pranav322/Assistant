import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0b1220 100%)",
        color: "#f8fafc",
        padding: "72px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 62,
            height: 62,
            borderRadius: 14,
            background: "#22c55e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 30,
            fontWeight: 700,
            color: "#03120a",
          }}
        >
          C
        </div>
        <div style={{ fontSize: 44, fontWeight: 700 }}>Contextly</div>
      </div>

      <div
        style={{ marginTop: 36, fontSize: 62, lineHeight: 1.08, fontWeight: 700, maxWidth: 980 }}
      >
        Enterprise RAG chatbots for modern products
      </div>

      <div style={{ marginTop: 28, fontSize: 30, color: "#cbd5e1", maxWidth: 980 }}>
        Ingest content, embed your assistant, and monitor usage from one platform.
      </div>
    </div>,
    size
  );
}
