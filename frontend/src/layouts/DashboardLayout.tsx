import { Outlet, Link } from "react-router-dom";
import { LayoutDashboard, FileText, Settings } from "lucide-react";

export default function DashboardLayout() {
    return (
        <div className="min-h-screen flex bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:block">
                <div className="p-6">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        Kaizen
                    </h1>
                </div>
                <nav className="mt-6 px-4 space-y-2">
                    <Link
                        to="/dashboard"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg"
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </Link>
                    <Link
                        to="/dashboard/assessments"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        <FileText className="w-5 h-5" />
                        Assessments
                    </Link>
                    <Link
                        to="/dashboard/settings"
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                        <Settings className="w-5 h-5" />
                        Settings
                    </Link>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}
