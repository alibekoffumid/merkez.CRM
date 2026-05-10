const { createClient } = require('@supabase/supabase-js');

async function run() {
  const databases = [
    {
      name: 'PROD',
      url: 'https://rvywrxnmgwwudihgrxdp.supabase.co',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2eXdyeG5tZ3d3dWRpaGdyeGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjIzNjYsImV4cCI6MjA5MDgzODM2Nn0.iD3osORy7nR5wlhjuyiXKiGt-6s7VGpmbeim_GHw2wI'
    },
    {
      name: 'DEV',
      url: 'https://zymtxrfxnkorrubxfyvv.supabase.co',
      key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bXR4cmZ4bmtvcnJ1YnhmeXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNjAzMjQsImV4cCI6MjA5MzkzNjMyNH0.eFjYaE2YyW7clLo4qhJ1OFybNT-7XdNdpd4jpXNnoOE'
    }
  ];

  for (const db of databases) {
    const supabase = createClient(db.url, db.key);
    
    // Try using rpc to execute SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      query: "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_pin TEXT DEFAULT '0000'"
    });

    if (error) {
      console.log(`${db.name}: RPC failed (${error.message}), trying direct approach...`);
      
      // Fallback: try to update a profile with admin_pin to see if column exists
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('admin_pin')
        .limit(1);
      
      if (testError) {
        console.log(`${db.name}: Column does NOT exist. Please run this SQL in Supabase Dashboard:`);
        console.log(`  ALTER TABLE profiles ADD COLUMN admin_pin TEXT DEFAULT '0000';`);
      } else {
        console.log(`${db.name}: Column already exists!`);
      }
    } else {
      console.log(`${db.name}: Column added successfully!`);
    }
  }
}

run();
