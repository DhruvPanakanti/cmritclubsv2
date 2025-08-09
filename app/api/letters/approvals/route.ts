import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST - Update approval status for a letter
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { letterId, status, remarks } = await request.json();

    if (!letterId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid request. letterId and status (approved/rejected) are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the official's profile to verify they can approve this letter
    const { data: official, error: officialError } = await supabase
      .from('officials')
      .select('*')
      .eq('clerk_id', userId)
      .single();

    if (officialError || !official) {
      return NextResponse.json(
        { error: 'Official profile not found' },
        { status: 404 }
      );
    }

    // Verify the letter exists and the official is a recipient
    const { data: letter, error: letterError } = await supabase
      .from('letters')
      .select('recipients')
      .eq('id', letterId)
      .single();

    if (letterError || !letter) {
      return NextResponse.json(
        { error: 'Letter not found' },
        { status: 404 }
      );
    }

    // Check if the official is a recipient of this letter
    const recipients = Array.isArray(letter.recipients) 
      ? letter.recipients 
      : JSON.parse(letter.recipients || '[]');
    
    if (!recipients.includes(official.official_role)) {
      return NextResponse.json(
        { error: 'You are not authorized to approve this letter' },
        { status: 403 }
      );
    }

    // Update the approval status using the database function
    const { data: updateResult, error: updateError } = await supabase
      .rpc('update_letter_approval_status', {
        letter_id_param: letterId,
        official_role_param: official.official_role,
        approval_status: status
      });

    if (updateError || !updateResult) {
      console.error('Error updating approval status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update approval status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      official_role: official.official_role,
      status,
      remarks: remarks || null,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in POST /api/letters/approvals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
