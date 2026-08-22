const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://imomuyjjbxrtibbsgsba.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb211eWpqYnhydGliYnNnc2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczODIwOTksImV4cCI6MjEwMjk1ODA5OX0.TktJUC6B0sdwybZ7JE96AkCyg5DLTNv_BnarNY_CUZk'
);

async function cleanSearches() {
  const { data, error } = await supabase
    .from('searches')
    .delete()
    .or('medicine_name.ilike.%distributor%,medicine_name.ilike.%hi i am%,medicine_name.ilike.%square root%');
  console.log('Cleaned bogus search rows:', error || 'SUCCESS');
}

cleanSearches();
