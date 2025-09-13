"use client";

import { ArrowLeft, Sparkles, MessageSquarePlus, Users, FileText } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CommentableTranscript } from "@/components/comments/commentable-transcript";

const DEMO_TRANSCRIPT = `Sarah Chen: Good morning everyone. Let's kick off our Q4 product roadmap discussion. We have some exciting features to prioritize, and I want to make sure we're all aligned on our strategic direction for the remainder of the year.

Michael Rodriguez: Thanks Sarah. I've been analyzing our user feedback from the last quarter, and there are three main themes emerging: enhanced collaboration features, mobile app improvements, and better integration with third-party tools. We should definitely factor these into our planning.

Emily Watson: That aligns well with what we're seeing from the sales team perspective. Enterprise clients are particularly interested in the collaboration features. They're asking about real-time editing, better permission management, and audit trails. These could be significant differentiators for us in the enterprise segment.

David Kim: From a technical standpoint, we need to consider our infrastructure capacity. The real-time features Emily mentioned would require significant backend work. We'd need to implement WebSocket connections and possibly redesign our data synchronization architecture. I estimate this would take at least 6-8 weeks with our current team.

Sarah Chen: That's a valid concern, David. What if we took a phased approach? We could start with basic collaborative features and gradually add more sophisticated capabilities based on user feedback and technical constraints.

Michael Rodriguez: I like that idea. We could begin with commenting and annotation features, which are less technically complex but still provide immediate value. Our user research shows that 73% of teams want better ways to provide feedback within the platform.

Emily Watson: The competitive landscape is also worth considering. Our main competitors have already launched similar features. We risk falling behind if we don't move quickly. However, we have an opportunity to learn from their mistakes and deliver something more polished.

David Kim: If we're going with the phased approach, I suggest we prioritize the mobile app improvements for this quarter. The technical debt there is more manageable, and we could deliver meaningful improvements within 4-5 weeks. This would free up resources for the collaboration features in Q1 next year.

Sarah Chen: That's a pragmatic suggestion. Emily, how would this timeline impact our enterprise sales pipeline?

Emily Watson: We have two major deals closing in November that are contingent on mobile improvements, so David's timeline would work well. For the collaboration features, I can position them as our Q1 deliverables, which should keep our enterprise prospects engaged.

Michael Rodriguez: I want to make sure we're not overlooking the third-party integrations. Our data shows that users who integrate with other tools have 40% higher retention rates. Even small improvements here could have significant impact on our metrics.

Sarah Chen: Excellent point. Let's allocate some resources to quick wins in the integration space. David, what would be the easiest integrations to implement?

David Kim: Slack and Microsoft Teams webhooks would be relatively straightforward - maybe 2 weeks of work. We already have most of the infrastructure in place from our notification system. These would also complement the collaboration features nicely.

Emily Watson: That's perfect. Slack integration is our most requested feature from mid-market customers. This could help us close several deals that are currently on hold.

Sarah Chen: Alright, let's summarize our Q4 priorities: First, mobile app improvements within 5 weeks. Second, basic integrations with Slack and Teams within 2 weeks. Third, groundwork for Q1 collaboration features. Michael, can you create detailed user stories for these initiatives?

Michael Rodriguez: Absolutely. I'll have those ready by end of day tomorrow. I'll also include success metrics so we can track the impact of each feature. We should aim for at least a 15% improvement in user engagement with these changes.

David Kim: I'll start the technical design documents and identify any potential risks or dependencies. We should also consider bringing in a contractor to help with the mobile work to stay on schedule.

Emily Watson: I'll prepare communication for our sales team and key accounts about the roadmap. This will help manage expectations and maintain momentum in our pipeline.

Sarah Chen: Perfect. Let's reconvene next week to review the detailed plans. Thank you all for the productive discussion. I'm confident we have a solid strategy for Q4 that balances user needs, technical feasibility, and business impact.`;

export default function DemoPage() {
  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="space-y-6 animate-fade-in">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center text-white/60 hover:text-white/90 transition-colors group mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to dashboard
          </Link>
          <h1 className="text-4xl font-bold font-display text-white">
            Interactive <span className="gradient-text">Demo</span>
          </h1>
          <p className="text-white/60 mt-2">
            Experience the power of AI-powered meeting intelligence
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquarePlus className="w-5 h-5 text-purple-400" />
                Smart Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/60 text-sm">
                Hover over any paragraph below and click the comment icon to add contextual notes and collaborate with your team.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Speaker Detection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/60 text-sm">
                AI automatically identifies and labels different speakers in your meeting transcript.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-400" />
                Rich Formatting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/60 text-sm">
                Clean, readable transcripts with proper formatting and paragraph breaks for easy scanning.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Product Roadmap Meeting - Q4 Planning
            </CardTitle>
            <CardDescription>
              October 15, 2024 • 4 participants • 23 minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-lg border border-white/10">
              <p className="text-sm text-white/80">
                <strong>Try it out:</strong> Hover over any paragraph and click the comment button to add your thoughts. 
                Comments are stored locally in this demo.
              </p>
            </div>
            
            <CommentableTranscript
              transcript={DEMO_TRANSCRIPT}
              meetingId="demo"
              isDemo={true}
              enabled={true}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}