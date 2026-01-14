import { useState, useEffect } from 'react';

const SupabaseDemo = () => {
  const [status, setStatus] = useState<string>('Connecting...');
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({});
  const [analysisResults, setAnalysisResults] = useState<Record<string, any>>({});

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
      };

      const response = await fetch('http://127.0.0.1:8000/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testEvent)
      });

      if (response.ok) {
        alert('Event sent successfully!');
      } else {
        const errData = await response.json();
        let errMsg = errData.detail;
        if (typeof errMsg === 'object') {
          errMsg = JSON.stringify(errMsg, null, 2);
        }
        alert(`Failed to send event: ${errMsg}`);
        console.error("Backend Error:", errMsg);
      }
    } catch (e) {
      alert('Error sending event');
      console.error(e);
    }
  };

  const analyzeWorkflow = async (workflowId: string) => {
    setAnalyzing(prev => ({ ...prev, [workflowId]: true }));
    try {
      const response = await fetch(`http://127.0.0.1:8000/workflows/${workflowId}/analyze`, {
        method: 'POST',
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Analysis failed');
      }

      const result = await response.json();
      setAnalysisResults(prev => ({ ...prev, [workflowId]: result }));
    } catch (error) {
      console.error("Analysis Error:", error);
      alert(`Analysis failed: ${error}`);
    } finally {
      setAnalyzing(prev => ({ ...prev, [workflowId]: false }));
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
          <pre style={{ textAlign: 'left', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
            {workflows.map((wf) => (
              <div key={wf.id} style={{ marginBottom: '20px', padding: '10px', borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{wf.name || 'Untitled Workflow'}</strong> <small>({wf.id})</small>
                  <button
                    onClick={() => analyzeWorkflow(wf.id)}
                    disabled={analyzing[wf.id]}
                    style={{
                      marginLeft: '10px',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      opacity: analyzing[wf.id] ? 0.7 : 1
                    }}
                  >
                    {analyzing[wf.id] ? 'Analyzing...' : 'Analyze Gemini'}
                  </button>
                </div>

                {analysisResults[wf.id] && (
                  <div style={{ marginTop: '10px', padding: '10px', borderRadius: '6px', fontSize: '0.9em' }}>
                    <h4 style={{ margin: '5px 0' }}>Gemini Analysis Result</h4>
                    <p><strong>Original Cost:</strong> ${analysisResults[wf.id].original_cost?.toFixed(4)}</p>
                    <p><strong>Optimized Cost:</strong> ${analysisResults[wf.id].optimized_cost?.toFixed(4)}</p>

                    {analysisResults[wf.id].redundancies?.items?.length > 0 && (
                      <div>
                        <strong>Redundancies:</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                          {analysisResults[wf.id].redundancies.items.map((r: string, i: number) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                    {analysisResults[wf.id].prompt_bloat?.items?.length > 0 && (
                      <div>
                        <strong>Prompt Bloat:</strong>
                        <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                          {analysisResults[wf.id].prompt_bloat.items.map((r: string, i: number) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Raw Dump for Debugging */}
            <details>
              <summary>Raw Data Dump</summary>
              <pre>{JSON.stringify(workflows, null, 2)}</pre>
            </details>
          </pre>
        </div>
      )}
    </div>
  );
};

export default SupabaseDemo;
