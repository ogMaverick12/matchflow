import { findShortestPath, MERCEDES_BENZ_NODES } from '@matchflow/concourse-graph';
import { AskConciergeRequest, AskConciergeResponse } from '@matchflow/types';
import { z } from 'zod';

// Extract data part from AskConciergeResponse
export type ConciergeResponseData = NonNullable<AskConciergeResponse['data']>;

// 1. Zod Incident Summary Validation Schema
export const IncidentSummarySchema = z.object({
  summary: z.string().max(80),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  confidence: z.number().min(0).max(1.0)
});

// 2. Roster and Dispatch Ranking Types & Logic
export interface RosterItem {
  staffId: string;
  name: string;
  role: 'volunteer' | 'staff' | 'organizer';
  zone: string;
  status: string;
}

export function rankDispatches(
  incidentId: string,
  incidentZoneId: string,
  roster: RosterItem[]
) {
  return roster.map(staff => {
    let rank = 10;
    let reason = 'Available fallback staff';

    if (staff.zone === incidentZoneId) {
      rank += 40;
      reason = `Staff located in same zone (${staff.zone})`;
    } else {
      reason = `Located in ${staff.zone.replace('_', ' ')}, dispatch transit required`;
    }

    if (staff.role === 'staff') {
      rank += 10;
    }

    return {
      incidentId,
      staffId: staff.staffId,
      staffName: staff.name,
      role: staff.role,
      rank,
      reason
    };
  }).sort((a, b) => b.rank - a.rank);
}

// Map query keywords to nodes for a basic grounded routing mock
function searchNodeByKeyword(query: string): string | null {
  const q = query.toLowerCase();
  if (q.includes('burgers') || q.includes('burger')) return 'concession_burgers';
  if (q.includes('taco') || q.includes('tacos')) return 'concession_tacos';
  if (q.includes('pizza')) return 'concession_pizza';
  if (q.includes('drink') || q.includes('drinks') || q.includes('sips')) return 'concession_drinks';
  if (q.includes('beer') || q.includes('beers')) return 'concession_beers';
  
  if (q.includes('restroom') || q.includes('baño') || q.includes('toilet') || q.includes('toilets')) {
    if (q.includes('201') || q.includes('level 2') || q.includes('upper')) return 'restroom_201';
    if (q.includes('101')) return 'restroom_101';
    if (q.includes('102')) return 'restroom_102';
    if (q.includes('103')) return 'restroom_103';
    if (q.includes('104')) return 'restroom_104';
    return 'restroom_101';
  }

  if (q.includes('gate 1') || q.includes('puerta 1')) return 'gate_1';
  if (q.includes('gate 2') || q.includes('puerta 2')) return 'gate_2';
  if (q.includes('gate 3') || q.includes('puerta 3')) return 'gate_3';
  if (q.includes('gate 4') || q.includes('puerta 4')) return 'gate_4';

  if (q.includes('section 101') || q.includes('seccion 101')) return 'seating_101';
  if (q.includes('section 110')) return 'seating_110';
  if (q.includes('section 120')) return 'seating_120';
  if (q.includes('section 130')) return 'seating_130';
  if (q.includes('section 201')) return 'seating_201';

  return null;
}

