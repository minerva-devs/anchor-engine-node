export interface SearchResponse {
    query: string;
    strategy: string;
    clusters: SearchCluster[];
}

export interface SearchCluster {
    id: string;               // e.g., "cluster_<session_id>"
    start_time?: string;       // ISO timestamp of earliest molecule in cluster
    end_time?: string;         // ISO timestamp of latest molecule
    topic?: string;            // optional inferred topic
    summary?: string;          // optional short summary
    molecules: SearchMolecule[];
}

export interface SearchMolecule {
    id: string;
    timestamp: string;         // ISO string
    speaker: string;           // "Rob", "Coda", "User", etc.
    tags: string[];            // e.g., ["#topological_perception", "#graph"]
    entities: {
        people: string[];
        concepts: string[];
        projects: string[];
    };
    content: string;
    byte_range: {
        start: number;
        end: number;
        source: string;          // original file path
    };
}
