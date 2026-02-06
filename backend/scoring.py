"""
Scoring algorithm for AgentScore - Cost-Based Efficiency.

Formula: Efficiency Score = (Optimized Cost / Total Cost) * 100
Where Optimized Cost = Total Cost - Total Waste

Total Waste = Redundancy Waste + Model Overkill Waste + Prompt Bloat Waste
"""

from typing import Dict, Any, List, Optional
from pricing import calculate_cost, MODEL_PRICING, normalize_model_name


# Severity weights - HIGH issues count more than LOW issues
SEVERITY_WEIGHTS = {
    "HIGH": 1.0,
    "MEDIUM": 0.6,
    "LOW": 0.3
}

# Base penalties per issue type (applied with severity weight)
BASE_PENALTIES = {
    "redundancy": 15,
    "model_overkill": 10,
    "prompt_bloat": 5  # per 1000 wasted tokens
}


def get_severity_weight(finding: Dict) -> float:
    """Get the severity weight for a finding, defaulting to MEDIUM if not specified."""
    severity = finding.get("severity", "MEDIUM").upper()
    return SEVERITY_WEIGHTS.get(severity, 0.6)



def calculate_redundancy_score(redundancies: List[Dict], total_calls: int) -> int:
    """
    Calculate redundancy score (0-100) weighted by severity.
    
    HIGH severity duplicates count fully, LOW severity count less.
    Formula: 100 × (1 - weighted_redundant_calls / total_calls)
    """
    if total_calls == 0:
        return 100
    
    weighted_redundant_count = 0.0
    for finding in redundancies:
        call_ids = finding.get("call_ids", [])
        weight = get_severity_weight(finding)
        
        # All calls in the group are redundant except one (the one we keep)
        if len(call_ids) > 1:
            redundant_in_group = len(call_ids) - 1
            weighted_redundant_count += redundant_in_group * weight
    
    score = 100 * (1 - weighted_redundant_count / total_calls)
    return int(max(0, min(100, score)))


def calculate_model_fit_score(overkill_items: List[Dict], total_calls: int) -> int:
    """
    Calculate model fit score (0-100) weighted by severity.
    
    HIGH severity overkill (GPT-4 for classification) counts more than
    LOW severity (borderline cases).
    """
    if total_calls == 0:
        return 100
    
    weighted_overkill_count = 0.0
    for finding in overkill_items:
        weight = get_severity_weight(finding)
        weighted_overkill_count += weight
    
    score = 100 * (1 - weighted_overkill_count / total_calls)
    return int(max(0, min(100, score)))


def calculate_context_efficiency_score(bloat_items: List[Dict], events: List[Dict]) -> int:
    """
    Calculate context efficiency score (0-100) based on ratio of necessary to actual tokens.
    
    Weighted by severity - HIGH severity bloat (>75% waste) impacts more.
    """
    if not events:
        return 100
    
    total_actual_tokens = sum(e.get("tokens_in", 0) for e in events)
    
    if total_actual_tokens == 0:
        return 100
    
    # Calculate weighted waste
    total_weighted_waste = 0.0
    
    for item in bloat_items:
        current = item.get("current_tokens", 0)
        necessary = item.get("estimated_necessary_tokens", 0)
        weight = get_severity_weight(item)
        
        if necessary > 0 and current > necessary:
            waste = current - necessary
            total_weighted_waste += waste * weight
        elif item.get("waste_percentage"):
            # Use waste_percentage if provided
            waste = current * (item.get("waste_percentage", 0) / 100)
            total_weighted_waste += waste * weight
    
    # Score based on weighted efficiency
    effective_waste = min(total_weighted_waste, total_actual_tokens)
    score = 100 * (1 - effective_waste / total_actual_tokens)
    return int(max(0, min(100, score)))


