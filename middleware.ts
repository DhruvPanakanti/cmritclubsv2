import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { hasUserProfile } from './lib/actions/user.actions';
import { areAllApprovalsComplete } from './lib/actions/approval.actions';
import { getUserOfficialInfo } from './lib/actions/middleware-helpers';
import { 
  validateHODRoute, 
  validateGeneralRoute, 
  validateClubRoute,
  validateConsistentRoute,
  isValidCollege,
  isValidDepartment,
  isValidHODRole,
  isValidGeneralRole
} from './lib/utils/route-validation';

// Define public routes that don't require authentication.
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/uploadthing(.*)',
  '/api/onboard(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // For public routes, we do nothing.
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // For API routes, handle authentication but don't redirect
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // For authenticated API requests, let them proceed
    return NextResponse.next();
  }

  // For all other routes, we must await the auth() call to get user details.
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    // Redirect unauthenticated users to the sign-in page.
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // --- Definitive Redirection Logic ---
  // Get official info from database (primary source of truth)
  const officialInfo = await getUserOfficialInfo(userId);
  const isOfficial = officialInfo.isOfficial;
  const dbUserRole = officialInfo.role;
  
  // Fallback to Clerk metadata if database doesn't have the user
  const clerkUserRole = sessionClaims?.publicMetadata?.role;
  const userRole = dbUserRole || clerkUserRole;
  
  console.log('Middleware Debug:', {
    userId,
    isOfficial,
    dbUserRole,
    clerkUserRole,
    finalUserRole: userRole,
    pathname: req.nextUrl.pathname,
    officialInfo
  });
  
  let onboardingComplete = sessionClaims?.publicMetadata?.onboardingComplete === true;

  // If session is stale, check the database as the source of truth.
  if (!onboardingComplete) {
    if (isOfficial) {
      // For officials, they're onboarded if they exist in officials table
      onboardingComplete = true;
    } else {
      // For students, check if they have a profile
      onboardingComplete = await hasUserProfile(userId);
    }
  }

  const approvalStatus = sessionClaims?.publicMetadata?.approvalStatus;
  const isAtOnboarding = req.nextUrl.pathname.startsWith('/onboarding');
  const isAtPending = req.nextUrl.pathname.startsWith('/pending-approval');

  // 1. For officials, skip onboarding entirely if they exist in officials table
  if (isOfficial && onboardingComplete) {
    // Skip onboarding logic for officials - go directly to role-based routing
  } else if (!onboardingComplete && !isAtOnboarding) {
    // For students or officials not in database, redirect to onboarding
    return NextResponse.redirect(new URL('/onboarding', req.url));
  }

  // 2. If onboarding IS complete, handle redirects based on status.
  if (onboardingComplete) {
    if (isOfficial) {
      // Check if user is at a valid dynamic route
      const pathname = req.nextUrl.pathname;
      const pathSegments = pathname.split('/').filter(Boolean);
      
      // Check for dynamic routes with new consistent structure
      let isAtValidOfficialRoute = false;
      
      if (pathSegments.length === 4 && pathSegments[3] === 'dashboard') {
        // Consistent route: [college]/[type]/[identifier]/dashboard
        const [college, type, identifier] = pathSegments;
        const validation = validateConsistentRoute(college, type, identifier);
        isAtValidOfficialRoute = validation.isValid;
      } else if (pathSegments.length === 4 && pathSegments[3] === 'club-applications') {
        // Consistent route: [college]/[type]/[identifier]/club-applications
        const [college, type, identifier] = pathSegments;
        const validation = validateConsistentRoute(college, type, identifier);
        isAtValidOfficialRoute = validation.isValid;
      } else if (pathSegments.length === 4 && pathSegments[3] === 'club-permissions') {
        // Consistent route: [college]/[type]/[identifier]/club-permissions
        const [college, type, identifier] = pathSegments;
        const validation = validateConsistentRoute(college, type, identifier);
        isAtValidOfficialRoute = validation.isValid;
      }
      
      if (!isAtValidOfficialRoute && !isAtOnboarding && !isAtPending) {
        // Redirect to appropriate dashboard based on role and college
        const officialCollege = officialInfo.college || 'cmrit'; // Default fallback
        
        if (userRole && userRole.includes('_hod')) {
          return NextResponse.redirect(new URL(`/${officialCollege}/hod/${userRole}/dashboard`, req.url));
        } else if (userRole && (userRole === 'tpo' || userRole === 'dean' || userRole === 'director' || userRole === 'admin')) {
          return NextResponse.redirect(new URL(`/${officialCollege}/official/${userRole}/dashboard`, req.url));
        }
        // If no role available, redirect to sign-in
        return NextResponse.redirect(new URL('/sign-in', req.url));
      }
    } else {
      // For students, use existing approval logic
      const allApprovalsComplete = await areAllApprovalsComplete(userId);
      
      // If not all approvals are complete, force redirect to pending-approval
      if (!allApprovalsComplete && !isAtPending) {
        return NextResponse.redirect(new URL('/pending-approval', req.url));
      }
      
      // Check if student is at a valid college route
      const pathname = req.nextUrl.pathname;
      const pathSegments = pathname.split('/').filter(Boolean);
      let isAtValidStudentRoute = false;
      
      if (pathSegments.length >= 2) {
        const [college] = pathSegments;
        const validation = validateClubRoute(college);
        
        if (validation.isValid) {
          // Valid routes for club leaders:
          // [college]/dashboard
          // [college]/collections
          // [college]/collections/[collection-name]
          // [college]/collections/[collection-name]/draft-letter
          if (pathSegments[1] === 'dashboard' || 
              pathSegments[1] === 'collections') {
            isAtValidStudentRoute = true;
          }
        }
      }
      
      // If all approvals are complete and on restricted pages, redirect to college dashboard
      if (allApprovalsComplete && (isAtOnboarding || isAtPending)) {
        // Default to cmrit if no college info available
        return NextResponse.redirect(new URL('/cmrit/dashboard', req.url));
      }
      
      // If onboarded but not all approvals complete, redirect to pending-approval
      if (isAtOnboarding) {
        return NextResponse.redirect(new URL('/pending-approval', req.url));
      }
      
      // If at invalid route and approvals complete, redirect to default college dashboard
      if (allApprovalsComplete && !isAtValidStudentRoute && !isAtOnboarding && !isAtPending) {
        return NextResponse.redirect(new URL('/cmrit/dashboard', req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
