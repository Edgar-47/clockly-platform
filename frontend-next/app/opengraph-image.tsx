import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ClockLy, control horario y gestión de empleados para pymes";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(135deg, #07111f 0%, #0b2a47 55%, #0a84ff 100%)",
          color: "white",
          display: "flex",
          fontFamily: "Inter, Arial, sans-serif",
          height: "100%",
          justifyContent: "space-between",
          padding: "72px",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: 0 }}>
            ClockLy
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 74,
              fontWeight: 850,
              letterSpacing: 0,
              lineHeight: 0.98,
              marginTop: 42,
            }}
          >
            Control horario para pymes
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.78)",
              display: "flex",
              fontSize: 28,
              lineHeight: 1.35,
              marginTop: 30,
            }}
          >
            Fichajes, empleados, retrasos y exportaciones en una plataforma sencilla.
          </div>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 26,
            display: "flex",
            flexDirection: "column",
            padding: 18,
            width: 360,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 18,
              color: "#07111f",
              display: "flex",
              flexDirection: "column",
              padding: 26,
            }}
          >
            <div style={{ color: "#64748b", display: "flex", fontSize: 22, fontWeight: 700 }}>
              Dashboard
            </div>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 850, marginTop: 12 }}>
              3 activos
            </div>
            {["Entrada 09:03", "Entrada 09:11", "Salida 14:02"].map((item) => (
              <div
                key={item}
                style={{
                  alignItems: "center",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  fontSize: 24,
                  fontWeight: 700,
                  justifyContent: "space-between",
                  marginTop: 18,
                  paddingTop: 18,
                }}
              >
                <span>{item}</span>
                <span style={{ color: "#0a84ff" }}>PIN</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
