const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedSampleData() {
  console.log('🌱 Starting sample data seeding...\n');

  try {
    // 1. Create Sample Client
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .insert({
        company_name: 'Acme Industrial Corp',
        company_code: 'ACME-001',
        contact_email: 'contact@acme.com',
        contact_phone: '+27 11 555 0101',
        status: 'active',
      })
      .select()
      .single();

    if (clientError) throw clientError;
    console.log(`✅ Created client: ${clientData.company_name}`);

    // 2. Create Sample Site
    const { data: siteData, error: siteError } = await supabase
      .from('sites')
      .insert({
        client_id: clientData.id,
        site_name: 'Plant A - Main Facility',
        site_code: 'PLANT-A',
        location: 'Johannesburg, South Africa',
        status: 'active',
      })
      .select()
      .single();

    if (siteError) throw siteError;
    console.log(`✅ Created site: ${siteData.site_name}`);

    // 3. Create Sample Assets
    const assets = [
      {
        client_id: clientData.id,
        site_id: siteData.id,
        asset_tag: 'PV-0041',
        asset_name: 'Pressure Vessel',
        manufacturer: 'ASME Corp',
        model: 'PV-Standard-2020',
        serial_number: 'S-10041',
        year_of_make: 2018,
        service: 'Steam',
        status: 'active',
        risk_class: 'high',
      },
      {
        client_id: clientData.id,
        site_id: siteData.id,
        asset_tag: 'BL-0012',
        asset_name: 'Boiler',
        manufacturer: 'ThermTech',
        model: 'BL-2015',
        serial_number: 'S-20012',
        year_of_make: 2015,
        service: 'Steam Generation',
        status: 'active',
        risk_class: 'high',
      },
    ];

    const { data: assetsData, error: assetsError } = await supabase
      .from('assets')
      .insert(assets)
      .select();

    if (assetsError) throw assetsError;
    console.log(`✅ Created ${assetsData.length} assets`);

    // 4. Create Nameplate Data for first asset
    const { error: nameplateError } = await supabase
      .from('asset_nameplate')
      .insert({
        asset_id: assetsData[0].id,
        design_code: 'ASME VIII Div 1',
        mawp: 10,
        design_pressure: 10,
        test_pressure: 15,
        design_temp_min: 0,
        design_temp_max: 200,
        material: 'Carbon Steel',
        corrosion_allowance: 2,
        capacity: 500,
        joint_efficiency: 1.0,
        relief_valve_pressure: 10.5,
      });

    if (nameplateError) throw nameplateError;
    console.log(`✅ Created nameplate data for PV-0041`);

    // 5. Get Inspector User
    const { data: inspectorUser } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'inspector')
      .single();

    if (inspectorUser) {
      // 6. Create Sample Inspection
      const { data: inspectionData, error: inspectionError } = await supabase
        .from('inspections')
        .insert({
          client_id: clientData.id,
          site_id: siteData.id,
          asset_id: assetsData[0].id,
          inspection_type: 'Statutory',
          status: 'completed',
          inspected_at: new Date().toISOString(),
          inspector_id: inspectorUser.id,
          result: 'Pass',
          summary: 'Equipment in excellent condition. All safety systems functional.',
          next_due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        .select()
        .single();

      if (inspectionError) throw inspectionError;
      console.log(`✅ Created inspection for PV-0041`);

      // 7. Create Certificate
      const { error: certificateError } = await supabase
        .from('certificates')
        .insert({
          client_id: clientData.id,
          site_id: siteData.id,
          asset_id: assetsData[0].id,
          inspection_id: inspectionData.id,
          certificate_number: 'CERT-0889',
          issued_at: new Date().toISOString(),
          valid_from: new Date().toISOString().split('T')[0],
          valid_to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'issued',
        });

      if (certificateError) throw certificateError;
      console.log(`✅ Created certificate CERT-0889`);
    }

    console.log('\n🎉 Sample data seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
  }

  process.exit(0);
}

seedSampleData().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
