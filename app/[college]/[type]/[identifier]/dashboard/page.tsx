import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { getUserOfficialInfo } from '@/lib/actions/middleware-helpers';
import { College, HODRole, GeneralRole } from '@/types/globals';
import { validateConsistentRoute, generateConsistentBreadcrumbs } from '@/lib/utils/route-validation';
import Link from 'next/link';

interface ConsistentDashboardPageProps {
  params: Promise<{
    college: string;
    type: string;
    identifier: string;
  }>;
}

export default async function ConsistentDashboardPage({ params }: ConsistentDashboardPageProps) {
  const { college, type, identifier } = await params;
  
  // Validate route parameters
  const validation = validateConsistentRoute(college, type, identifier);
  if (!validation.isValid) {
    notFound();
  }

  // Get current user
  const user = await currentUser();
  if (!user) {
    redirect('/sign-in');
  }

  // Get official info and verify access
  const officialInfo = await getUserOfficialInfo(user.id);
  if (!officialInfo.isOfficial) {
    redirect('/dashboard');
  }

  // Verify user has access to this specific route
  const hasAccess = verifyRouteAccess(officialInfo, college, type, identifier);
  if (!hasAccess) {
    redirect('/dashboard');
  }

  // Generate breadcrumbs
  const breadcrumbs = generateConsistentBreadcrumbs(college as College, type, identifier);

  // Determine dashboard title and content based on type
  const dashboardConfig = getDashboardConfig(type, identifier);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="inline-flex items-center">
                {index > 0 && (
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <a
                  href={crumb.href}
                  className={`ml-1 text-sm font-medium ${
                    index === breadcrumbs.length - 1
                      ? 'text-gray-500 cursor-default'
                      : 'text-gray-700 hover:text-gray-900'
                  } md:ml-2`}
                >
                  {crumb.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Dashboard Header */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">{dashboardConfig.title}</h1>
            <p className="mt-1 text-sm text-gray-600">{dashboardConfig.description}</p>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Club Applications Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Club Applications</h3>
            <p className="text-gray-600 mb-4">{dashboardConfig.applicationsDescription}</p>
            <Link
              href={`/${college}/${type}/${identifier}/club-applications`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              View Applications
            </Link>
          </div>

          {/* Statistics Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Statistics</h3>
            <p className="text-gray-600 mb-4">View application statistics and trends</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Pending:</span>
                <span className="text-sm font-medium text-yellow-600">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Approved:</span>
                <span className="text-sm font-medium text-green-600">-</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Rejected:</span>
                <span className="text-sm font-medium text-red-600">-</span>
              </div>
            </div>
          </div>

          {/* Club Permissions Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Club Permissions</h3>
            <p className="text-gray-600 mb-4">Review and approve club permissions from departments</p>
            <Link
              href={`/${college}/${type}/${identifier}/club-permissions`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              View Letters
            </Link>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h3>
            <p className="text-gray-600 mb-4">Common administrative tasks</p>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                Export Applications
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                Generate Report
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                View Analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to verify route access
function verifyRouteAccess(
  officialInfo: { role?: string; college?: string },
  college: string,
  type: string,
  identifier: string
): boolean {
  // Verify college matches
  if (officialInfo.college !== college) {
    return false;
  }

  // Verify role access based on type and identifier
  if (type === 'hod') {
    return officialInfo.role === identifier;
  } else if (type === 'official') {
    return officialInfo.role === identifier;
  }

  return false;
}

// Helper function to get dashboard configuration
function getDashboardConfig(type: string, identifier: string) {
  if (type === 'hod') {
    const department = identifier.replace('_hod', '').toUpperCase();
    return {
      title: `${department} HOD Dashboard`,
      description: `Head of Department dashboard for ${department}`,
      applicationsDescription: `Review and approve club applications from the ${department} department`
    };
  } else if (type === 'official') {
    const roleNames: Record<string, string> = {
      tpo: 'Training & Placement Officer',
      dean: 'Dean',
      director: 'Director',
      admin: 'Administrator'
    };
    return {
      title: `${roleNames[identifier] || identifier.toUpperCase()} Dashboard`,
      description: `${roleNames[identifier] || identifier.toUpperCase()} administrative dashboard`,
      applicationsDescription: 'Review and approve club applications from all departments'
    };
  }

  return {
    title: 'Dashboard',
    description: 'Administrative dashboard',
    applicationsDescription: 'Review and approve club applications'
  };
}
