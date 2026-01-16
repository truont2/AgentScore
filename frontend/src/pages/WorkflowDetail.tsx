import { useParams } from "react-router-dom";

export default function WorkflowDetail() {
    const { id } = useParams();

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Workflow Details: {id}</h1>
            <p className="text-gray-600">Placeholder for detailed workflow view.</p>
        </div>
    );
}
