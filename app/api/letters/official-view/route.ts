import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get current user
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get official role from query params
    const { searchParams } = new URL(request.url);
    const officialRole = searchParams.get('role');
    
    if (!officialRole) {
      return NextResponse.json({ error: 'Official role is required' }, { status: 400 });
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

    // Debug logging
    console.log('🔍 Fetching letters for official:', { officialRole, userId: user.id });

    // Fetch letters with simplified query first
    const { data: letters, error: lettersError } = await supabase
      .from('letters')
      .select(`
        id,
        subject,
        body,
        recipients,
        club_members_by_dept,
        status,
        created_at,
        collection_id
      `)
      .not('recipients', 'is', null)
      .order('created_at', { ascending: false });

    if (lettersError) {
      console.error('❌ Error fetching letters:', lettersError);
      console.error('Query details:', { officialRole, userId: user.id });
      return NextResponse.json({ error: 'Failed to fetch letters' }, { status: 500 });
    }

    console.log(`📊 Found ${letters?.length || 0} total letters in database`);
    
    // Log sample letter data for debugging
    if (letters && letters.length > 0) {
      console.log('📝 Sample letter data:', {
        id: letters[0].id,
        subject: letters[0].subject,
        recipients: letters[0].recipients,
        collection_id: letters[0].collection_id
      });
    }

    // Filter and transform the data
    const transformedLetters = letters?.filter((letter: any) => {
      // Parse recipients JSON string and check if official is included
      let recipients: string[] = [];
      try {
        recipients = typeof letter.recipients === 'string' 
          ? JSON.parse(letter.recipients) 
          : letter.recipients || [];
      } catch (e) {
        console.error('❌ Error parsing recipients for letter', letter.id, ':', e);
        console.error('Raw recipients data:', letter.recipients);
        recipients = [];
      }
      
      const isRecipient = recipients.includes(officialRole);
      console.log(`🔍 Letter ${letter.id}: recipients=${JSON.stringify(recipients)}, isRecipient=${isRecipient}`);
      return isRecipient;
    }).map((letter: any) => {
      // Parse JSON fields
      let recipients: string[] = [];
      let clubMembersByDept: Record<string, any> = {};
      
      try {
        recipients = typeof letter.recipients === 'string' 
          ? JSON.parse(letter.recipients) 
          : letter.recipients || [];
      } catch (e) {
        recipients = [];
      }
      
      try {
        clubMembersByDept = typeof letter.club_members_by_dept === 'string' 
          ? JSON.parse(letter.club_members_by_dept) 
          : letter.club_members_by_dept || {};
      } catch (e) {
        clubMembersByDept = {};
      }

      return {
        id: letter.id,
        title: letter.subject, // Map subject to title for frontend compatibility
        content: letter.body,   // Map body to content for frontend compatibility
        recipients: recipients,
        club_members_by_dept: clubMembersByDept,
        status: letter.status || '',
        created_at: letter.created_at,
        club_name: 'Unknown Club', // Will fetch separately if needed
        collection_name: 'Unknown Collection' // Will fetch separately if needed
      };
    }) || [];

    console.log(`✅ Returning ${transformedLetters.length} filtered letters for ${officialRole}`);
    
    return NextResponse.json({ 
      letters: transformedLetters,
      officialRole,
      totalCount: transformedLetters.length,
      debug: {
        totalFetched: letters?.length || 0,
        filtered: transformedLetters.length,
        officialRole
      }
    });

  } catch (error) {
    console.error('Error in official-view API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
