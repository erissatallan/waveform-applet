// import { createClient } from '@supabase/supabase-js';

// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_ANON_KEY
// );

// export default async function handler(req, res) {
//   if (req.method === 'GET') {
//     const { data, error } = await supabase
//       .from('game_stats')
//       .select('wins, losses, total')
//       .single();
//     if (error) return res.status(500).json({ error: error.message });
//     return res.status(200).json(data);
//   }

//   if (req.method === 'POST') {
//     const { wins, losses, total } = req.body;
//     const { data, error } = await supabase
//       .from('game_stats')
//       .update({ wins, losses, total, updated_at: new Date() })
//       .eq('id', 1);
//     if (error) return res.status(500).json({ error: error.message });
//     return res.status(200).json(data);
//   }

//   res.setHeader('Allow', ['GET', 'POST']);
//   res.status(405).end(`Method ${req.method} Not Allowed`);
// }


// src/app/api/stats/route.js
import { createClient } from '@supabase/supabase-js';

// initialize Supabase client from env vars
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// GET /api/stats
export async function GET() {
  // Try to read the single stats row
  let { data, error } = await supabase
    .from('game_stats')
    .select('wins, losses, total')
    .single();

  // If no row exists, insert a default one
  if (error && error.code === 'PGRST116') {
    const insert = await supabase
      .from('game_stats')
      .insert({ id: 1, wins: 0, losses: 0, total: 0 })
      .single();
    data = insert.data;
  } else if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), { status: 200 });
}

// POST /api/stats
export async function POST(request) {
  const { wins, losses, total } = await request.json();

  // Upsert: insert if missing, update if exists
  const { data, error } = await supabase
    .from('game_stats')
    .upsert(
      { id: 1, wins, losses, total },
      { onConflict: ['id'] }
    )
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), { status: 200 });
}
