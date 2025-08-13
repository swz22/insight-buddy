export interface ProcessedTranscript {
  segments: TranscriptSegment[];
  speakers: Speaker[];
  decisions: Decision[];
}

interface TranscriptSegment {
  text: string;
  speaker: string;
  timestamp: string;
  topic?: string;
}

interface Speaker {
  id: string;
  name: string;
  mentions: number;
}

interface Decision {
  description: string;
  owner?: string;
  context: string;
}

interface ExtractedInfo {
  decisions: string[];
  problems: string[];
  metrics: string[];
  nextSteps: string[];
}

const CACHE_KEY_PREFIX = "hf_cache_";
const API_CALL_LIMIT = 30000;
const CALLS_PER_MEETING = 5;

export class HuggingFacePipeline {
  private apiKey: string;
  private apiCallCount: number = 0;
  private cache: Map<string, any> = new Map();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.loadApiCallCount();
  }

  private loadApiCallCount() {
    const stored = localStorage.getItem("hf_api_count");
    const data = stored ? JSON.parse(stored) : { count: 0, month: new Date().getMonth() };

    if (data.month !== new Date().getMonth()) {
      this.apiCallCount = 0;
      this.saveApiCallCount();
    } else {
      this.apiCallCount = data.count;
    }
  }

  private saveApiCallCount() {
    localStorage.setItem(
      "hf_api_count",
      JSON.stringify({
        count: this.apiCallCount,
        month: new Date().getMonth(),
      })
    );
  }

  private async checkApiLimit(): Promise<boolean> {
    return this.apiCallCount < API_CALL_LIMIT - CALLS_PER_MEETING;
  }

  private getCacheKey(text: string, operation: string): string {
    const hash = text.substring(0, 50) + text.length;
    return `${CACHE_KEY_PREFIX}${operation}_${hash}`;
  }

  async processTranscript(transcript: string): Promise<ProcessedTranscript> {
    const segments = this.parseTranscript(transcript);
    const speakers = this.extractSpeakers(segments);

    const decisions = await this.extractDecisions(segments);

    return {
      segments,
      speakers,
      decisions,
    };
  }

  private parseTranscript(transcript: string): TranscriptSegment[] {
    const lines = transcript.split("\n");
    const segments: TranscriptSegment[] = [];
    const speakerPattern = /\[(\d{2}:\d{2})\]\s*Speaker\s*([A-Z]):\s*(.*)/;

    let currentSegment: TranscriptSegment | null = null;

    for (const line of lines) {
      const match = line.match(speakerPattern);
      if (match) {
        if (currentSegment) {
          segments.push(currentSegment);
        }
        currentSegment = {
          timestamp: match[1],
          speaker: match[2],
          text: match[3],
        };
      } else if (currentSegment && line.trim()) {
        currentSegment.text += " " + line.trim();
      }
    }

    if (currentSegment) {
      segments.push(currentSegment);
    }

    return segments;
  }

  private extractSpeakers(segments: TranscriptSegment[]): Speaker[] {
    const speakerMap = new Map<string, Speaker>();

    segments.forEach((segment) => {
      const existing = speakerMap.get(segment.speaker) || {
        id: segment.speaker,
        name: this.identifySpeakerName(segment.text, segment.speaker),
        mentions: 0,
      };
      existing.mentions++;
      speakerMap.set(segment.speaker, existing);
    });

    return Array.from(speakerMap.values());
  }

  private identifySpeakerName(text: string, speakerId: string): string {
    const introPattern = /(?:this is|i'm|i am|my name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
    const match = text.match(introPattern);

    if (match) {
      return match[1];
    }

    return `Speaker ${speakerId}`;
  }

  async extractDecisions(segments: TranscriptSegment[]): Promise<Decision[]> {
    const decisions: Decision[] = [];
    const decisionPhrases = [
      "propose",
      "proposal",
      "we'll try",
      "let's do",
      "we should",
      "agreed",
      "decision",
      "we will",
      "going to",
      "plan to",
      "need to",
    ];

    for (const segment of segments) {
      const hasDecisionPhrase = decisionPhrases.some((phrase) => segment.text.toLowerCase().includes(phrase));

      if (hasDecisionPhrase) {
        const context = this.getContextForSegment(segments, segment);
        decisions.push({
          description: segment.text,
          owner: segment.speaker,
          context,
        });
      }
    }

    return decisions;
  }

  private getContextForSegment(segments: TranscriptSegment[], target: TranscriptSegment): string {
    const index = segments.indexOf(target);
    const start = Math.max(0, index - 2);
    const end = Math.min(segments.length, index + 3);

    return segments
      .slice(start, end)
      .map((s) => `${s.speaker}: ${s.text}`)
      .join(" ");
  }

  async generateStructuredSummary(transcript: string, processedData: ProcessedTranscript): Promise<any> {
    if (!(await this.checkApiLimit())) {
      return this.generateLocalSummary(processedData);
    }

    const cacheKey = this.getCacheKey(transcript, "summary");
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const extractedInfo = await this.extractKeyInformation(processedData);

      const summaryPrompt = this.buildSummaryPrompt(extractedInfo, processedData);

      const response = await fetch("https://api-inference.huggingface.co/models/google/flan-t5-base", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: summaryPrompt,
          parameters: {
            max_new_tokens: 512,
            temperature: 0.3,
            do_sample: false,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HF API error: ${response.status}`);
      }

      const result = await response.json();
      const generatedText = result[0]?.generated_text || result.generated_text || "";

      this.apiCallCount++;
      this.saveApiCallCount();

      const structured = this.structureSummary(generatedText, extractedInfo);
      this.cache.set(cacheKey, structured);

      return structured;
    } catch (error) {
      console.error("API call failed, falling back to local:", error);
      return this.generateLocalSummary(processedData);
    }
  }

  private async extractKeyInformation(data: ProcessedTranscript): Promise<ExtractedInfo> {
    const decisions: string[] = [];
    const problems: string[] = [];
    const metrics: string[] = [];
    const nextSteps: string[] = [];

    const problemKeywords = ["problem", "issue", "concern", "challenge", "difficult"];
    const metricKeywords = ["rate", "percentage", "number", "count", "metric", "kpi", "slo"];
    const nextStepKeywords = ["will", "going to", "need to", "should", "next", "action"];

    data.segments.forEach((segment) => {
      const text = segment.text.toLowerCase();

      if (problemKeywords.some((kw) => text.includes(kw))) {
        problems.push(segment.text);
      }

      if (metricKeywords.some((kw) => text.includes(kw))) {
        metrics.push(segment.text);
      }

      if (nextStepKeywords.some((kw) => text.includes(kw)) && text.length < 200) {
        nextSteps.push(segment.text);
      }
    });

    data.decisions.forEach((d) => decisions.push(d.description));

    return { decisions, problems, metrics, nextSteps };
  }

  private buildSummaryPrompt(info: ExtractedInfo, data: ProcessedTranscript): string {
    const mainTopics = this.identifyMainTopics(data.segments);

    return `Summarize this meeting with the following key points:
Topics discussed: ${mainTopics.join(", ")}
Key decisions: ${info.decisions.slice(0, 3).join("; ")}
Problems identified: ${info.problems.slice(0, 3).join("; ")}
Metrics mentioned: ${info.metrics.slice(0, 3).join("; ")}

Create a brief overview and list the main points.`;
  }

  private identifyMainTopics(segments: TranscriptSegment[]): string[] {
    const topics = new Set<string>();
    const topicKeywords = {
      "mr rate": "MR Rate metrics",
      bug: "Bug tracking",
      slo: "SLO compliance",
      security: "Security concerns",
      infrastructure: "Infrastructure issues",
      community: "Community contributions",
      department: "Department structure",
    };

    segments.forEach((segment) => {
      const text = segment.text.toLowerCase();
      Object.entries(topicKeywords).forEach(([keyword, topic]) => {
        if (text.includes(keyword)) {
          topics.add(topic);
        }
      });
    });

    return Array.from(topics);
  }

  private structureSummary(generatedText: string, info: ExtractedInfo): any {
    const lines = generatedText.split(/[.!?]+/).filter((l) => l.trim());

    return {
      overview: lines[0] || "Meeting discussed various engineering metrics and organizational changes.",
      key_points: [
        ...info.decisions.slice(0, 3).map((d) => this.cleanText(d)),
        ...info.problems.slice(0, 2).map((p) => `Issue: ${this.cleanText(p)}`),
        ...info.metrics.slice(0, 2).map((m) => `Metric: ${this.cleanText(m)}`),
      ].filter((p) => p.length > 10),
      decisions: info.decisions.slice(0, 5).map((d) => this.cleanText(d)),
      next_steps: info.nextSteps.slice(0, 5).map((n) => this.cleanText(n)),
    };
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, " ")
      .replace(/^[\s,.-]+|[\s,.-]+$/g, "")
      .substring(0, 200);
  }

  async generateActionItems(transcript: string, processedData: ProcessedTranscript, summary: any): Promise<any[]> {
    if (!(await this.checkApiLimit())) {
      return this.generateLocalActionItems(processedData, summary);
    }

    const cacheKey = this.getCacheKey(transcript, "actions");
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const actionPrompt = this.buildActionItemPrompt(processedData, summary);

      const response = await fetch("https://api-inference.huggingface.co/models/google/flan-t5-small", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: actionPrompt,
          parameters: {
            max_new_tokens: 256,
            temperature: 0.2,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HF API error: ${response.status}`);
      }

      const result = await response.json();
      const generatedText = result[0]?.generated_text || result.generated_text || "";

      this.apiCallCount++;
      this.saveApiCallCount();

      const actions = this.parseActionItems(generatedText, processedData);
      this.cache.set(cacheKey, actions);

      return actions;
    } catch (error) {
      console.error("API call failed for actions:", error);
      return this.generateLocalActionItems(processedData, summary);
    }
  }

  private buildActionItemPrompt(data: ProcessedTranscript, summary: any): string {
    const relevantSegments = data.segments
      .filter((s) => s.text.toLowerCase().match(/will|going to|need to|should|action|todo/))
      .slice(0, 10)
      .map((s) => `${s.speaker}: ${s.text}`)
      .join("\n");

    return `Extract action items from these meeting excerpts. Format: [Owner] - [Task]
${relevantSegments}

List specific tasks with clear owners:`;
  }

  private parseActionItems(generatedText: string, data: ProcessedTranscript): any[] {
    const actions: any[] = [];
    const lines = generatedText.split("\n").filter((l) => l.trim());

    lines.forEach((line) => {
      const match = line.match(/(?:([A-Z][a-z]+|\w+)\s*[-:]?\s*)(.+)/);
      if (match) {
        const [_, owner, task] = match;
        actions.push({
          id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          task: this.cleanText(task),
          assignee: this.findSpeakerName(owner, data.speakers),
          due_date: this.extractDueDate(task),
          priority: this.determinePriority(task),
          completed: false,
        });
      }
    });

    return actions.length > 0 ? actions : this.generateLocalActionItems(data, {});
  }

  private findSpeakerName(reference: string, speakers: Speaker[]): string {
    const speaker = speakers.find((s) => s.name.toLowerCase().includes(reference.toLowerCase()) || s.id === reference);
    return speaker?.name || reference;
  }

  private extractDueDate(text: string): string | null {
    const patterns = [/by (\w+ \d+)/i, /before (\w+ \d+)/i, /until (\w+ \d+)/i, /next (\w+)/i];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return new Date().toISOString();
      }
    }

    return null;
  }

  private determinePriority(text: string): "low" | "medium" | "high" {
    const highPriorityWords = ["urgent", "asap", "immediately", "critical", "blocker"];
    const mediumPriorityWords = ["important", "needed", "required", "should"];

    const lower = text.toLowerCase();

    if (highPriorityWords.some((w) => lower.includes(w))) return "high";
    if (mediumPriorityWords.some((w) => lower.includes(w))) return "medium";

    return "low";
  }

  private generateLocalSummary(data: ProcessedTranscript): any {
    const topics = this.identifyMainTopics(data.segments);
    const decisions = data.decisions.slice(0, 5);

    return {
      overview: `Meeting discussed ${topics.slice(0, 3).join(", ")}. ${decisions.length} key decisions were made.`,
      key_points: [
        ...decisions.slice(0, 3).map((d) => d.description),
        `${data.speakers.length} participants in discussion`,
        `Meeting duration: ${this.estimateDuration(data.segments)}`,
      ],
      decisions: decisions.map((d) => d.description),
      next_steps: this.extractNextSteps(data.segments),
    };
  }

  private generateLocalActionItems(data: ProcessedTranscript, summary: any): any[] {
    const actions: any[] = [];
    const actionPhrases = [
      { pattern: /(\w+)\s+will\s+(.+)/i, type: "will" },
      { pattern: /(\w+)\s+to\s+(.+)/i, type: "to" },
      { pattern: /need\s+to\s+(.+)/i, type: "need" },
    ];

    data.segments.forEach((segment) => {
      actionPhrases.forEach(({ pattern }) => {
        const match = segment.text.match(pattern);
        if (match) {
          actions.push({
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            task: this.cleanText(match[2] || match[1]),
            assignee: data.speakers.find((s) => s.id === segment.speaker)?.name || segment.speaker,
            due_date: null,
            priority: "medium",
            completed: false,
          });
        }
      });
    });

    return actions.slice(0, 10);
  }

  private extractNextSteps(segments: TranscriptSegment[]): string[] {
    const nextSteps: string[] = [];
    const patterns = [/next\s+steps?/i, /going\s+forward/i, /action\s+items?/i];

    segments.forEach((segment) => {
      if (patterns.some((p) => segment.text.match(p))) {
        nextSteps.push(this.cleanText(segment.text));
      }
    });

    return nextSteps.slice(0, 5);
  }

  private estimateDuration(segments: TranscriptSegment[]): string {
    if (segments.length === 0) return "Unknown";

    const firstTime = segments[0].timestamp;
    const lastTime = segments[segments.length - 1].timestamp;

    const [firstMin] = firstTime.split(":").map(Number);
    const [lastMin] = lastTime.split(":").map(Number);

    return `~${lastMin - firstMin} minutes`;
  }
}