def calculate_optimized_context_efficiency(current_efficiency: int, bloat_items: List[Dict]) -> int:
    """
    Estimate optimized context efficiency after removing bloat.
    """
    if not bloat_items:
        return current_efficiency
    
    # Assume we can remove most of the bloat (80% improvement toward 100)
    improvement_potential = 100 - current_efficiency
    optimized = current_efficiency + int(improvement_potential * 0.8)
    
    return min(100, optimized)


def match_call_id_to_event(call_id: str, events: List[Dict]) -> Optional[Dict]:
    """
    Match Gemini's call_id (e.g., "call_1") to actual event.
    Extracts the number and uses it as 1-based index into events list.
    """
    import re
    match = re.search(r'(\d+)', call_id)
    if match:
        index = int(match.group(1)) - 1  # Convert to 0-based index
        if 0 <= index < len(events):
            return events[index]
    
    # Fallback: try exact UUID match
    for event in events:
        if call_id == str(event.get("run_id", "")):
            return event
    return None

def filter_findings(findings: list, min_confidence: float = 0.7) -> list:
    """Filter out findings below the confidence threshold."""
    return [f for f in findings if f.get("confidence", 0) >= min_confidence]

def calculate_efficiency_score(analysis_results: dict, events: List[Dict]) -> dict:
    """
    Calculates cost-based efficiency score.
    """
    if not events:
        return {
            "score": 100,
            "grade": "A",
            "breakdown": {"redundancy_waste": 0, "overkill_waste": 0, "bloat_waste": 0},
            "sub_scores": {"redundancy": 100, "model_fit": 100, "context_efficiency": 100},
            "optimized_sub_scores": {"redundancy": 100, "model_fit": 100, "context_efficiency": 100},
            "optimized_score": 100,
            "savings_breakdown": {"total_savings": 0},
            "severity_counts": {"HIGH": 0, "MEDIUM": 0, "LOW": 0},
            "top_issues": []
        }

    # 1. Calculate Total Real Cost
    total_cost = sum(float(e.get("cost", 0)) for e in events)
    if total_cost == 0:
        total_cost = 0.000001  # Prevent division by zero

    # 2. Extract Findings
    redundancies = analysis_results.get("redundancies") or analysis_results.get("redundant_calls") or []
    if isinstance(redundancies, dict):
        redundancies = redundancies.get("items", [])
    redundancies = filter_findings(redundancies)
    
    for finding in redundancies:
        call_ids = finding.get("call_ids", [])
        confidence = finding.get("confidence", 0.8)
        
        # Calculate group savings for injection
        group_savings = 0.0
        
        # Sum costs of all redundant calls except the first one
        for i, call_id in enumerate(call_ids):
            if i > 0:  # Skip the first call (the one we keep)
                event = match_call_id_to_event(call_id, events)
                if event:
                    cost = event.get("cost", 0)
                    # Weight by confidence for total metric
                    redundancy_savings += cost * confidence
                    # Track unweighted for specific finding display
                    group_savings += cost
        
        # Inject savings into the finding item for frontend display
        finding["savings"] = f"${group_savings:.2f}"
    
    # 2. Model fit savings: difference between current and recommended model costs
    overkill = analysis_results.get("model_overkill") or []
    if isinstance(overkill, dict):
        overkill = overkill.get("items", [])
    overkill = filter_findings(overkill)
    
    for finding in overkill:
        current_model = finding.get("current_model", "")
        recommended_model = finding.get("recommended_model", "")
        confidence = finding.get("confidence", 0.8)
        
        if current_model and recommended_model:
            call_id = finding.get("call_id", "")
            event = match_call_id_to_event(call_id, events)
            
            if event:
                tokens_in = event.get("tokens_in", 0)
                tokens_out = event.get("tokens_out", 0)
                
                # Use the event's actual model string (which might have -demo suffix)
                # This ensures we trigger the cost multiplier if applicable.
                real_current_model = event.get("model", "") or current_model
                
                # Calculate cost difference
                current_cost = calculate_cost(real_current_model, tokens_in, tokens_out)
                recommended_cost = calculate_cost(recommended_model, tokens_in, tokens_out)
                savings = max(0, current_cost - recommended_cost)
                
                # Weight by confidence for total
                model_fit_savings += savings * confidence
                
                # Inject savings into the finding item for frontend display
                finding["savings"] = f"${savings:.2f}"
    
    # 3. Context efficiency savings: cost of unnecessary tokens
    bloat_items = analysis_results.get("prompt_bloat") or []
    if isinstance(bloat_items, dict):
        bloat_items = bloat_items.get("items", [])
    bloat_items = filter_findings(bloat_items)
    # Rename for consistency with HEAD logic
    bloat = bloat_items
    
    for item in bloat_items:
        call_id = item.get("call_id", "")
        current_tokens = item.get("current_tokens", 0)
        necessary_tokens = item.get("estimated_necessary_tokens", 0)
        confidence = item.get("confidence", 0.8)
        
        if current_tokens > necessary_tokens:
            event = match_call_id_to_event(call_id, events)
            
            if event:
                model = event.get("model", "")
                if model:
                    wasted_tokens = current_tokens - necessary_tokens
                    # Use central pricing logic (handles -demo multiplier automatically)
                    savings = calculate_cost(model, wasted_tokens, 0)
                    
                    # Weight by confidence for total
                    context_efficiency_savings += savings * confidence
                    
                    # Inject savings into the finding item
                    item["savings"] = f"${savings:.4f}"

    
    # 2. Model fit savings: difference between current and recommended model costs
    overkill = analysis_results.get("model_overkill") or []
    if isinstance(overkill, dict):
        overkill = overkill.get("items", [])
    
    for finding in overkill:
        current_model = finding.get("current_model", "")
        recommended_model = finding.get("recommended_model", "")
        confidence = finding.get("confidence", 0.8)
        
        if current_model and recommended_model:
            call_id = finding.get("call_id", "")
            event = match_call_id_to_event(call_id, events)
            
            if event:
                tokens_in = event.get("tokens_in", 0)
                tokens_out = event.get("tokens_out", 0)
                
                # Use the event's actual model string (which might have -demo suffix)
                # This ensures we trigger the cost multiplier if applicable.
                real_current_model = event.get("model", "") or current_model
                
                # Calculate cost difference
                current_cost = calculate_cost(real_current_model, tokens_in, tokens_out)
                recommended_cost = calculate_cost(recommended_model, tokens_in, tokens_out)
                savings = max(0, current_cost - recommended_cost)
                
                # Weight by confidence for total
                model_fit_savings += savings * confidence
                
                # Inject savings into the finding item for frontend display
                finding["savings"] = f"${savings:.2f}"
    
    # 3. Context efficiency savings: cost of unnecessary tokens
    bloat_items = analysis_results.get("prompt_bloat") or []
    if isinstance(bloat_items, dict):
        bloat_items = bloat_items.get("items", [])
    
    for item in bloat_items:
        call_id = item.get("call_id", "")
        current_tokens = item.get("current_tokens", 0)
        necessary_tokens = item.get("estimated_necessary_tokens", 0)
        confidence = item.get("confidence", 0.8)
        
        if current_tokens > necessary_tokens:
            event = match_call_id_to_event(call_id, events)
            
            if event:
                model = event.get("model", "")
                if model:
                    wasted_tokens = current_tokens - necessary_tokens
                    # Use central pricing logic (handles -demo multiplier automatically)
                    savings = calculate_cost(model, wasted_tokens, 0)
                    
                    # Weight by confidence for total
                    context_efficiency_savings += savings * confidence
                    
                    # Inject savings into the finding item
                    item["savings"] = f"${savings:.4f}"
    
    return {
        "redundancy_savings": round(redundancy_savings, 6),
        "model_fit_savings": round(model_fit_savings, 6),
        "context_efficiency_savings": round(context_efficiency_savings, 6),
        "total_savings": round(redundancy_savings + model_fit_savings + context_efficiency_savings, 6)
    }


