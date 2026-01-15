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
                  <div style={{ marginTop: '15px', padding: '20px', borderRadius: '8px', fontSize: '1em', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1em', color: '#1e293b' }}>✨ Analysis Results</h4>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          fontSize: '1.2em',
                          fontWeight: 'bold',
                          backgroundColor: analysisResults[wf.id].efficiency_grade === 'A' ? '#dcfce7' : (analysisResults[wf.id].efficiency_grade === 'F' ? '#fee2e2' : '#ffedd5'),
                          color: analysisResults[wf.id].efficiency_grade === 'A' ? '#166534' : (analysisResults[wf.id].efficiency_grade === 'F' ? '#991b1b' : '#9a3412'),
                        }}>
                          Score: {analysisResults[wf.id].efficiency_score} / 100 ({analysisResults[wf.id].efficiency_grade})
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '6px' }}>
                      <div>
                        <div style={{ fontSize: '0.85em', color: '#64748b', marginBottom: '4px' }}>Original Cost</div>
                        <div style={{ fontSize: '1.1em', fontWeight: '600', color: '#334155' }}>${analysisResults[wf.id].original_cost?.toFixed(4) || '0.0000'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85em', color: '#64748b', marginBottom: '4px' }}>Optimized Cost</div>
                        <div style={{ fontSize: '1.1em', fontWeight: '600', color: '#334155' }}>${analysisResults[wf.id].optimized_cost?.toFixed(4) || '0.0000'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85em', color: '#64748b', marginBottom: '4px' }}>Potential Savings</div>
                        <div style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#16a34a' }}>
                          ${((analysisResults[wf.id].original_cost || 0) - (analysisResults[wf.id].optimized_cost || 0)).toFixed(4)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {analysisResults[wf.id].redundancies?.items?.length > 0 && (
                        <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid #fecaca', backgroundColor: '#fef2f2' }}>
                          <strong style={{ display: 'block', color: '#991b1b', marginBottom: '8px' }}>🚫 Redundancies ({analysisResults[wf.id].redundancies.items.length})</strong>
                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#7f1d1d' }}>
                            {analysisResults[wf.id].redundancies.items.map((r: any, i: number) => (
                              <li key={i} style={{ marginBottom: '4px' }}>{r.reason || JSON.stringify(r)}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysisResults[wf.id].model_overkill?.items?.length > 0 && (
                        <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid #fed7aa', backgroundColor: '#fff7ed' }}>
                          <strong style={{ display: 'block', color: '#9a3412', marginBottom: '8px' }}>⚡️ Model Overkill ({analysisResults[wf.id].model_overkill.items.length})</strong>
                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#7c2d12' }}>
                            {analysisResults[wf.id].model_overkill.items.map((r: any, i: number) => (
                              <li key={i} style={{ marginBottom: '4px' }}>{r.reason || JSON.stringify(r)}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {analysisResults[wf.id].prompt_bloat?.items?.length > 0 && (
                        <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff' }}>
                          <strong style={{ display: 'block', color: '#1e40af', marginBottom: '8px' }}>🐡 Prompt Bloat ({analysisResults[wf.id].prompt_bloat.items.length})</strong>
                          <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e3a8a' }}>
                            {analysisResults[wf.id].prompt_bloat.items.map((r: any, i: number) => (
                              <li key={i} style={{ marginBottom: '4px' }}>{r.unnecessary_content ? r.unnecessary_content.substring(0, 100) + '...' : JSON.stringify(r)}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <details style={{ marginTop: '15px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                      <summary style={{ cursor: 'pointer', color: '#94a3b8', fontSize: '0.9em' }}>View Full raw JSON</summary>
                      <pre style={{ fontSize: '0.8em', overflow: 'auto', maxHeight: '200px', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '4px', marginTop: '5px', color: '#334155' }}>
                        {JSON.stringify(analysisResults[wf.id], null, 2)}
                      </pre>
                    </details>
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
