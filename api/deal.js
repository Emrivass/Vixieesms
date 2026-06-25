// Función serverless de Vercel:  /api/deal
//   GET  /api/deal?id=ID  -> datos del negocio en HubSpot + lectura IA
//   POST /api/deal        -> relay a Claude (el tool envía {system,user}; elige sub-áreas/recursos)
// Env vars en Vercel:  HUBSPOT_TOKEN (pat-...)  y  ANTHROPIC_API_KEY (sk-ant-...)
// Scopes de la app privada de HubSpot:  crm.objects.deals.read  +  crm.objects.owners.read
const PROPS = "motivacion_ulterior,contexto_personal,hubspot_owner_id,formulacion_global,nombre,dealname";

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization,content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  // ===== POST: relay a Claude =====
  if (req.method === "POST") {
    const aiKey = process.env.ANTHROPIC_API_KEY;
    if (!aiKey) { res.status(400).json({ error: "sin ANTHROPIC_API_KEY" }); return; }
    let body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = {}; } }
    body = body || {};
    const ar = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": aiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: body.max_tokens || 500, system: body.system || "", messages: [{ role: "user", content: body.user || "" }] }),
    });
    const aj = await ar.json();
    const text = (aj && aj.content && aj.content[0] && aj.content[0].text) || "";
    res.status(200).json({ text });
    return;
  }

  // ===== GET: negocio de HubSpot =====
  const m = String((req.query && req.query.id) || "").match(/\d{4,}/);
  const id = m ? m[0] : null;
  if (!id) { res.status(400).json({ error: "Falta el id del negocio" }); return; }

  const token = process.env.HUBSPOT_TOKEN;
  const auth = { headers: { Authorization: "Bearer " + token } };

  const hs = await fetch("https://api.hubapi.com/crm/v3/objects/deals/" + id + "?properties=" + PROPS, auth);
  const data = await hs.json();
  const p = (data.properties = data.properties || {});

  let nombre = (p.nombre || "").trim();
  if (!nombre && p.dealname) nombre = p.dealname.split(/\s+-\s+/)[0].trim();
  p.nombre = nombre;

  let form = (p.formulacion_global || "").trim();
  if (!form && p.dealname) form = (p.dealname.split(/\s+-\s+/)[1] || "").trim();
  p.formacion = form.replace(/^FP\s+/i, "").replace(/\s*\(.*$/, "").trim();

  try {
    if (p.hubspot_owner_id) {
      const o = await fetch("https://api.hubapi.com/crm/v3/owners/" + p.hubspot_owner_id, auth);
      if (o.ok) {
        const od = await o.json();
        const fn = (od.firstName || "").trim();
        const ln = (od.lastName || "").trim();
        p.owner_firstname = fn;
        p.owner_name = (fn + " " + ln).trim() || (od.email || "");
      }
    }
  } catch (_) {}

  // Lectura IA (motivo + pilares + reconocimiento)
  const aiKey = process.env.ANTHROPIC_API_KEY;
  if (aiKey && (p.motivacion_ulterior || p.contexto_personal)) {
    try {
      const sys = "Eres analista comercial de FP (Explora FP x Ucademy). Clasificas al lead y devuelves SOLO un JSON valido, sin texto extra.";
      const user =
        "MOTIVACION ULTERIOR: " + (p.motivacion_ulterior || "-") +
        "\nCONTEXTO PERSONAL: " + (p.contexto_personal || "-") +
        "\nFORMACION: " + (p.formacion || "-") +
        '\n\nDevuelve JSON: {"motivo":"seguridad|ego|social","pilares":["insercion","costes","autonomia"],"reconocimiento":"1 frase calida y natural, en 2a persona, que reconozca su situacion concreta para abrir un WhatsApp (SIN saludo ni nombre, SIN emoji)","resumen":"nota breve para el comercial"}' +
        "\nReglas. motivo: seguridad=estabilidad/miedo/salir adelante/familia; ego=demostrar/ascender/no estancarse/salario; social=pertenencia/vocacion/ayudar/no estar solo." +
        " pilares (1-3): insercion=salidas/empleo/practicas; costes=precio/becas/financiacion; autonomia=tiempo/online/conciliar/ritmo.";
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": aiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 400, system: sys, messages: [{ role: "user", content: user }] }),
      });
      const j = await r.json();
      const txt = (j && j.content && j.content[0] && j.content[0].text) || "";
      const mm = txt.match(/\{[\s\S]*\}/);
      if (mm) data.lectura = JSON.parse(mm[0]);
    } catch (_) {}
  }

  res.status(hs.status).json(data);
};
