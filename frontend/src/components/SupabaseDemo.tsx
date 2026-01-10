import { useState, useEffect } from 'react';

const SupabaseDemo = () => {
  const [status, setStatus] = useState<string>('Connecting...');
  const [workflows, setWorkflows] = useState<any[]>([]);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/workflows');
        if (response.ok) {
          setStatus('Connected to Backend & Supabase ✅');
          const data = await response.json();
          setWorkflows(data);
          console.log("Workflows:", data);
        } else {
          setStatus('Connected to Backend, but Supabase error? ⚠️');
        }
      } catch (error) {
        setStatus('Connection Failed ❌');
        console.error(error);
      }
    };

    checkConnection();
  }, []);

  const sendTestEvent = async () => {
    try {
      let currentWorkflowId = crypto.randomUUID();

      // Use existing workflow if available to satisfy Foreign Key constraint
      if (workflows.length > 0) {
        currentWorkflowId = workflows[0].id;
        console.log("Using existing workflow ID:", currentWorkflowId);
      } else {
        console.warn("No workflows found. Insert might fail due to Foreign Key constraint if workflow doesn't exist.");
        // Optional: Create a workflow on the fly here, but for demo simplicity we'll rely on the one created by test_connection.py 
        // or just let it fail so user sees they need a workflow.
      }

      const testEvent = {
        events: [{
          run_id: crypto.randomUUID(),
          workflow_id: currentWorkflowId,
          event_type: "llm",
          model: "gpt-4-demo",
          prompt: { role: "user", content: "Demo prompt from frontend" },
          response: { role: "assistant", content: "Demo response" },
          tokens_in: 15,
          tokens_out: 25,
          cost: 0.005,
          created_at: new Date().toISOString()
        }]
      };

      const response = await fetch('http://127.0.0.1:8000/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testEvent)
      });

      if (response.ok) {
        alert('Event sent successfully!');
        // Refresh workflows or fetch events to show update? 
        // For now just alert.
      } else {
        alert('Failed to send event');
      }
    } catch (e) {
      alert('Error sending event');
      console.error(e);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginTop: '20px' }}>
      <h2>Backend Connection Status</h2>
      <p style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{status}</p>

      <button onClick={sendTestEvent} style={{ padding: '10px 20px', marginTop: '10px', cursor: 'pointer', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px' }}>
        Send Test Event to Supabase
      </button>

      {workflows.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Workflows (from DB)</h3>
          <pre style={{ textAlign: 'left', background: '#f0f0f0', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
            {JSON.stringify(workflows, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default SupabaseDemo;