export async function askFlowEngine(
  req: AskConciergeRequest,
  zoneCongestion?: Record<string, number>
): Promise<ConciergeResponseData> {
  const query = req.query;
  const lang = req.language || 'en';
  
  // Basic language detection mock
  let detectedLanguage = lang;
  if (query.toLowerCase().includes('donde') || query.toLowerCase().includes('baño') || query.toLowerCase().includes('puerta')) {
    detectedLanguage = 'es';
  } else if (query.toLowerCase().includes('où') || query.toLowerCase().includes('toilette') || query.toLowerCase().includes('porte')) {
    detectedLanguage = 'fr';
  } else if (query.toLowerCase().includes('onde') || query.toLowerCase().includes('casa de banho')) {
    detectedLanguage = 'pt';
  } else if (query.toLowerCase().includes('أين') || query.toLowerCase().includes('حمام') || query.toLowerCase().includes('بوابة')) {
    detectedLanguage = 'ar';
  }

  // Find target node based on keyword
  const targetId = searchNodeByKeyword(query);
  const startId = req.accessibilityMode.mobilityRouting ? 'elevator_north' : 'gate_1'; // default start for mock

  if (targetId) {
    const routeResult = findShortestPath(startId, targetId, {
      mobilityAccessible: req.accessibilityMode.mobilityRouting,
      zoneCongestion
    });

    // §9: Handle typed failure — NEVER silently fall back to non-accessible route
    if (routeResult.error === 'NO_ACCESSIBLE_PATH') {
      let noPathText = 'No accessible path currently available for this route. All connecting paths use stairs or escalators. Please speak to a stadium staff member for assisted navigation.';
      if (detectedLanguage === 'es') {
        noPathText = 'No hay ruta accesible disponible actualmente para este trayecto. Todos los caminos de conexión tienen escaleras o escaleras mecánicas. Por favor, consulte a un miembro del personal del estadio.';
      } else if (detectedLanguage === 'fr') {
        noPathText = "Aucun chemin accessible n'est disponible pour ce trajet. Toutes les connexions comportent des escaliers ou des escalators. Veuillez vous adresser à un membre du personnel du stade.";
      } else if (detectedLanguage === 'pt') {
        noPathText = 'Não há caminho acessível disponível para este percurso. Todos os caminhos de ligação têm escadas ou escadas rolantes. Por favor, consulte um membro do pessoal do estádio.';
      } else if (detectedLanguage === 'ar') {
        noPathText = 'لا يوجد مسار متاح حاليًا لهذا الطريق. جميع المسارات تحتوي على سلالم أو سلالم متحركة. يرجى التحدث إلى أحد موظفي الملعب للحصول على مساعدة في التنقل.';
      }
      return { answerText: noPathText, detectedLanguage };
    }

    if (!routeResult.error) {
      const nodeDetails = routeResult.path.map(id => {
        const node = MERCEDES_BENZ_NODES.find(n => n.id === id)!;
        return {
          id: node.id,
          name: node.name,
          type: node.type,
          zone: node.zone,
          level: node.level
        };
      });

      let answerText = `I found a route to the nearest ${MERCEDES_BENZ_NODES.find(n => n.id === targetId)?.name || 'destination'}.`;
      if (detectedLanguage === 'es') {
        answerText = `He encontrado una ruta al ${MERCEDES_BENZ_NODES.find(n => n.id === targetId)?.name || 'destino'} más cercano.`;
      } else if (detectedLanguage === 'fr') {
        answerText = `J'ai trouvé un itinéraire vers le ${MERCEDES_BENZ_NODES.find(n => n.id === targetId)?.name || 'destination'} le plus proche.`;
      } else if (detectedLanguage === 'pt') {
        answerText = `Encontrei uma rota para o ${MERCEDES_BENZ_NODES.find(n => n.id === targetId)?.name || 'destino'} mais próximo.`;
      } else if (detectedLanguage === 'ar') {
        answerText = `لقد وجدت طريقًا إلى أقرب ${MERCEDES_BENZ_NODES.find(n => n.id === targetId)?.name || 'وجهة'}.`;
      }

      if (req.accessibilityMode.simplifiedLanguage) {
        if (detectedLanguage === 'es') {
          answerText = `Siga la ruta. Tiempo: ${Math.round(routeResult.totalTimeSeconds / 60)} min. Accesible: ${req.accessibilityMode.mobilityRouting ? 'Sí' : 'No'}.`;
        } else {
          answerText = `Follow the path. Time: ${Math.round(routeResult.totalTimeSeconds / 60)} mins. Accessible: ${req.accessibilityMode.mobilityRouting ? 'Yes' : 'No'}.`;
        }
      }

      return {
        answerText,
        detectedLanguage,
        route: {
          path: routeResult.path,
          totalTimeSeconds: routeResult.totalTimeSeconds,
          nodeDetails
        }
      };
    }
  }

  // Refusal or generic response
  let answerText = "I'm sorry, I can only help you navigate the stadium concourse, restrooms, concessions, and gates. Could you rephrase your question?";
  if (detectedLanguage === 'es') {
    answerText = "Lo siento, solo puedo ayudarle a navegar por el pasillo del estadio, los baños, las concesiones y las puertas. ¿Podría reformular su pregunta?";
  } else if (detectedLanguage === 'fr') {
    answerText = "Désolé, je ne peux vous aider qu'à naviguer dans les coursives du stade, les toilettes, les concessions et les portes. Pouvez-vous reformuler ?";
  } else if (detectedLanguage === 'pt') {
    answerText = "Desculpe, só posso ajudar a navegar pelos corredores do estádio, banheiros, concessões e portões. Pode reformular a pergunta?";
  } else if (detectedLanguage === 'ar') {
    answerText = "معذرة، يمكنني فقط مساعدتك في التنقل في ردهات الاستاد، ودورات المياه، والمطاعم، والبوابات. هل يمكنك إعادة صياغة سؤالك؟";
  }

  if (req.accessibilityMode.simplifiedLanguage) {
    if (detectedLanguage === 'es') {
      answerText = "Solo puedo guiarle dentro del estadio. Pregunte sobre baños, comida o puertas.";
    } else {
      answerText = "I can only help inside the stadium. Ask about toilets, food, or gates.";
    }
  }

  return {
    answerText,
    detectedLanguage
  };
}

