import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  facility_id: z.string().uuid(),
  hospital_ids: z.array(z.string().uuid()).min(1).max(25),
  truck_id: z.string().uuid().optional(),
  route_name: z.string().min(1).max(255).optional(),
});

interface LatLng {
  lat: number;
  lng: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error("GOOGLE_MAPS_API_KEY is not configured");
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { facility_id, hospital_ids, truck_id, route_name } = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Fetch facility
    const { data: facility, error: facErr } = await sb
      .from("facilities")
      .select("*")
      .eq("id", facility_id)
      .single();
    if (facErr || !facility) {
      return new Response(JSON.stringify({ error: "Facility not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch hospitals
    const { data: hospitals, error: hospErr } = await sb
      .from("hospitals")
      .select("*, o2_readings(*)")
      .in("id", hospital_ids);
    if (hospErr || !hospitals?.length) {
      return new Response(JSON.stringify({ error: "Hospitals not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to hospitals with coordinates
    const validHospitals = hospitals.filter(
      (h) => h.latitude != null && h.longitude != null
    );
    if (!validHospitals.length) {
      return new Response(
        JSON.stringify({ error: "No hospitals have coordinates set" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!facility.latitude || !facility.longitude) {
      return new Response(
        JSON.stringify({ error: "Facility has no coordinates set" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin: LatLng = { lat: facility.latitude, lng: facility.longitude };

    // Build waypoints string for Directions API with optimize:true
    const waypointCoords = validHospitals.map(
      (h) => `${h.latitude},${h.longitude}`
    );

    // Use Directions API with waypoint optimization
    const waypointsParam =
      waypointCoords.length > 0
        ? `optimize:true|${waypointCoords.join("|")}`
        : "";

    const directionsUrl = new URL(
      "https://maps.googleapis.com/maps/api/directions/json"
    );
    directionsUrl.searchParams.set("origin", `${origin.lat},${origin.lng}`);
    directionsUrl.searchParams.set(
      "destination",
      `${origin.lat},${origin.lng}`
    ); // return to facility
    directionsUrl.searchParams.set("waypoints", waypointsParam);
    directionsUrl.searchParams.set("key", GOOGLE_MAPS_API_KEY);
    directionsUrl.searchParams.set("units", "metric");

    const dirRes = await fetch(directionsUrl.toString());
    const dirData = await dirRes.json();

    if (dirData.status !== "OK") {
      console.error("Directions API error:", dirData);
      return new Response(
        JSON.stringify({
          error: `Google Directions API error: ${dirData.status}`,
          details: dirData.error_message,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const route = dirData.routes[0];
    const waypointOrder: number[] = route.waypoint_order; // optimized order
    const legs = route.legs;

    // Total distance and duration
    const totalDistanceM = legs.reduce(
      (s: number, l: any) => s + l.distance.value,
      0
    );
    const totalDurationS = legs.reduce(
      (s: number, l: any) => s + l.duration.value,
      0
    );
    const totalDistanceKm = Math.round(totalDistanceM / 1000);
    const totalDurationHours = +(totalDurationS / 3600).toFixed(2);

    // Reorder hospitals according to optimization
    const orderedHospitals = waypointOrder.map((i) => validHospitals[i]);

    // Calculate cylinder needs per hospital (based on latest reading)
    const stops = orderedHospitals.map((h, idx) => {
      const latestReading = (h as any).o2_readings?.sort(
        (a: any, b: any) =>
          new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime()
      )?.[0];

      const available = latestReading?.cylinders_available ?? 0;
      const capacity = h.cylinder_capacity;
      const needed = Math.max(0, capacity - available);

      // ETA: sum durations of legs up to this stop
      const etaSeconds = legs
        .slice(0, idx + 1)
        .reduce((s: number, l: any) => s + l.duration.value, 0);
      const etaDate = new Date(Date.now() + etaSeconds * 1000);
      const etaStr = `${String(etaDate.getHours()).padStart(2, "0")}:${String(
        etaDate.getMinutes()
      ).padStart(2, "0")}`;

      return {
        hospital_id: h.id,
        hospital_name: h.name,
        district: h.district,
        stop_order: idx + 1,
        cylinders_to_deliver: needed,
        eta: etaStr,
        leg_distance_km: Math.round(legs[idx].distance.value / 1000),
        leg_duration_min: Math.round(legs[idx].duration.value / 60),
        current_level_pct: latestReading?.level_pct ?? null,
        status: latestReading?.status ?? null,
      };
    });

    const totalCylinders = stops.reduce(
      (s, st) => s + st.cylinders_to_deliver,
      0
    );

    // Build the polyline overview for map rendering
    const overviewPolyline = route.overview_polyline?.points ?? null;

    // Build response
    const result = {
      optimized: true,
      facility: {
        id: facility.id,
        name: facility.name,
        lat: facility.latitude,
        lng: facility.longitude,
      },
      total_distance_km: totalDistanceKm,
      total_duration_hours: totalDurationHours,
      total_cylinders: totalCylinders,
      stops,
      overview_polyline: overviewPolyline,
      waypoint_order: waypointOrder,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("optimize-route error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
