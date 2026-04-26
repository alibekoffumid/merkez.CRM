// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      throw new Error("No audio file provided");
    }

    // @ts-ignore: Deno namespace is available at runtime
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    // @ts-ignore: Deno namespace is available at runtime
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!GROQ_API_KEY || !OPENAI_API_KEY) {
      throw new Error("API keys not configured");
    }

    // 1. Transcription via Groq (Whisper-v3)
    const transcriptionFormData = new FormData();
    transcriptionFormData.append("file", audioFile);
    transcriptionFormData.append("model", "whisper-large-v3");
    transcriptionFormData.append("response_format", "json");

    const transcriptionResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: transcriptionFormData,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error("Groq API Error:", errorText);
      throw new Error(`Groq Transcription failed: ${errorText}`);
    }

    const transcriptionData = await transcriptionResponse.json();
    const text = transcriptionData.text;
    console.log("Transcribed Text:", text);

    if (!text) throw new Error("Transcription failed: Empty text");

    // 2. Data Extraction via GPT-4o
    console.log("Extracting data via GPT-4o...");
    const currentYear = new Date().getFullYear();
    const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a dental assistant. Extract appointment details from text. 
            Return ONLY a valid JSON object. 
            Format: { "patient_name": "string", "procedure_type": "string", "date": "YYYY-MM-DD", "time": "HH:mm" }.
            If current year is ${currentYear}, use it for relative dates (e.g. 'tomorrow').`
          },
          { role: "user", content: text }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error("OpenAI API Error:", errorText);
      throw new Error(`OpenAI extraction failed: ${errorText}`);
    }

    const gptData = await gptResponse.json();
    console.log("GPT Output:", gptData.choices[0].message.content);
    const result = JSON.parse(gptData.choices[0].message.content);

    // 3. Database Check (Supabase) - Optional to prevent crash if table missing
    let isAvailable = true;
    try {
      // @ts-ignore: Deno namespace is available at runtime
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data: existingAppts, error: dbError } = await supabase
        .from("dental_appointments")
        .select("id")
        .eq("appointment_date", result.date)
        .eq("start_time", result.time);

      if (!dbError && existingAppts && existingAppts.length > 0) {
        isAvailable = false;
      }
    } catch (e) {
      console.warn("DB check failed, proceeding anyway:", e);
    }

    return new Response(
      JSON.stringify({ 
        result, 
        isAvailable, 
        transcription: text 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
});
