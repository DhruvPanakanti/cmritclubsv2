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
    const { department, memberNumber, status, officialRole } = body;

    if (!department || !memberNumber || !status || !officialRole) {
      return NextResponse.json({ 
        error: 'Missing required fields: department, memberNumber, status, officialRole' 
      }, { status: 400 });
    }

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
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

    // Find and update the specific member
    const members = clubMembersByDept[department];
    const memberIndex = members.findIndex((member: any) => member.number === memberNumber);
    
    if (memberIndex === -1) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Update member status
    members[memberIndex] = {
      ...members[memberIndex],
      status,
      approved_by: officialRole
    };

    clubMembersByDept[department] = members;

    // Check if all members in this department have been processed
    const allProcessed = members.every((member: any) => 
      member.status === 'approved' || member.status === 'rejected'
    );

    // Update letter status if all members are processed
    let updatedLetterStatus = letter.status || '';
    if (allProcessed) {
      // Update the official's status in the letter status string
      const statusPairs = updatedLetterStatus.split(',').filter(Boolean);
      const updatedPairs = statusPairs.filter((pair: string) => !pair.startsWith(officialRole));
      
      // Determine overall status for this official
      const allApproved = members.every((member: any) => member.status === 'approved');
      const overallStatus = allApproved ? 'approved' : 'rejected';
      
      updatedPairs.push(`${officialRole}-${overallStatus}`);
      updatedLetterStatus = updatedPairs.join(',');
    }

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
      message: 'Member status updated successfully',
      memberStatus: status,
      allDepartmentProcessed: allProcessed
    });

  } catch (error) {
    console.error('Error in member update API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
