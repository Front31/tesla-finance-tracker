import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Read vehicle state with token
    const { data: vehicle, error: vErr } = await supabase
      .from('tesla_vehicle_state')
      .select('*')
      .limit(1)
      .single()

    if (vErr || !vehicle) {
      return new Response(
        JSON.stringify({ success: false, error: 'No vehicle state found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!vehicle.tesla_access_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'No Tesla access token configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = vehicle.tesla_access_token

    // Step 1: Get vehicle list to find vehicle ID
    console.log('Fetching Tesla vehicle list...')
    const vehiclesRes = await fetch('https://fleet-api.prd.eu.vn.cloud.tesla.com/api/1/vehicles', {
      headers: { 'Authorization': `Bearer ${token}` },
    })

    if (!vehiclesRes.ok) {
      const errBody = await vehiclesRes.text()
      console.error('Tesla vehicles list error:', vehiclesRes.status, errBody)
      return new Response(
        JSON.stringify({ success: false, error: `Tesla API error: ${vehiclesRes.status}`, details: errBody }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const vehiclesData = await vehiclesRes.json()
    const teslaVehicles = vehiclesData.response || []

    // Find matching vehicle by VIN or use first
    let targetVehicle = teslaVehicles[0]
    if (vehicle.vin) {
      const found = teslaVehicles.find((v: any) => v.vin === vehicle.vin)
      if (found) targetVehicle = found
    }

    if (!targetVehicle) {
      return new Response(
        JSON.stringify({ success: false, error: 'No Tesla vehicles found for this account' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: Get vehicle data
    console.log('Fetching vehicle data for ID:', targetVehicle.id)
    const dataRes = await fetch(
      `https://fleet-api.prd.eu.vn.cloud.tesla.com/api/1/vehicles/${targetVehicle.id}/vehicle_data?endpoints=vehicle_state`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )

    if (!dataRes.ok) {
      const errBody = await dataRes.text()
      console.error('Tesla vehicle data error:', dataRes.status, errBody)
      return new Response(
        JSON.stringify({ success: false, error: `Tesla data API error: ${dataRes.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fullData = await dataRes.json()
    const vehicleState = fullData.response?.vehicle_state
    const odometerMiles = vehicleState?.odometer ?? 0
    const odometerKm = Math.round(odometerMiles * 1.60934)

    // Update DB
    const { error: updateErr } = await supabase
      .from('tesla_vehicle_state')
      .update({
        odometer_km: odometerKm,
        vin: targetVehicle.vin || vehicle.vin,
        last_sync_at: new Date().toISOString(),
        raw_json: fullData.response,
      })
      .eq('id', vehicle.id)

    if (updateErr) {
      console.error('DB update error:', updateErr)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save vehicle data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Tesla sync complete: ${odometerKm} km`)

    return new Response(
      JSON.stringify({
        success: true,
        data: { odometerKm, vin: targetVehicle.vin, syncedAt: new Date().toISOString() },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
