import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get current user
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { action, department, officialRole } = body;

    if (!action || !department || !officialRole) {
      return NextResponse.json({ 
        error: 'Missing required fields: action, department, officialRole' 
      }, { status: 400 });
    }

    // Validate action
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Create Supabase client
    const supabase = await createClient();

    // Verify user is an official with the specified role
    const { data: officialData, error: officialError } = await supabase
      .from('officials')
      .select('*')
      .eq('clerk_id', user.id)
      .eq('official_role', officialRole)
      .single();

    if (officialError || !officialData) {
      return NextResponse.json({ error: 'Unauthorized - Invalid official role' }, { status: 403 });
    }

    // Check authorization - only HODs can approve members from their department
    const departmentOfficialMap: Record<string, string> = {
      'CSE': 'cse_hod',
      'CSM': 'csm_hod',
      'CSD': 'csd_hod',
      'ECE': 'ece_hod',
      'HS': 'hs_hod'
    };

    const authorizedRoles = ['cse_hod', 'csm_hod', 'csd_hod', 'ece_hod'];
    if (!authorizedRoles.includes(officialRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify official can act on this department
    if (departmentOfficialMap[department] !== officialRole) {
      return NextResponse.json({ error: 'Cannot approve members from other departments' }, { status: 403 });
    }

    // Fetch current letter
    const { data: letter, error: fetchError } = await supabase
      .from('letters')
      .select('club_members_by_dept, recipients, status')
      .eq('id', id)
      .single();

    if (fetchError || !letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 });
    }

    // Verify official is a recipient
    if (!letter.recipients.includes(officialRole)) {
      return NextResponse.json({ error: 'Not authorized to review this letter' }, { status: 403 });
    }

    // Update club_members_by_dept
    const clubMembersByDept = letter.club_members_by_dept || {};
    if (!clubMembersByDept[department]) {
      return NextResponse.json({ error: 'Department not found in letter' }, { status: 404 });
    }

    // Update all members in the department
    const members = clubMembersByDept[department];
    const status = action === 'approve' ? 'approved' : 'rejected';
    
    const updatedMembers = members.map((member: any) => ({
      ...member,
      status,
      approved_by: officialRole
    }));

    clubMembersByDept[department] = updatedMembers;

    // Update letter status - all members are now processed
    let updatedLetterStatus = letter.status || '';
    const statusPairs = updatedLetterStatus.split(',').filter(Boolean);
    const updatedPairs = statusPairs.filter((pair: string) => !pair.startsWith(officialRole));
    
    // Add the official's overall decision
    updatedPairs.push(`${officialRole}-${status}`);
    updatedLetterStatus = updatedPairs.join(',');

    // Update the letter in database
    const { error: updateError } = await supabase
      .from('letters')
      .update({
        club_members_by_dept: clubMembersByDept,
        status: updatedLetterStatus
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating letter:', updateError);
      return NextResponse.json({ error: 'Failed to update letter' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: `All members in ${department} department ${status}`,
      action: status,
      department,
      membersAffected: updatedMembers.length
    });

  } catch (error) {
    console.error('Error in bulk action API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