// ---------------------------------------------------------------------------
// rankEgressOptions — §4B §7
// Client-callable egress ranker. Executes the same deterministic ranking logic
// as the Cloud Function's fallback, so it works in the browser without a round
// trip when the Cloud Function isn't available (e.g. local dev, emulator-less).
// In production, swap the body to call the deployed rankEgressOptions function.
// ---------------------------------------------------------------------------
export interface EgressOption {
  id: string;
  name: string;
  gate: string;
  type: 'transit' | 'rideshare' | 'walk';
  estimatedMinutes: number;
  currentQueueScore: number;
  sustainabilityScore: number;
}

export interface RankEgressRequest {
  sessionId: string;
  userId: string;
  role: string;
  zoneScores: Record<string, number>;
  options: EgressOption[];
}

export interface RankEgressResult {
  success: boolean;
  data?: {
    rankedOptions: Array<{ id: string; rank: number; rationale: string; recommended: boolean }>;
    summary: string;
  };
  error?: { code: string; message: string };
}

export async function rankEgressOptions(req: RankEgressRequest): Promise<RankEgressResult> {
  const { options, zoneScores } = req;

  // Deterministic ranking: weighted score (speed 50%, sustainability 30%, wait 20%)
  // This mirrors the Cloud Function's fallback exactly.
  // When the deployed function is available, replace with a fetch/httpsCallable call.
  const scored = options.map(o => {
    // Penalise options routing through high-density zones
    const zonePenalty = Object.entries(zoneScores).reduce((penalty, [, density]) => {
      return density > 0.75 ? penalty + 0.1 : penalty;
    }, 0);
    const speed       = (1 - o.currentQueueScore) * 0.5;
    const green       = o.sustainabilityScore * 0.3;
    const etaScore    = Math.max(0, (1 - o.estimatedMinutes / 60)) * 0.2;
    return { ...o, score: speed + green + etaScore - zonePenalty };
  }).sort((a, b) => b.score - a.score);

  const rankedOptions = scored.map((o, i) => ({
    id: o.id,
    rank: i + 1,
    rationale: i === 0
      ? `Best overall: fastest queue (${Math.round(o.currentQueueScore * 100)}% full) and greenest option (${Math.round(o.sustainabilityScore * 100)}% sustainability score).`
      : i === 1
      ? `Alternative: ${o.estimatedMinutes} min travel time, ${Math.round(o.currentQueueScore * 100)}% queue load.`
      : `Slowest option — consider only if others are unavailable.`,
    recommended: i === 0,
  }));

  const best = scored[0];
  const summary = `${best.name} via ${best.gate} is the fastest, greenest exit right now (est. ${best.estimatedMinutes} min, ${Math.round(best.sustainabilityScore * 100)}% green score).`;

  return { success: true, data: { rankedOptions, summary } };
}

