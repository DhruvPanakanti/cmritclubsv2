import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      collection_id, 
      recipients, 
      subject, 
      body, 
      club_members_by_dept,
      closing 
    } = await request.json();

    if (!collection_id || !recipients || !subject || !body || !club_members_by_dept) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the club leader's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if the club leader is approved
    const approvalStatus = profile.approval_status as any;
    
    // Check if all required approvals are approved
    const requiredApprovals = ['tpo', 'dean', 'hsHod', 'csdHod', 'cseHod', 'csmHod', 'eceHod', 'director'];
    const allApproved = requiredApprovals.every(role => 
      approvalStatus?.[role]?.status === 'approved'
    );
    
    if (!allApproved) {
      return NextResponse.json(
        { error: 'Only approved club leaders can create letters' },
        { status: 403 }
      );
    }

    // Verify the collection belongs to this club leader
    const { data: collection, error: collectionError } = await supabase
      .from('collections')
      .select('*')
      .eq('id', collection_id)
      .eq('club_id', profile.id)
      .single();

    if (collectionError || !collection) {
      return NextResponse.json(
        { error: 'Collection not found or access denied' },
        { status: 404 }
      );
    }

    // Create the letter (status will be auto-initialized by trigger)
    const { data: letter, error: createError } = await supabase
      .from('letters')
      .insert({
        collection_id,
        recipients,
        subject: subject.trim(),
        body: body.trim(),
        club_members_by_dept,
        closing: closing?.trim() || null
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating letter:', createError);
      return NextResponse.json(
        { error: 'Failed to create letter' },
        { status: 500 }
      );
    }

    return NextResponse.json(letter, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/letters:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
