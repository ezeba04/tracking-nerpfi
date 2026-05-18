"use client";
import { useState, useEffect } from "react";

interface SyncLog {
  id: number; platform: string; status: string; message: string; startedAt: string; endedAt: string | null; newItems: number;
}

export default function SettingsPage() {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [message, setMessage] = useState<string>("");

  const fetchLogs = () => {
    fetch("/api/sync").then((r) => r.json()).then((d) => {
      setLogs(d.logs || []);
      if (d.isRunning) setSyncing("running");
    }).catch(() => {});
  };

  useEffect(() => { fetchLogs(); }, []);

  const triggerSync = async (platform: string) => {
    setSyncing(platform);
    setMessage(`Sincronizando ${platform}...`);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setMessage(`❌ El servidor tardó demasiado (timeout). Usá sync individual o ejecutalo localmente.`);
        return;
      }
      if (res.ok) {
        setMessage(`✅ Sincronización completada: ${JSON.stringify(data.result)}`);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        setMessage(`❌ Timeout: el sync tardó demasiado. Probá sincronizar cada plataforma por separado.`);
      } else {
        setMessage(`❌ Error de red: ${msg}`);
      }
    } finally {
      setSyncing(null);
      fetchLogs();
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>⚙️ Configuración</h1>
        <p>Sincronización manual y estado del sistema</p>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🔄 Sincronización</h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20 }}>
          La sincronización es <strong>incremental</strong>: solo descarga datos nuevos que no tengamos.
          En producción, usá los botones individuales para evitar timeouts. El sync completo puede tardar varios minutos.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <button className="btn btn-primary" disabled={!!syncing} onClick={() => triggerSync("all")}>
            {syncing === "all" ? "⏳ Sincronizando todo..." : "🔄 Sync completo"}
          </button>
          <button className="btn btn-secondary" disabled={!!syncing} onClick={() => triggerSync("codeforces")}>
            {syncing === "codeforces" ? "⏳..." : "🏆 Solo Codeforces (metadata)"}
          </button>
          <button className="btn btn-secondary" disabled={!!syncing} onClick={() => triggerSync("codeforces-code")}>
            {syncing === "codeforces-code" ? "⏳..." : "📝 Solo código CF"}
          </button>
          <button className="btn btn-secondary" disabled={!!syncing} onClick={() => triggerSync("cses")}>
            {syncing === "cses" ? "⏳..." : "📘 Solo CSES"}
          </button>
        </div>

        {message && (
          <div className="sync-status">
            <span style={{ fontSize: 14 }}>{message}</span>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📋 Historial de Syncs</h2>
        {logs.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No hay syncs registrados todavía.</p>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Plataforma</th><th>Estado</th><th>Mensaje</th><th>Nuevos</th><th>Fecha</th></tr></thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.platform}</td>
                    <td>
                      <span className={`badge ${log.status === "completed" ? "badge-accepted" : log.status === "error" ? "badge-wrong" : "badge-other"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis" }}>{log.message}</td>
                    <td>{log.newItems}</td>
                    <td style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      {new Date(log.startedAt).toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>ℹ️ Cómo funciona</h2>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8 }}>
          <p><strong>Codeforces metadata</strong> (rápido): Usa la API pública para traer contests, problemas y submissions. No necesita login.</p>
          <p><strong>Codeforces código</strong> (lento): Scrapea el código fuente del sitio. Necesita login (CF_USERNAME/CF_PASSWORD en .env). ~3 segundos por submission.</p>
          <p><strong>CSES</strong> (lento): Scrapea todo del sitio. Necesita login por cada miembro. ~2 segundos por submission.</p>
          <p style={{ marginTop: 12 }}>La sincronización es <strong>incremental</strong>: solo descarga lo que no tenemos. El cron diario sincroniza Codeforces metadata automáticamente.</p>
        </div>
      </div>
    </>
  );
}
