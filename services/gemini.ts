
import { GoogleGenAI, Type } from "@google/genai";

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateLessonPlan = async (
  goal: string, 
  grade: string, 
  historySummary?: string, 
  adhocPrompt?: string,
  diagnoses?: string[],
  allGoals?: string[]
) => {
  const ai = getClient();
  
  // Stronger clinical framing for the model
  let prompt = `You are an expert Speech-Language Pathologist. Generate a high-fidelity, evidence-based lesson plan for a student in grade ${grade}.
  
  PRIMARY FOCUS GOAL: "${goal}"`;
  
  if (diagnoses && diagnoses.length > 0) {
    prompt += `\n\nCLINICAL ISSUES & DIAGNOSES: ${diagnoses.join(', ')}. 
    CRITICAL INSTRUCTION: Tailor the activity scaffolding and materials to address the specific clinical deficits, sensory needs, or processing styles associated with these diagnoses. The plan must be clinically appropriate for these conditions.`;
  }

  if (allGoals && allGoals.length > 1) {
    const secondaryGoals = allGoals.filter(g => g !== goal);
    prompt += `\n\nSECONDARY CLINICAL OBJECTIVES: ${secondaryGoals.join('; ')}. 
    Try to incorporate natural opportunities to work on these secondary skills without overwhelming the student.`;
  }
  
  if (historySummary) {
    prompt += `\n\nLATEST PERFORMANCE CONTEXT: ${historySummary}. 
    Adjust the level of support (scaffolding) based on this recent performance data.`;
  }
  
  if (adhocPrompt) {
    prompt += `\n\nCUSTOM USER REQUIREMENTS: "${adhocPrompt}". 
    Ensure this theme or specific modification is fully integrated into the procedure.`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          materials: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          procedure: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "materials", "procedure"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const helpWithSoapNote = async (observations: string) => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a professional Speech-Language Pathologist. Based on these session observations: "${observations}", draft a structured clinical SOAP note. Even if the input is short, provide a professional interpretation.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subjective: { type: Type.STRING, description: "Student's participation, behavior, and self-report" },
          objective: { type: Type.STRING, description: "Specific measurable performance data and trial outcomes" },
          assessment: { type: Type.STRING, description: "Clinical analysis and interpretation of progress" },
          plan: { type: Type.STRING, description: "Immediate recommendations for the next session" }
        },
        required: ["subjective", "objective", "assessment", "plan"]
      }
    }
  });

  try {
    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    const result = JSON.parse(text);
    return {
      subjective: result.subjective || '',
      objective: result.objective || '',
      assessment: result.assessment || '',
      plan: result.plan || ''
    };
  } catch (e) {
    console.error("Failed to parse SOAP note JSON:", e);
    return {
      subjective: "Student participated in reading activity.",
      objective: observations,
      assessment: "Patient demonstrated effort with specific targets.",
      plan: "Continue monitoring progress in next session."
    };
  }
};

export const analyzeCuingHierarchy = async (studentName: string, goal: string, transcript: string[], metrics: any) => {
  const ai = getClient();
  const transcriptText = transcript.join('\n');
  const prompt = `Analyze the effectiveness of the cuing hierarchy used for ${studentName} during a session targeting: "${goal}".
  
  Trial Data: Correct: ${metrics.correctTally}, Incorrect: ${metrics.incorrectTally}, Primary Cuing Level used: ${metrics.cuingLevel}.
  Session Transcript/Observations:
  ${transcriptText}

  Provide a professional clinical assessment of how the student responded to different types of support. 
  Identify if the cues were too frequent, appropriate, or if they should be faded.
  Include 3 specific recommendations for future sessions.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          assessment: { type: Type.STRING, description: "A detailed clinical analysis of cuing effectiveness" },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3 specific recommendations for future scaffolding"
          }
        },
        required: ["assessment", "recommendations"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const predictMilestone = async (studentName: string, primaryGoal: string, history: any[]) => {
  const ai = getClient();
  const historyData = history.map(h => `${h.date}: ${h.metrics?.accuracy}%`).join('\n');
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze the clinical progress for student ${studentName} on their primary goal: "${primaryGoal}". 
    Historical Accuracy Data:
    ${historyData}
    
    Predict when this student will likely reach a consistent 80% accuracy (mastery). Consider the trend.
    Return a professional clinical projection.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          predictedDate: { type: Type.STRING, description: "Estimated completion date (e.g. Early March 2025)" },
          confidence: { type: Type.NUMBER, description: "Confidence level 0-100" },
          rationale: { type: Type.STRING, description: "Clinical reasoning for the prediction" }
        },
        required: ["predictedDate", "confidence", "rationale"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const generateParentLetter = async (studentName: string, soapNote: any) => {
  const ai = getClient();
  const prompt = `You are a friendly SLP. Write an encouraging note to the parents of ${studentName} based on today's session. 
  Keep it simple, positive, and professional. Include 2-3 short 'Home Practice' bullet points.
  Session Details: 
  S: ${soapNote.subjective || 'Participated well'} 
  O: ${soapNote.objective || 'Worked on target goals'} 
  A: ${soapNote.assessment || 'Shows progress'} 
  P: ${soapNote.plan || 'Continue practice'}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "Could not generate letter at this time. Please try again with more session data.";
};
