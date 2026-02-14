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
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY')

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Read config
    const { data: configData, error: configErr } = await supabase
      .from('finance_config')
      .select('*')
      .limit(1)
      .single()

    if (configErr || !configData) {
      return new Response(
        JSON.stringify({ success: false, error: 'No finance config found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Read odometer from tesla_vehicle_state
    const { data: vehicleData } = await supabase
      .from('tesla_vehicle_state')
      .select('odometer_km')
      .limit(1)
      .single()

    const odometerKm = vehicleData?.odometer_km ?? 20000
    const yearMin = configData.vehicle_year - 1
    const yearMax = configData.vehicle_year + 1
    const kmMax = odometerKm + 15000

    // Build mobile.de search URL for Tesla Model 3
    const searchUrl = `https://suchen.mobile.de/fahrzeuge/search.html?dam=0&isSearchRequest=true&ms=29_17_5_&od=${kmMax}&fr=${yearMin}%3A${yearMax}&s=Car&vc=Car`

    console.log('Scraping mobile.de URL:', searchUrl)

    // Call Firecrawl scrape API
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: searchUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    })

    const scrapeData = await scrapeResponse.json()

    if (!scrapeResponse.ok || !scrapeData.success) {
      console.error('Firecrawl error:', scrapeData)
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl scrape failed', details: scrapeData }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || ''

    // Parse prices from markdown - look for EUR price patterns
    const priceRegex = /(\d{1,3}(?:\.\d{3})*)\s*€/g
    const rawPrices: number[] = []
    let match
    while ((match = priceRegex.exec(markdown)) !== null) {
      const price = parseInt(match[1].replace(/\./g, ''), 10)
      // Filter reasonable car prices (10k-80k)
      if (price >= 10000 && price <= 80000) {
        rawPrices.push(price)
      }
    }

    if (rawPrices.length === 0) {
      console.log('No prices found in markdown. Length:', markdown.length)
      return new Response(
        JSON.stringify({ success: false, error: 'No prices found on page', markdownLength: markdown.length }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Remove outliers (5th/95th percentile)
    rawPrices.sort((a, b) => a - b)
    const low = Math.floor(rawPrices.length * 0.05)
    const high = Math.ceil(rawPrices.length * 0.95)
    const cleaned = rawPrices.slice(low, high)

    if (cleaned.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not enough prices after cleaning' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const avg = Math.round(cleaned.reduce((s, p) => s + p, 0) / cleaned.length)
    const min = cleaned[0]
    const max = cleaned[cleaned.length - 1]
    const today = new Date().toISOString().split('T')[0]

    // Upsert into market_price_daily
    const { error: upsertErr } = await supabase
      .from('market_price_daily')
      .upsert({
        date: today,
        avg_price_eur: avg,
        min_price_eur: min,
        max_price_eur: max,
        sample_size: cleaned.length,
        filters_used: { yearMin, yearMax, kmMax, model: configData.vehicle_model, trim: configData.vehicle_trim },
        source: 'mobile.de',
        fetched_at: new Date().toISOString(),
      }, { onConflict: 'date' })

    if (upsertErr) {
      console.error('DB upsert error:', upsertErr)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save price data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Saved market price: avg=${avg}, min=${min}, max=${max}, samples=${cleaned.length}`)

    return new Response(
      JSON.stringify({ success: true, data: { date: today, avg, min, max, sampleSize: cleaned.length } }),
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
