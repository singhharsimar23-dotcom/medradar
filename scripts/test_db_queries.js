const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://imomuyjjbxrtibbsgsba.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb211eWpqYnhydGliYnNnc2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczODIwOTksImV4cCI6MjEwMjk1ODA5OX0.TktJUC6B0sdwybZ7JE96AkCyg5DLTNv_BnarNY_CUZk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('Testing Supabase Queries with anon key...');

  const { data: pharms, count: phCount, error: phErr } = await supabase.from('pharmacies').select('*', { count: 'exact' });
  console.log('Pharmacies:', phCount, phErr ? `Error: ${phErr.message}` : '');

  const { data: stock, count: stCount, error: stErr } = await supabase.from('stock').select('*', { count: 'exact' });
  console.log('Stock count:', stCount, stErr ? `Error: ${stErr.message}` : '');

  const { data: searches, count: srCount, error: srErr } = await supabase.from('searches').select('*', { count: 'exact' });
  console.log('Searches count:', srCount, srErr ? `Error: ${srErr.message}` : '');
  if (searches && searches.length > 0) {
    console.log('Latest search created_at:', searches[0].created_at);
  }

  const { data: insight, error: inErr } = await supabase.from('insight_cache').select('*');
  console.log('Insight Cache:', insight, inErr ? `Error: ${inErr.message}` : '');
}

main();
