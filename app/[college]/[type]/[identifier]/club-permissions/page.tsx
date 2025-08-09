import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@clerk/nextjs/server';
import { getUserOfficialInfo } from '@/lib/actions/middleware-helpers';
import { College } from '@/types/globals';
import { validateConsistentRoute, generateConsistentBreadcrumbs } from '@/lib/utils/route-validation';
import { ClubPermissionsInterface } from '@/components/club-permissions/club-permissions-interface';

interface ClubPermissionsPageProps {
  params: Promise<{
    college: string;
    type: string;
    identifier: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

export default async function ClubPermissionsPage({ params, searchParams }: ClubPermissionsPageProps) {
  const { college, type, identifier } = await params;
  const { tab = 'pending' } = await searchParams;
  
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
  breadcrumbs.push({
    label: 'Club Permissions',
    href: `/${college}/${type}/${identifier}/club-permissions`
  });

  // Get official role for filtering letters
  const officialRole = getOfficialRole(type, identifier);

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

        {/* Page Header */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Club Permission Letters</h1>
            <p className="mt-1 text-sm text-gray-600">
              Review and approve club permission letters from departments
            </p>
          </div>
        </div>

        {/* Club Permissions Interface */}
        <ClubPermissionsInterface 
          officialRole={officialRole}
          currentTab={tab}
          basePath={`/${college}/${type}/${identifier}/club-permissions`}
        />
      </div>
    </div>
  );
}

// Helper function to verify route access (same as dashboard)
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

// Helper function to get official role
function getOfficialRole(type: string, identifier: string): string {
  if (type === 'hod') {
    return identifier; // e.g., 'cse_hod'
  } else if (type === 'official') {
    return identifier; // e.g., 'dean', 'director', 'tpo'
  }
  return identifier;
}
