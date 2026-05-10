export default function StepItem({ title, step, current }: any) {
  const active = current === step;
  const completed = current > step;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "15px", padding: "15px", borderRadius: "12px", background: active ? "rgba(124, 58, 237, 0.15)" : "transparent", border: active ? "1px solid rgba(124, 58, 237, 0.5)" : "1px solid transparent", transition: "all 0.3s", opacity: active || completed ? 1 : 0.5, marginBottom: "10px" }}>
      <div style={{ width: "35px", height: "35px", borderRadius: "50%", background: active || completed ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "white", boxShadow: active ? "0 0 15px rgba(124, 58, 237, 0.5)" : "none" }}>
        {completed ? "✓" : step}
      </div>
      <p style={{ fontWeight: active ? "bold" : "normal", color: active || completed ? "white" : "#9ca3af", margin: 0, fontSize: "16px" }}>{title}</p>
    </div>
  );
}