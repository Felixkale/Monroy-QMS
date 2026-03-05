const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const demoUsers = [
  {
    email: 'superadmin@monroy.com',
    password: 'superadmin123',
    fullName: 'Super Admin',
    role: 'superadmin',
    department: 'Management',
  },
  {
    email: 'admin@monroy.com',
    password: 'admin123',
    fullName: 'Admin User',
    role: 'admin',
    department: 'Administration',
  },
  {
    email: 'inspector@monroy.com',
    password: 'inspector123',
    fullName: 'John Smith',
    role: 'inspector',
    department: 'Field Operations',
  },
  {
    email: 'supervisor@monroy.com',
    password: 'supervisor123',
    fullName: 'Sarah Johnson',
    role: 'supervisor',
    department: 'Operations',
  },
  {
    email: 'client@acme.com',
    password: 'client123',
    fullName: 'James Wright',
    role: 'client',
    company: 'Acme Industrial Corp',
  },
];

async function seedUsers() {
  console.log('🌱 Starting user seeding...\n');

  for (const user of demoUsers) {
    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();

      if (existingUser) {
        console.log(`⏭️  User already exists: ${user.email}`);
        continue;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      if (authError) {
        console.error(`❌ Error creating auth user ${user.email}:`, authError.message);
        continue;
      }

      // Add to users table
      const { data: insertedUser, error: dbError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          email: user.email,
          full_name: user.fullName,
          role: user.role,
          department: user.department,
          company: user.company || null,
          status: 'active',
        })
        .select()
        .single();

      if (dbError) {
        console.error(`❌ Error adding user to database ${user.email}:`, dbError.message);
        continue;
      }

      console.log(`✅ Created user: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Auth ID: ${authData.user.id}\n`);
    } catch (error) {
      console.error(`❌ Error processing user ${user.email}:`, error.message);
    }
  }

  console.log('🎉 User seeding completed!');
  process.exit(0);
}

seedUsers().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
