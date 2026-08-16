import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createClient } from '../utils/supabase/server';

/**
 * Verify user authentication and allowed role(s).
 * Roles can be string or array of strings, e.g. ['admin', 'organizer']
 */
export async function verifyRole(allowedRoles = ['admin']) {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
      return {
        authorized: false,
        user: null,
        profile: null,
        errorResponse: NextResponse.json(
          { error: 'Server misconfiguration: Missing Supabase credentials' },
          { status: 500 }
        ),
      };
    }

    const cookieStore = await cookies();
    const userClient = createClient(cookieStore);
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return {
        authorized: false,
        user: null,
        profile: null,
        errorResponse: NextResponse.json(
          { error: 'Unauthorized: Authentication required' },
          { status: 401 }
        ),
      };
    }

    const adminClient = createServiceClient(supabaseUrl, serviceKey);
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, email, name, role, status')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return {
        authorized: false,
        user,
        profile: null,
        errorResponse: NextResponse.json(
          { error: 'Forbidden: Profile record not found' },
          { status: 403 }
        ),
      };
    }

    if (profile.status === 'suspended') {
      return {
        authorized: false,
        user,
        profile,
        errorResponse: NextResponse.json(
          { error: 'Forbidden: User account is suspended' },
          { status: 403 }
        ),
      };
    }

    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const normalizedUserRole = (profile.role || 'participant').toLowerCase();

    if (!rolesArray.includes(normalizedUserRole)) {
      return {
        authorized: false,
        user,
        profile,
        errorResponse: NextResponse.json(
          { error: `Forbidden: Access requires one of the following roles: ${rolesArray.join(', ')}` },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      user,
      profile,
    };
  } catch (err) {
    console.error('[RBAC Middleware Error]:', err);
    return {
      authorized: false,
      user: null,
      profile: null,
      errorResponse: NextResponse.json(
        { error: 'Internal server error in authorization' },
        { status: 500 }
      ),
    };
  }
}