def extract_severity_counts(analysis_results: Dict) -> Dict[str, int]:
    """
    Count findings by severity level across all categories.
    """
    counts = {"HIGH": 0, "MEDIUM": 0, "LOW": 0}
    
    # Check if Gemini provided summary counts
    summary = analysis_results.get("analysis_summary", {})
    if summary.get("severity_counts"):
        return summary["severity_counts"]
    
    # Otherwise, count manually
    all_findings = []
    
    redundancies = analysis_results.get("redundancies") or analysis_results.get("redundant_calls") or []
    if isinstance(redundancies, dict):
        redundancies = redundancies.get("items", [])
    all_findings.extend(redundancies)
=======
    if isinstance(redundancies, dict): redundancies = redundancies.get("items", [])
    redundancies = filter_findings(redundancies)
>>>>>>> 798353a (WIF)
    
    overkill = analysis_results.get("model_overkill") or []
    if isinstance(overkill, dict): overkill = overkill.get("items", [])
    overkill = filter_findings(overkill)
    
    bloat = analysis_results.get("prompt_bloat") or []
    if isinstance(bloat, dict): bloat = bloat.get("items", [])
    bloat = filter_findings(bloat)

    # 3. Calculate Waste
    redundancy_waste = 0.0
    overkill_waste = 0.0
    bloat_waste = 0.0

    # Redundancy Waste = Cost of duplicate calls
    for finding in redundancies:
        # Prefer explicit "duplicate_call_ids", fallback to all but one in "call_ids"
        duplicates = finding.get("duplicate_call_ids")
        if not duplicates:
            all_ids = finding.get("call_ids", [])
            duplicates = all_ids[1:] if len(all_ids) > 1 else []
            
        group_waste = 0.0
        for dup_id in duplicates:
            event = match_call_id_to_event(dup_id, events)
            if event:
                cost = float(event.get("cost", 0))
                group_waste += cost
        
        redundancy_waste += group_waste
        finding["savings"] = f"${group_waste:.4f}"

    # Overkill Waste = Actual Cost - Recommended Cost
    for finding in overkill:
        call_id = finding.get("call_id")
        rec_model = finding.get("recommended_model")
        event = match_call_id_to_event(call_id, events)
        
        item_waste = 0.0
        if event and rec_model:
            actual_cost = float(event.get("cost", 0))
            tokens_in = event.get("tokens_in", 0)
            tokens_out = event.get("tokens_out", 0)
            
            # Calculate what it SHOULD have cost
            rec_cost = calculate_cost(rec_model, tokens_in, tokens_out)
            
            # Savings is the difference (ensure non-negative)
            item_waste = max(0, actual_cost - rec_cost)
            
        overkill_waste += item_waste
        finding["savings"] = f"${item_waste:.4f}"

    # Bloat Waste = Unnecessary Input Tokens * Input Cost
    for finding in bloat:
        call_id = finding.get("call_id")
        est_necessary = finding.get("estimated_necessary_tokens", 0)
        event = match_call_id_to_event(call_id, events)
        
        item_waste = 0.0
        if event:
            model = event.get("model", "")
            tokens_in = event.get("tokens_in", 0)
            
            if tokens_in > est_necessary:
                wasted_tokens = tokens_in - est_necessary
                # Calculate cost of ONLY the wasted input tokens (0 output tokens)
                item_waste = calculate_cost(model, wasted_tokens, 0)
        
        bloat_waste += item_waste
        finding["savings"] = f"${item_waste:.4f}"

    # 4. Final Score Calculation
    total_waste = redundancy_waste + overkill_waste + bloat_waste
    optimized_cost = max(total_cost - total_waste, 0.000001)
    
    # Efficiency Score = (Optimized / Total) * 100
    efficiency_score = int((optimized_cost / total_cost) * 100)
    efficiency_score = max(0, min(100, efficiency_score))

    # 5. Populate Result Structure
    # Sub-scores are less relevant now, but we fill them for UI compatibility
    # We can just use the overall score or make simple derivations
    sub_scores = {
        "redundancy": max(0, 100 - int((redundancy_waste / total_cost) * 100)) if total_cost > 0 else 100,
        "model_fit": max(0, 100 - int((overkill_waste / total_cost) * 100)) if total_cost > 0 else 100,
        "context_efficiency": max(0, 100 - int((bloat_waste / total_cost) * 100)) if total_cost > 0 else 100
    }

    return {
        "score": efficiency_score,
    return {
        "score": efficiency_score,
        "grade": None, # Deprecated
        "breakdown": {
            "redundancy_waste": round(redundancy_waste, 4),
            "overkill_waste": round(overkill_waste, 4),
            "bloat_waste": round(bloat_waste, 4),
            "total_waste": round(total_waste, 4),
            "total_cost": round(total_cost, 4),
            "optimized_cost": round(optimized_cost, 4)
        },
        "sub_scores": sub_scores,
        "optimized_sub_scores": {"redundancy": 100, "model_fit": 100, "context_efficiency": 100},
        "optimized_score": 100, # By definition, the optimized version is perfect
        "savings_breakdown": {
            "redundancy_savings": round(redundancy_waste, 4),
            "model_fit_savings": round(overkill_waste, 4),
            "context_efficiency_savings": round(bloat_waste, 4),
            "total_savings": round(total_waste, 4)
        },
        "severity_counts": {"HIGH": 0, "MEDIUM": 0, "LOW": 0}, # Deprecated but kept for schema
        "top_issues": extract_top_issues(analysis_results, total_waste)
    }

def extract_top_issues(analysis_results: Dict, total_waste: float) -> List[str]:
    """Generate simple top issues summary."""
    issues = []
    
    # Check Gemini's summary first
    summary = analysis_results.get("analysis_summary", {})
    if summary.get("top_issues"):
        return summary["top_issues"]

    # Fallback generation
    redundancies = analysis_results.get("redundancies") or []
    if isinstance(redundancies, dict): redundancies = redundancies.get("items", [])

    overkill = analysis_results.get("model_overkill") or []
    if isinstance(overkill, dict): overkill = overkill.get("items", [])
    
    if len(redundancies) > 0:
        issues.append(f"{len(redundancies)} redundant call(s) detected")
    if len(overkill) > 0:
        # Find most common current model
        models = [o.get("current_model", "") for o in overkill]
        if models:
            common_model = max(set(models), key=models.count)
            issues.append(f"{len(overkill)} call(s) using {common_model} for simple tasks — switch to cheaper model")
    
    if len(bloat) > 0:
        total_waste = sum(
            b.get("current_tokens", 0) - b.get("estimated_necessary_tokens", 0) 
            for b in bloat
        )
        if total_waste > 0:
            issues.append(f"{total_waste:,} unnecessary tokens detected across {len(bloat)} call(s)")
    
    return issues[:3]  # Return top 3




def calculate_efficiency_score(analysis_results: dict, events: Optional[List[Dict]] = None) -> dict:
    """
    Calculates an efficiency score (0-100) based on detected inefficiencies.
    
    Updated to use severity-weighted penalties:
    - HIGH severity: Full penalty
    - MEDIUM severity: 60% penalty
    - LOW severity: 30% penalty
    
    Returns:
        dict with score, grade, breakdown, sub_scores, optimized predictions, and savings
    """
    score = 100
    
    # Extract findings (support both wrapper and direct list formats)
    redundancies = analysis_results.get("redundancies") or analysis_results.get("redundant_calls") or []
    if isinstance(redundancies, dict):
        redundancies = redundancies.get("items", [])
        
    overkill = analysis_results.get("model_overkill") or []
    if isinstance(overkill, dict):
        overkill = overkill.get("items", [])
        
    bloat_items = analysis_results.get("prompt_bloat") or []
    if isinstance(bloat_items, dict):
        bloat_items = bloat_items.get("items", [])
    
    # Calculate severity-weighted penalties
    redundancy_penalty = 0.0
    for finding in redundancies:
        weight = get_severity_weight(finding)
        redundancy_penalty += BASE_PENALTIES["redundancy"] * weight
    
    overkill_penalty = 0.0
    for finding in overkill:
        weight = get_severity_weight(finding)
        overkill_penalty += BASE_PENALTIES["model_overkill"] * weight
    
    bloat_penalty = 0.0
    for item in bloat_items:
        weight = get_severity_weight(item)
        current = item.get("current_tokens", 0)
        necessary = item.get("estimated_necessary_tokens", 0)
        
        if necessary > 0 and current > necessary:
            wasted_tokens = current - necessary
        elif item.get("waste_percentage"):
            wasted_tokens = current * (item.get("waste_percentage", 0) / 100)
        else:
            wasted_tokens = 500  # Conservative default
        
        # Penalty per 1000 wasted tokens, weighted by severity
        bloat_penalty += (wasted_tokens / 1000) * BASE_PENALTIES["prompt_bloat"] * weight
    
    # Apply penalties
    score -= redundancy_penalty
    score -= overkill_penalty
    score -= bloat_penalty
    
    # Clamp score between 0 and 100
    score = int(max(0, min(100, score)))
    
    # Calculate sub-scores
    total_calls = len(events) if events else max(5, len(redundancies) + len(overkill) + len(bloat_items))
    
    sub_scores = {
        "redundancy": calculate_redundancy_score(redundancies, total_calls),
        "model_fit": calculate_model_fit_score(overkill, total_calls),
        "context_efficiency": calculate_context_efficiency_score(bloat_items, events) if events else 50
    }
    
    # Calculate optimized sub-scores (after fixes applied)
    optimized_sub_scores = {
        "redundancy": 100,  # All redundancies eliminated via caching
        "model_fit": 100,   # All models appropriate after switching
        "context_efficiency": calculate_optimized_context_efficiency(
            sub_scores["context_efficiency"], 
            bloat_items
        )
    }
    
    # Calculate optimized overall score (weighted average)
    optimized_score = int(
        (optimized_sub_scores["redundancy"] + 
        optimized_sub_scores["model_fit"] + 
        optimized_sub_scores["context_efficiency"]) / 3
    )
    
    # Calculate savings breakdown
    savings_breakdown = calculate_savings_breakdown(analysis_results, events) if events else {
        "redundancy_savings": 0.0,
        "model_fit_savings": 0.0,
        "context_efficiency_savings": 0.0,
        "total_savings": 0.0
    }
    
    # Extract severity counts and top issues
    severity_counts = extract_severity_counts(analysis_results)
    top_issues = extract_top_issues(analysis_results)
    
    return {
        "score": score,
        "grade": None,
        "breakdown": {
            "redundancy_penalty": round(redundancy_penalty, 1),
            "overkill_penalty": round(overkill_penalty, 1),
            "bloat_penalty": round(bloat_penalty, 1)
        },
        "sub_scores": sub_scores,
        "optimized_sub_scores": optimized_sub_scores,
        "optimized_score": optimized_score,
        "savings_breakdown": savings_breakdown,
        "severity_counts": severity_counts,
        "top_issues": top_issues
    }
=======
        issues.append(f"{len(overkill)} call(s) using over-powered models")
        
    return issues[:3]
>>>>>>> 798353a (WIF)

def compute_workflow_graph_metrics(workflow_id: str, supabase_client):
    # (Leaving existing graph logic unchanged as it's separate from scoring)
    # ... [Keep original implementation if needed, or stub it out if we just want scoring]
    # For brevity in this write_to_file, I will refer to the existence of this function.
    # In a real replace, I would include it. 
    # Since I am using write_to_file with Overwrite=True, I MUST INCLUDE THE FULL CONTENT.
    # So I will copy the graph logic from the previous file view.
    
    try:
        # 1. Fetch data
        events_res = supabase_client.table("events").select("*").eq("workflow_id", workflow_id).execute()
        events = events_res.data
        
        edges_res = supabase_client.table("call_edges").select("*").eq("workflow_id", workflow_id).execute()
        detected_edges = edges_res.data
        
        if not events: return
        
        # 2. Build graph structure
        node_latencies = {}
        node_costs = {}
        outbound_counts = {}
        inbound_counts = {}
        adj = {}
        
        for e in events:
            rid = str(e["run_id"])
            node_latencies[rid] = e.get("latency_ms", 0)
            node_costs[rid] = float(e.get("cost", 0))
            outbound_counts[rid] = 0
            inbound_counts[rid] = 0
            adj[rid] = []
            
        for edge in detected_edges:
            src = str(edge["source_id"])
            tgt = str(edge["target_id"])
            if src in adj: 
                adj[src].append(tgt)
                outbound_counts[src] += 1
            if tgt in inbound_counts: 
                inbound_counts[tgt] += 1

        # 3. Identify Dead Branches using Backwards Reachability
        leaf_nodes = [rid for rid, count in outbound_counts.items() if count == 0]
        
        rid_to_time = {str(e["run_id"]): e["created_at"] for e in events}
        leaf_nodes.sort(key=lambda rid: rid_to_time[rid], reverse=True)
        
        intended_output = leaf_nodes[0] if leaf_nodes else None
        alive_nodes = set()
        
        if intended_output:
            rev_adj = {rid: [] for rid in node_latencies}
            for src, targets in adj.items():
                for tgt in targets:
                    rev_adj[tgt].append(src)
            
            queue = [intended_output]
            alive_nodes.add(intended_output)
            while queue:
                curr = queue.pop(0)
                for p in rev_adj.get(curr, []):
                    if p not in alive_nodes:
                        alive_nodes.add(p)
                        queue.append(p)

        dead_nodes = [rid for rid in node_latencies if rid not in alive_nodes]
        dead_branch_waste = sum(node_costs[rid] for rid in dead_nodes)

        # 4. Critical Path
        dist = {rid: 0 for rid in node_latencies}
        parent_map = {rid: None for rid in node_latencies}
        for rid in node_latencies: dist[rid] = node_latencies[rid]
            
        for _ in range(len(node_latencies)):
            for src in adj:
                for tgt in adj[src]:
                    if dist[tgt] < dist[src] + node_latencies[tgt]:
                        dist[tgt] = dist[src] + node_latencies[tgt]
                        parent_map[tgt] = src
        
        critical_path_latency = max(dist.values()) if dist else 0
        
        critical_nodes = set()
        if dist:
            end_node = max(dist, key=dist.get)
            curr = end_node
            while curr:
                critical_nodes.add(curr)
                curr = parent_map[curr]

        # 5. Info Efficiency
        total_tokens = sum(e.get("tokens_in", 0) + e.get("tokens_out", 0) for e in events)
        info_efficiency = 0
        if total_tokens > 0:
            useful_score = sum(edge.get("overlap_score", 0) for edge in detected_edges if str(edge["target_id"]) in alive_nodes)
            info_efficiency = (useful_score * 100) / (len(events) or 1)

        # 6. Update Database
        update_data = {
            "dead_branch_waste": round(dead_branch_waste, 6),
            "critical_path_latency": int(critical_path_latency),
            "information_efficiency": round(float(info_efficiency), 2),
            "graph_computed": True
        }
        
        supabase_client.table("workflows").update(update_data).eq("id", workflow_id).execute()
        
        for rid in node_latencies:
            ntype = "normal"
            if rid in dead_nodes: ntype = "dead"
            if rid in critical_nodes: ntype = "critical"
            try:
                supabase_client.table("events").update({"node_type": ntype}).eq("run_id", rid).execute()
            except Exception as e:
                # Ignore schema errors (project migration might verify pending)
                # print(f"Warning: Could not update node_type: {e}") 
                pass

        return update_data
    except Exception as e:
        print(f"Error computing graph metrics: {e}")
        return None
