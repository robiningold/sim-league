import { supabase, BOARD_ID } from "./supabase";

const toEl = (r) => ({
  id: r.id, x: r.x, y: r.y, w: r.w, h: r.h,
  title: r.title || "", text: r.body || "",
  bullets: Array.isArray(r.bullets) ? r.bullets : [],
  images: Array.isArray(r.images) ? r.images : [],
  color: r.color || "gold", groupId: r.group_id || null,
});

const fromEl = (e) => ({
  id: e.id, board_id: BOARD_ID, x: e.x, y: e.y, w: e.w, h: e.h,
  title: e.title || "", body: e.text || "",
  bullets: e.bullets || [], images: e.images || [],
  color: e.color, group_id: e.groupId, updated_at: new Date().toISOString(),
});

const TABLES = ["board_elements", "board_links", "board_groups"];

export async function fetchBoard() {
  const [e, l, g] = await Promise.all([
    supabase.from("board_elements").select("*").eq("board_id", BOARD_ID).order("created_at"),
    supabase.from("board_links").select("*").eq("board_id", BOARD_ID).order("created_at"),
    supabase.from("board_groups").select("*").eq("board_id", BOARD_ID).order("created_at"),
  ]);
  const err = e.error || l.error || g.error;
  if (err) throw err;
  return {
    elements: e.data.map(toEl),
    links: l.data.map((r) => ({ id: r.id, from: r.from_id, to: r.to_id })),
    groups: g.data.map((r) => ({ id: r.id, label: r.label })),
  };
}

/** Nur die tatsächlich veränderten Zeilen schreiben, verschwundene löschen. */
async function syncTable(table, prev, next, toRow) {
  const before = new Map(prev.map((x) => [x.id, JSON.stringify(x)]));
  const changed = next.filter((x) => before.get(x.id) !== JSON.stringify(x));
  const gone = prev.filter((x) => !next.some((y) => y.id === x.id)).map((x) => x.id);

  if (changed.length) {
    const { error } = await supabase.from(table).upsert(changed.map(toRow));
    if (error) throw error;
  }
  if (gone.length) {
    const { error } = await supabase.from(table).delete().in("id", gone);
    if (error) throw error;
  }
}

export async function pushBoard(prev, next) {
  await syncTable("board_elements", prev.elements, next.elements, fromEl);
  await syncTable("board_groups", prev.groups, next.groups, (g) => ({
    id: g.id, board_id: BOARD_ID, label: g.label, updated_at: new Date().toISOString(),
  }));
  // Verbindungen zuletzt: sie zeigen auf Elemente, die es erst geben muss.
  await syncTable("board_links", prev.links, next.links, (l) => ({
    id: l.id, board_id: BOARD_ID, from_id: l.from, to_id: l.to, updated_at: new Date().toISOString(),
  }));
}

export function subscribeBoard(onChange) {
  const channel = supabase.channel("idea-board");
  for (const table of TABLES) {
    channel.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
  }
  channel.subscribe();
  return () => supabase.removeChannel(channel);
}

/** Bild in den Storage legen und die öffentliche URL zurückgeben. */
export async function uploadImage(dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${BOARD_ID}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from("board-images")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return supabase.storage.from("board-images").getPublicUrl(path).data.publicUrl;
}
