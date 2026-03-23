import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeClinicalRecord(
  base64Image: string, 
  mimeType: string, 
  customMrdFields?: string[]
): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }

  const model = "gemini-3-flash-preview";

  const mrdChecklist = customMrdFields && customMrdFields.length > 0 
    ? customMrdFields.join(", ") 
    : "Patient ID, Date, Doctor Signature, Nurse Signature, Legibility";

  const prompt = `
    Analyze this handwritten clinical patient record and extract structured data.
    
    1. **Transcription**: Provide a verbatim transcription of all handwritten text. Use [UNCLEAR] for illegible words.
    2. **Patient Info**: Extract Name, Age, Gender, Hospital ID, and Admission Date.
    3. **Vitals**: Extract any recorded vitals (BP, Pulse, Temperature, SpO2, Respiratory Rate, Weight).
    4. **Medications**: Extract drug chart details.
       - Frequency mapping: 
         - OD -> 08:00
         - BD -> 08:00, 20:00
         - TDS -> 08:00, 14:00, 20:00
         - QID -> 06:00, 12:00, 18:00, 00:00
         - SOS -> As needed
       - Assign a confidence level (High/Medium/Low) to each drug.
    5. **MRD Compliance**: Perform a rigorous audit.
       - Check for: ${mrdChecklist}.
       - **Clinical Validation**: Flag abnormal vitals (e.g., BP > 140/90, SpO2 < 94%) as "Warning" or "Critical" in the compliance list.
    6. **Clinical Summary**: Provide a concise summary of the clinical notes and assessment.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Image.split(",")[1] || base64Image,
                mimeType,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcription: { type: Type.STRING },
            overallConfidence: { type: Type.NUMBER },
            patientInfo: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                age: { type: Type.STRING },
                gender: { type: Type.STRING },
                id: { type: Type.STRING },
                admissionDate: { type: Type.STRING },
                confidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
              },
              required: ["name", "age", "gender", "id", "admissionDate", "confidence"],
            },
            vitals: {
              type: Type.OBJECT,
              properties: {
                bp: { type: Type.STRING },
                pulse: { type: Type.STRING },
                temp: { type: Type.STRING },
                spo2: { type: Type.STRING },
                respRate: { type: Type.STRING },
                weight: { type: Type.STRING },
              },
            },
            medications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  drugName: { type: Type.STRING },
                  dosage: { type: Type.STRING },
                  route: { type: Type.STRING },
                  frequency: { type: Type.STRING },
                  duration: { type: Type.STRING },
                  alertTimes: { 
                    type: Type.ARRAY, 
                    items: { 
                      type: Type.OBJECT,
                      properties: {
                        time: { type: Type.STRING },
                        status: { type: Type.STRING, enum: ["Pending", "Completed"] }
                      },
                      required: ["time", "status"]
                    } 
                  },
                  confidence: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                },
                required: ["id", "drugName", "dosage", "route", "frequency", "duration", "alertTimes", "confidence"],
              },
            },
            mrdCompliance: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  field: { type: Type.STRING },
                  status: { type: Type.STRING, enum: ["COMPLETE", "INCOMPLETE"] },
                  severity: { type: Type.STRING, enum: ["Critical", "Warning", "Informational"] },
                  description: { type: Type.STRING },
                },
                required: ["id", "field", "status", "severity", "description"],
              },
            },
            notes: { type: Type.STRING },
          },
          required: ["transcription", "overallConfidence", "patientInfo", "medications", "mrdCompliance", "notes"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("AI returned an empty response.");
    }

    try {
      return JSON.parse(text) as AnalysisResult;
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", text);
      throw new Error("AI response was not in the expected format.");
    }
  } catch (apiError: any) {
    console.error("Gemini API Error:", apiError);
    if (apiError.message?.includes("429")) {
      throw new Error("System is busy. Please try again in a moment.");
    }
    throw apiError;
  }
}
