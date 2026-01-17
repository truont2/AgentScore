
export interface GraphCall {
  id: string;
  parents: string[];
  [key: string]: any;
}

export interface GraphEdge {
  source: string;
  target: string;
  [key: string]: any;
}

export interface DependencyGraphData {
  calls: GraphCall[];
  edges: GraphEdge[];
  [key: string]: any;
}
