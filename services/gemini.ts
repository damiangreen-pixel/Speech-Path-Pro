
import { GoogleGenAI, Type } from "@google/genai";

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateLessonPlan = async (
  goal: string, 
  grade: string, 
  historySummary?: string, 
  adhocPrompt?: string,
  diagnoses?: string[],
  allGoals?: string[],
  style: string = 'Structured'
) => {
  const ai = getClient();
  
  let prompt = `You are a world-class Speech-Language Pathologist. Generate a high-fidelity, evidence-based lesson plan for a student in grade ${grade}.
  
  PRIMARY FOCUS GOAL: "${goal}"
  SESSION STYLE: "${style}"`;
  
  if (diagnoses && diagnoses.length > 0) {
    prompt += `\n\nSTUDENT NEEDS & DIAGNOSES: ${diagnoses.join(', ')}. 
    INSTRUCTION: Tailor activity scaffolding, sensory considerations, and material complexity specifically for these needs.`;
  }

  if (allGoals && allGoals.length > 1) {
    const secondary = allGoals.filter(g => g !== goal);
    prompt += `\n\nSECONDARY IEP GOALS: ${secondary.join('; ')}. 
    INSTRUCTION: Look for naturalistic opportunities to cross-target these objectives within the primary activity.`;
  }
  
  if (historySummary) {
    prompt += `\n\nLATEST PROGRESS SUMMARY: ${historySummary}. 
    INSTRUCTION: Adjust the level of support (prompting hierarchy) based on this recent data.`;
  }
  
  if (adhocPrompt) {
    prompt += `\n\nUSER MODIFICATION: "${adhocPrompt}". 
    INSTRUCTION: Ensure this specific theme or requirement is fully integrated.`;
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

export const generateStimuli = async (goal: string, grade: string, studentInterests?: string) => {
  const ai = getClient();
  const prompt = `Generate speech therapy stimuli for a ${grade} student. 
  Targeting: "${goal}". 
  Student Interests: ${studentInterests || "Generic"}.
  Provide:
  1. A list of 15 age-appropriate target words.
  2. 5 functional sentences using those targets.
  3. A very short (4-6 sentence) "Mini-Story" that weaves in the target sounds/skills.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          words: { type: Type.ARRAY, items: { type: Type.STRING } },
          sentences: { type: Type.ARRAY, items: { type: Type.STRING } },
          story: { type: Type.STRING }
        },
        required: ["words", "sentences", "story"]
      }
    }
  });
  return JSON.parse(response.text || '{}');
};

export const helpWithSoapNote = async (observations: string) => {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a professional Speech-Language Pathologist. Based on these session observations: "${observations}", draft a structured professional SOAP note. Even if the input is short, provide a thoughtful interpretation.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subjective: { type: Type.STRING, description: "Student's participation, behavior, and self-report" },
          objective: { type: Type.STRING, description: "Specific measurable performance data and trial outcomes" },
          assessment: { type: Type.STRING, description: "Professional analysis and interpretation of progress" },
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
      subjective: "Student participated in session activity.",
      objective: observations,
      assessment: "Student demonstrated effort with specific targets.",
      plan: "Continue monitoring progress in next session."
    };
  }
};

export const analyzeCuingHierarchy = async (studentName: string, goal: string, transcript: string[], metrics: any) => {
  const ai = getClient();
  const transcriptText = transcript.join('\n');
  const prompt = `Analyze the effectiveness of the support hierarchy used for ${studentName} during a session targeting: "${goal}".
  
  Trial Data: Correct: ${metrics.correctTally}, Incorrect: ${metrics.incorrectTally}, Primary Support Level used: ${metrics.cuingLevel}.
  Session Transcript/Observations:
  ${transcriptText}

  Provide a professional assessment of how the student responded to different types of support. 
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
          assessment: { type: Type.STRING, description: "A detailed professional analysis of support effectiveness" },
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
    contents: `Analyze the progress for student ${studentName} on their primary goal: "${primaryGoal}". 
    Historical Accuracy Data:
    ${historyData}
    
    Predict when this student will likely reach a consistent 80% accuracy (mastery). Consider the trend.
    Return a professional projection.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          predictedDate: { type: Type.STRING, description: "Estimated completion date (e.g. Early March 2025)" },
          confidence: { type: Type.NUMBER, description: "Confidence level 0-100" },
          rationale: { type: Type.STRING, description: "Professional reasoning for the prediction" }
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
