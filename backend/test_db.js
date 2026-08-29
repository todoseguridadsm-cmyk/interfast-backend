const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.rtxgtlwffewlmqhdedzv:TkipSeguridad2026@aws-1-us-west-2.pooler.supabase.com:6543/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(() => client.query('SELECT name, nodes FROM workflow_entity'))
  .then(res => {
    res.rows.forEach(w => {
      const webhooks = w.nodes.filter(n => n.type === 'n8n-nodes-base.webhook');
      if (webhooks.length > 0) {
        console.log(`\nWorkflow: ${w.name}`);
        console.log(JSON.stringify(webhooks.map(wh => ({
          name: wh.name,
          path: wh.parameters.path,
          method: wh.parameters.httpMethod
        })), null, 2));
      }
    });
    client.end();
  })
  .catch(console.error);
