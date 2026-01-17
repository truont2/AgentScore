import { useParams } from "react-router-dom";

export default function DependencyGraph() {
    const { id } = useParams();

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Dependency Graph: {id}</h1>
            <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                Graph Visualization Placeholder
            </div>
        </div>
    );
}
